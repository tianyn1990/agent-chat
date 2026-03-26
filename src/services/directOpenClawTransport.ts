import { isLoopbackHostname } from '@/config/chatRuntime';
import {
  OPENCLAW_CLIENT_INSTANCE_ID,
  OPENCLAW_GATEWAY_DEVICE_TOKEN,
  OPENCLAW_GATEWAY_PASSWORD,
  OPENCLAW_GATEWAY_ROLE,
  OPENCLAW_GATEWAY_SCOPES,
  OPENCLAW_GATEWAY_TOKEN,
  OPENCLAW_GATEWAY_URL,
} from '@/constants';
import {
  buildBrowserDeviceAuthPayloadV3,
  clearBrowserDeviceAuthToken,
  loadBrowserDeviceAuthToken,
  loadOrCreateBrowserDeviceIdentity,
  signBrowserDevicePayload,
  storeBrowserDeviceAuthToken,
} from '@/services/openclawBrowserDeviceAuth';
import type { OpenClawGatewayTransport } from '@/services/openclawTransport';
import type {
  OpenClawConnectChallengeFrame,
  OpenClawGatewayEvent,
  OpenClawGatewayEventType,
  OpenClawHelloOkFrame,
  OpenClawMethodParamsMap,
  OpenClawMethodResultMap,
  OpenClawRequestFrame,
  OpenClawResponseFrame,
} from '@/types/openclaw';
import { prefixedId } from '@/utils/id';

const DIRECT_PROTOCOL_VERSION = 3;
const CONNECT_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RECONNECT_ATTEMPTS = 3;
const DEVICE_SIGNATURE_RECOVERY_REASONS = ['device signature invalid', 'device signature expired'];

function hasRequiredScopes(
  candidateScopes: string[] | undefined,
  requiredScopes: string[],
): boolean {
  const candidateScopeSet = new Set(
    (candidateScopes ?? []).map((scope) => scope.trim()).filter(Boolean),
  );
  return requiredScopes.every((scope) => candidateScopeSet.has(scope));
}

interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Event | MessageEvent | CloseEvent) => void,
  ): void;
  removeEventListener(
    type: 'open' | 'message' | 'error' | 'close',
    listener: (event: Event | MessageEvent | CloseEvent) => void,
  ): void;
}

interface DirectOpenClawTransportOptions {
  gatewayUrl?: string;
  token?: string;
  password?: string;
  deviceToken?: string;
  role?: string;
  scopes?: string[];
  instanceId?: string;
  browserHostname?: string | null;
  webSocketFactory?: (url: string) => WebSocketLike;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

type TransportStatusHandler = (connected: boolean) => void;

/**
 * direct transport 诊断错误。
 *
 * 设计原因：
 * - 本地直连阶段最怕“配置不对但界面只表现成一直 loading”
 * - 显式错误码可以让页面层、测试和后续文档说明共用同一套诊断语义
 */
export class DirectOpenClawTransportError extends Error {
  constructor(
    public readonly code:
      | 'DIRECT_URL_MISSING'
      | 'DIRECT_HOST_REQUIRED'
      | 'DIRECT_GATEWAY_HOST_INVALID'
      | 'DIRECT_HANDSHAKE_TIMEOUT'
      | 'DIRECT_HANDSHAKE_FAILED'
      | 'DIRECT_REQUEST_TIMEOUT'
      | 'DIRECT_SOCKET_CLOSED',
    message: string,
  ) {
    super(message);
    this.name = 'DirectOpenClawTransportError';
  }
}

/**
 * 浏览器直连本地 OpenClaw Gateway 的最小 transport。
 *
 * 设计原因：
 * - 页面层不能直接理解握手和 `req / res / event`
 * - direct 模式的目标是验证真实协议，而不是把页面重新绑回原始 WebSocket 帧
 */
export class DirectOpenClawTransport implements OpenClawGatewayTransport {
  private readonly eventHandlers = new Map<
    OpenClawGatewayEventType,
    Set<(event: OpenClawGatewayEvent) => void>
  >();
  private readonly statusHandlers = new Set<TransportStatusHandler>();
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private socket: WebSocketLike | null = null;
  private connectPromise: Promise<void> | null = null;
  private connectResolver: (() => void) | null = null;
  private connectRejector: ((reason?: unknown) => void) | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manualDisconnect = false;
  private handshakeRequestId: string | null = null;
  private lastDeviceIdentityId: string | null = null;
  private deviceTokenRecoveryUsed = false;
  private _isConnected = false;

  constructor(private readonly options: DirectOpenClawTransportOptions = {}) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(): Promise<void> {
    if (this._isConnected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const gatewayUrl = this.resolveGatewayUrl();
    this.ensureBrowserOriginAllowed();
    this.ensureGatewayHostAllowed(gatewayUrl);

    this.manualDisconnect = false;
    this.deviceTokenRecoveryUsed = false;
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolver = resolve;
      this.connectRejector = reject;
    });

    this.openSocket(gatewayUrl);
    return this.connectPromise;
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.handshakeRequestId = null;
    this.lastDeviceIdentityId = null;
    this.deviceTokenRecoveryUsed = false;
    this.rejectPendingRequests(
      new DirectOpenClawTransportError('DIRECT_SOCKET_CLOSED', 'OpenClaw 直连连接已关闭'),
    );
    this.updateConnectionStatus(false);
    this.socket?.close(1000, 'manual disconnect');
    this.socket = null;
    this.resetConnectPromise();
  }

  async request<TMethod extends keyof OpenClawMethodParamsMap>(
    method: TMethod,
    params: OpenClawMethodParamsMap[TMethod],
  ): Promise<OpenClawMethodResultMap[TMethod]> {
    if (!this._isConnected) {
      await this.connect();
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== 1) {
      throw new DirectOpenClawTransportError(
        'DIRECT_SOCKET_CLOSED',
        'OpenClaw 直连连接不可用，请稍后重试',
      );
    }

    const id = prefixedId('oc_req');
    const frame: OpenClawRequestFrame<TMethod, OpenClawMethodParamsMap[TMethod]> = {
      type: 'req',
      id,
      method,
      params,
    };

    const responsePromise = new Promise<OpenClawMethodResultMap[TMethod]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new DirectOpenClawTransportError(
            'DIRECT_REQUEST_TIMEOUT',
            `OpenClaw 请求超时：${String(method)}`,
          ),
        );
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as OpenClawMethodResultMap[TMethod]),
        reject,
        timer,
      });
    });

    socket.send(JSON.stringify(frame));
    return responsePromise;
  }

  on<TEvent extends OpenClawGatewayEventType>(
    event: TEvent,
    handler: (eventFrame: Extract<OpenClawGatewayEvent, { event: TEvent }>) => void,
  ): () => void {
    const handlerSet = this.eventHandlers.get(event) ?? new Set();
    const wrappedHandler = handler as (eventFrame: OpenClawGatewayEvent) => void;
    handlerSet.add(wrappedHandler);
    this.eventHandlers.set(event, handlerSet);

    return () => {
      handlerSet.delete(wrappedHandler);
      if (handlerSet.size === 0) {
        this.eventHandlers.delete(event);
      }
    };
  }

  onStatus(handler: TransportStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private resolveGatewayUrl(): string {
    const gatewayUrl = (this.options.gatewayUrl ?? OPENCLAW_GATEWAY_URL).trim();
    if (!gatewayUrl) {
      throw new DirectOpenClawTransportError(
        'DIRECT_URL_MISSING',
        '未配置本地 OpenClaw Gateway 地址，请检查 VITE_OPENCLAW_GATEWAY_URL',
      );
    }

    return gatewayUrl;
  }

  private ensureBrowserOriginAllowed(): void {
    const hostname = this.options.browserHostname ?? globalThis.location?.hostname ?? null;
    if (!isLoopbackHostname(hostname)) {
      throw new DirectOpenClawTransportError(
        'DIRECT_HOST_REQUIRED',
        'openclaw-direct 仅支持 localhost / 127.0.0.1 页面 origin',
      );
    }
  }

  private ensureGatewayHostAllowed(gatewayUrl: string): void {
    const parsedUrl = new URL(gatewayUrl);
    if (!isLoopbackHostname(parsedUrl.hostname)) {
      throw new DirectOpenClawTransportError(
        'DIRECT_GATEWAY_HOST_INVALID',
        'openclaw-direct 当前只允许直连本地回环地址的 Gateway',
      );
    }
  }

  private openSocket(gatewayUrl: string): void {
    const socketFactory =
      this.options.webSocketFactory ??
      ((url: string) => new WebSocket(url) as unknown as WebSocketLike);

    this.socket = socketFactory(gatewayUrl);
    this.clearConnectTimeout();
    this.connectTimeout = setTimeout(() => {
      this.handleConnectFailure(
        new DirectOpenClawTransportError(
          'DIRECT_HANDSHAKE_TIMEOUT',
          '等待 OpenClaw 握手超时，请检查 Gateway 是否已启动',
        ),
      );
    }, CONNECT_TIMEOUT_MS);

    this.socket.addEventListener('message', this.handleSocketMessage);
    this.socket.addEventListener('close', this.handleSocketClose);
    this.socket.addEventListener('error', this.handleSocketError);
  }

  private readonly handleSocketMessage = (event: Event | MessageEvent): void => {
    const messageEvent = event as MessageEvent;
    if (typeof messageEvent.data !== 'string') {
      return;
    }

    let frame: unknown;
    try {
      frame = JSON.parse(messageEvent.data);
    } catch {
      return;
    }

    const connectChallengeNonce = this.extractConnectChallengeNonce(frame);
    if (connectChallengeNonce) {
      void this.sendConnectFrame(connectChallengeNonce).catch((error: unknown) => {
        this.handleConnectFailure(
          new DirectOpenClawTransportError(
            'DIRECT_HANDSHAKE_FAILED',
            error instanceof Error ? error.message : '生成 OpenClaw device identity 失败',
          ),
        );
      });
      return;
    }

    if (this.isHelloOkFrame(frame)) {
      this.completeHandshake();
      return;
    }

    if (this.isResponseFrame(frame)) {
      if (this.handleHandshakeResponse(frame)) {
        return;
      }

      this.handleResponseFrame(frame);
      return;
    }

    if (this.isGatewayEvent(frame)) {
      this.eventHandlers.get(frame.event)?.forEach((handler) => handler(frame));
    }
  };

  private readonly handleSocketClose = (event: Event | CloseEvent): void => {
    const closeEvent = event as CloseEvent;
    const closeReason = this.resolveSocketCloseReason(closeEvent);
    /**
     * 在真正切换连接态前先拍平一次“关闭前快照”。
     *
     * 设计原因：
     * - `updateConnectionStatus(false)` 会立即把 `_isConnected` 置为 false
     * - 若不先保存旧值，就无法区分“握手前失败”与“已连接后掉线”
     * - 这会直接影响是否执行普通重连，属于直连稳定性的关键分支
     */
    const wasConnected = this._isConnected;
    this.clearConnectTimeout();
    this.updateConnectionStatus(false);
    this.handshakeRequestId = null;

    /**
     * direct 握手阶段优先等待 close reason，而不是无脑走重连。
     *
     * 设计原因：
     * - 握手前失败通常是 auth / signature / nonce 类确定性错误
     * - 若这里直接进入普通重连，会把本应暴露给开发者的错误变成“反复闪断”
     * - 仅当 close reason 明确属于可恢复 token 漂移时，才执行一次受控恢复
     */
    if (!wasConnected && this.connectPromise) {
      if (this.tryRecoverFromDeviceSignatureFailure(closeReason)) {
        return;
      }

      const connectError = new DirectOpenClawTransportError(
        'DIRECT_HANDSHAKE_FAILED',
        closeReason || 'OpenClaw 握手失败，连接在建立前被关闭',
      );
      this.connectRejector?.(connectError);
      this.resetConnectPromise();
      this.rejectPendingRequests(connectError);
      this.socket = null;
      this.lastDeviceIdentityId = null;
      return;
    }

    const connectError = new DirectOpenClawTransportError(
      'DIRECT_SOCKET_CLOSED',
      closeReason || 'OpenClaw 连接已关闭',
    );
    this.connectRejector?.(connectError);
    this.resetConnectPromise();
    this.rejectPendingRequests(connectError);
    this.socket = null;
    this.lastDeviceIdentityId = null;

    if (!this.manualDisconnect && wasConnected) {
      this.scheduleReconnect();
    }
  };

  private readonly handleSocketError = (): void => {
    /**
     * 浏览器 `error` 事件本身不提供足够的诊断信息。
     *
     * 设计原因：
     * - 握手失败时真正有价值的错误通常出现在后续 close reason
     * - 如果这里过早 reject，会吞掉 `device signature invalid` 等关键线索
     * - 已连接后的异常则继续交给 close 事件与 request timeout 统一收敛
     */
  };

  private async sendConnectFrame(nonce: string): Promise<void> {
    const authToken = this.options.token ?? OPENCLAW_GATEWAY_TOKEN;
    const authPassword = this.options.password ?? OPENCLAW_GATEWAY_PASSWORD;
    const role = (this.options.role ?? OPENCLAW_GATEWAY_ROLE).trim() || 'operator';
    const scopes = this.options.scopes ?? OPENCLAW_GATEWAY_SCOPES;
    const deviceIdentity = await loadOrCreateBrowserDeviceIdentity();
    const storedDeviceToken = loadBrowserDeviceAuthToken({
      deviceId: deviceIdentity.deviceId,
      role,
    });
    /**
     * 当缓存 token 的 scopes 不满足本次直连请求时，主动放弃旧 token。
     *
     * 设计原因：
     * - 浏览器会长期缓存 Gateway 下发的 device token
     * - 若用户后来把 scopes 从 read/write 升级到包含 admin，继续复用旧 token 会让握手长期停留在旧权限
     * - 这里按 scopes 覆盖关系做一次轻量判断，可在不清空整套 identity 的前提下平滑申请更高权限 token
     */
    const canReuseStoredDeviceToken = hasRequiredScopes(storedDeviceToken?.scopes, scopes);
    const authDeviceToken =
      (this.options.deviceToken ?? OPENCLAW_GATEWAY_DEVICE_TOKEN) ||
      (canReuseStoredDeviceToken ? storedDeviceToken?.token || '' : '');
    /**
     * device signature 必须覆盖本次真实提交给 Gateway 的 auth 语义。
     *
     * 设计原因：
     * - Gateway 校验 payload 时会按 `token -> deviceToken -> bootstrapToken` 推导签名 token
     * - 浏览器刷新后若开始使用缓存 device token，但签名仍按“无 token”生成，就会出现
     *   `device signature invalid`
     */
    const signatureToken = authToken || authDeviceToken || undefined;
    const signedAtMs = Date.now();
    const platform = globalThis.navigator?.platform || 'web';
    const deviceFamily = 'browser';
    const signature = await signBrowserDevicePayload(
      deviceIdentity.privateKeyPkcs8Base64Url,
      buildBrowserDeviceAuthPayloadV3({
        deviceId: deviceIdentity.deviceId,
        clientId: 'webchat-ui',
        clientMode: 'webchat',
        role,
        scopes,
        signedAtMs,
        token: signatureToken ?? null,
        nonce,
        platform,
        deviceFamily,
      }),
    );

    const handshakeRequestId = prefixedId('oc_connect');
    const frame: OpenClawRequestFrame<'connect', OpenClawMethodParamsMap['connect']> = {
      type: 'req',
      id: handshakeRequestId,
      method: 'connect',
      params: {
        minProtocol: DIRECT_PROTOCOL_VERSION,
        maxProtocol: DIRECT_PROTOCOL_VERSION,
        client: {
          id: 'webchat-ui',
          displayName: 'agent-chat',
          version: '0.1.0',
          platform,
          deviceFamily,
          mode: 'webchat',
          instanceId: (this.options.instanceId ?? OPENCLAW_CLIENT_INSTANCE_ID).trim() || undefined,
        },
        caps: [],
        role,
        scopes,
        device: {
          id: deviceIdentity.deviceId,
          publicKey: deviceIdentity.publicKeyRawBase64Url,
          signature,
          signedAt: signedAtMs,
          nonce,
        },
        auth:
          authToken || authPassword || authDeviceToken
            ? {
                token: authToken || undefined,
                password: authPassword || undefined,
                deviceToken: authDeviceToken || undefined,
              }
            : undefined,
        locale: globalThis.navigator?.language,
        userAgent: globalThis.navigator?.userAgent,
      },
    };

    this.handshakeRequestId = handshakeRequestId;
    this.lastDeviceIdentityId = deviceIdentity.deviceId;
    this.socket?.send(JSON.stringify(frame));
  }

  /**
   * 处理真实 Gateway 的握手响应。
   *
   * 设计原因：
   * - 官方协议会把 `hello-ok` 放在 `res.payload` 中返回
   * - 握手响应若与普通业务响应共用同一分支，容易把连接状态与业务返回混在一起
   */
  private handleHandshakeResponse(frame: OpenClawResponseFrame<unknown>): boolean {
    if (!this.handshakeRequestId || frame.id !== this.handshakeRequestId) {
      return false;
    }

    this.handshakeRequestId = null;

    if (!frame.ok) {
      /**
       * 某些 Gateway 会直接在握手响应里返回 signature 相关错误，而不是先 close。
       *
       * 设计原因：
       * - 若这里不做同样的受控恢复，刷新后的失效 token 仍会把用户卡死在首屏
       * - 恢复逻辑必须与 close reason 分支保持一致，才能保证问题诊断可预测
       */
      if (this.tryRecoverFromDeviceSignatureFailure(frame.error.message || frame.error.code)) {
        return true;
      }

      this.handleConnectFailure(
        new DirectOpenClawTransportError(
          'DIRECT_HANDSHAKE_FAILED',
          frame.error.message || frame.error.code || 'OpenClaw 握手失败',
        ),
      );
      return true;
    }

    const helloFrame = frame.payload ?? frame.result;
    if (this.isHelloOkFrame(helloFrame)) {
      if (
        this.lastDeviceIdentityId &&
        helloFrame.auth?.deviceToken &&
        typeof helloFrame.auth.role === 'string'
      ) {
        storeBrowserDeviceAuthToken({
          deviceId: this.lastDeviceIdentityId,
          role: helloFrame.auth.role,
          token: helloFrame.auth.deviceToken,
          scopes: helloFrame.auth.scopes ?? [],
        });
      }
      this.completeHandshake();
      return true;
    }

    this.handleConnectFailure(
      new DirectOpenClawTransportError(
        'DIRECT_HANDSHAKE_FAILED',
        'OpenClaw 握手返回了无法识别的 hello 响应',
      ),
    );
    return true;
  }

  /**
   * 统一完成握手后的连接态切换。
   *
   * 设计原因：
   * - 真实 `res.payload.hello-ok` 与早期顶层 `hello-ok` 都要走同一收尾逻辑
   * - 单点收敛后，后续再补协议兼容时不容易遗漏状态重置
   */
  private completeHandshake(): void {
    this.handshakeRequestId = null;
    this.clearConnectTimeout();
    this.reconnectAttempts = 0;
    this.deviceTokenRecoveryUsed = false;
    this.updateConnectionStatus(true);
    this.connectResolver?.();
    this.resetConnectPromise(false);
  }

  /**
   * 尝试从浏览器缓存 device token 漂移中恢复。
   *
   * 设计原因：
   * - `device signature invalid / expired` 多数发生在缓存 token 参与握手后
   * - 此时优先清除冲突 token 并保留稳定 identity，可以减少重复 pairing
   * - 只允许执行一次，避免把真正的 auth 配置错误伪装成“自动修复”
   */
  private tryRecoverFromDeviceSignatureFailure(reason: string): boolean {
    const normalizedReason = reason.trim().toLowerCase();
    if (
      !normalizedReason ||
      this.deviceTokenRecoveryUsed ||
      !DEVICE_SIGNATURE_RECOVERY_REASONS.some((keyword) => normalizedReason.includes(keyword)) ||
      !this.lastDeviceIdentityId
    ) {
      return false;
    }

    const role = (this.options.role ?? OPENCLAW_GATEWAY_ROLE).trim() || 'operator';
    this.deviceTokenRecoveryUsed = true;
    clearBrowserDeviceAuthToken({
      deviceId: this.lastDeviceIdentityId,
      role,
    });

    /**
     * 这里显式重置握手请求与连接承诺，但保留原有 resolver / rejector。
     *
     * 设计原因：
     * - 恢复流程对页面来说仍应表现为“同一次 connect 仍在继续”
     * - 若提前 reset promise，会让恢复后的第二次握手失去完成出口
     */
    this.handshakeRequestId = null;
    this.clearConnectTimeout();
    this.socket = null;
    this.openSocket(this.resolveGatewayUrl());
    return true;
  }

  /**
   * 从 close event 中提取最有价值的诊断信息。
   *
   * 设计原因：
   * - 握手阶段失败通常只会以 close reason 形式出现
   * - 页面与测试都需要拿到稳定的人类可读原因，而不是空字符串
   */
  private resolveSocketCloseReason(closeEvent: CloseEvent): string {
    const reason = typeof closeEvent.reason === 'string' ? closeEvent.reason.trim() : '';
    if (reason) {
      return reason;
    }

    if (typeof closeEvent.code === 'number' && closeEvent.code > 0) {
      return `OpenClaw 连接已关闭（code=${closeEvent.code}）`;
    }

    return '';
  }

  private handleResponseFrame(frame: OpenClawResponseFrame<unknown>): void {
    const pendingRequest = this.pendingRequests.get(frame.id);
    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timer);
    this.pendingRequests.delete(frame.id);

    if (!frame.ok) {
      pendingRequest.reject(
        new DirectOpenClawTransportError(
          'DIRECT_HANDSHAKE_FAILED',
          frame.error.message || frame.error.code || 'OpenClaw 请求失败',
        ),
      );
      return;
    }

    pendingRequest.resolve(frame.payload ?? frame.result);
  }

  private handleConnectFailure(error: DirectOpenClawTransportError): void {
    this.clearConnectTimeout();
    this.updateConnectionStatus(false);
    this.handshakeRequestId = null;
    this.lastDeviceIdentityId = null;
    this.connectRejector?.(error);
    // 握手阶段失败属于显式诊断，不应继续自动重连刷屏。
    this.manualDisconnect = true;
    this.socket?.close(1008, error.message);
    this.resetConnectPromise();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.clearReconnectTimer();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 4000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.connectPromise = null;
      try {
        this.openSocket(this.resolveGatewayUrl());
      } catch {
        // 若重新读取配置仍失败，则停止静默重连，等待用户显式刷新。
      }
    }, delay);
  }

  private rejectPendingRequests(error: Error): void {
    this.pendingRequests.forEach((pendingRequest) => {
      clearTimeout(pendingRequest.timer);
      pendingRequest.reject(error);
    });
    this.pendingRequests.clear();
  }

  private updateConnectionStatus(connected: boolean): void {
    if (this._isConnected === connected) {
      return;
    }

    this._isConnected = connected;
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  private clearConnectTimeout(): void {
    if (!this.connectTimeout) {
      return;
    }

    clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private resetConnectPromise(clearSocket = true): void {
    this.connectPromise = null;
    this.connectResolver = null;
    this.connectRejector = null;
    if (clearSocket) {
      this.socket = null;
    }
  }

  /**
   * 提取握手 challenge nonce。
   *
   * 设计原因：
   * - 真实 Gateway 使用 `type=event + event=connect.challenge`
   * - 早期测试和 mock 仍保留顶层 `type=connect.challenge`
   * - 这里统一兼容两种 shape，避免真实直连和本地 mock 互相打架
   */
  private extractConnectChallengeNonce(frame: unknown): string | null {
    if (!this.isConnectChallengeFrame(frame)) {
      return null;
    }

    if (frame.type === 'connect.challenge') {
      return frame.nonce;
    }

    return frame.payload.nonce;
  }

  private isConnectChallengeFrame(frame: unknown): frame is OpenClawConnectChallengeFrame {
    if (!frame || typeof frame !== 'object' || !('type' in frame)) {
      return false;
    }

    if ((frame as { type?: string }).type === 'connect.challenge') {
      return 'nonce' in frame && typeof (frame as { nonce?: unknown }).nonce === 'string';
    }

    return (
      (frame as { type?: string }).type === 'event' &&
      'event' in frame &&
      (frame as { event?: string }).event === 'connect.challenge' &&
      'payload' in frame &&
      typeof (frame as { payload?: { nonce?: unknown } }).payload?.nonce === 'string'
    );
  }

  private isHelloOkFrame(frame: unknown): frame is OpenClawHelloOkFrame {
    return Boolean(
      frame &&
      typeof frame === 'object' &&
      'type' in frame &&
      (frame as { type?: string }).type === 'hello-ok',
    );
  }

  private isResponseFrame(frame: unknown): frame is OpenClawResponseFrame<unknown> {
    return Boolean(
      frame &&
      typeof frame === 'object' &&
      'type' in frame &&
      (frame as { type?: string }).type === 'res' &&
      'id' in frame &&
      'ok' in frame,
    );
  }

  private isGatewayEvent(frame: unknown): frame is OpenClawGatewayEvent {
    return Boolean(
      frame &&
      typeof frame === 'object' &&
      'type' in frame &&
      (frame as { type?: string }).type === 'event' &&
      'event' in frame,
    );
  }
}

export const directOpenClawTransport = new DirectOpenClawTransport();
