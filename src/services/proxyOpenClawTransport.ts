import { OPENCLAW_PROXY_URL } from '@/constants';
import type {
  OpenClawGatewayEvent,
  OpenClawGatewayEventType,
  OpenClawMethodParamsMap,
  OpenClawMethodResultMap,
} from '@/types/openclaw';
import type { OpenClawGatewayTransport } from '@/services/openclawTransport';

const CONNECT_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 20000;

interface EventSourceLike {
  readonly readyState: number;
  readonly url?: string;
  close(): void;
  addEventListener(
    type: 'open' | 'message' | 'error',
    listener: (event: Event | MessageEvent) => void,
  ): void;
  removeEventListener(
    type: 'open' | 'message' | 'error',
    listener: (event: Event | MessageEvent) => void,
  ): void;
}

interface ProxyOpenClawTransportOptions {
  proxyUrl?: string;
  fetchImpl?: typeof fetch;
  eventSourceFactory?: (url: string) => EventSourceLike;
}

type TransportStatusHandler = (connected: boolean) => void;

/**
 * proxy 运行时诊断错误。
 *
 * 设计原因：
 * - company-gateway 模式下，失败点从“浏览器直连 WS”变成“代理 HTTP / SSE 链路”
 * - 显式错误码有助于后续区分：前端 transport 问题、proxy dev server 问题、上游 Gateway 问题
 */
export class ProxyOpenClawTransportError extends Error {
  constructor(
    public readonly code:
      | 'PROXY_URL_MISSING'
      | 'PROXY_CONNECT_TIMEOUT'
      | 'PROXY_REQUEST_TIMEOUT'
      | 'PROXY_REQUEST_FAILED'
      | 'PROXY_RESPONSE_INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'ProxyOpenClawTransportError';
  }
}

function normalizeProxyBaseUrl(proxyUrl: string): string {
  const trimmed = proxyUrl.trim();
  if (!trimmed) {
    throw new ProxyOpenClawTransportError(
      'PROXY_URL_MISSING',
      '未配置 OpenClaw company gateway 地址，请检查 VITE_OPENCLAW_PROXY_URL',
    );
  }

  return trimmed.replace(/\/+$/, '');
}

function isGatewayEventFrame(candidate: unknown): candidate is OpenClawGatewayEvent {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const frame = candidate as Record<string, unknown>;
  return (
    frame.type === 'event' &&
    typeof frame.event === 'string' &&
    ['chat', 'agent', 'health'].includes(frame.event) &&
    typeof frame.payload === 'object'
  );
}

/**
 * 浏览器连接 company-gateway / BFF 的 transport。
 *
 * 设计原因：
 * - 前端不再直接承担 OpenClaw 原生握手，而是改用更贴近正式环境的 HTTP + SSE 代理协议
 * - 但 adapter 层仍希望消费统一的 `request / event` 抽象，因此 transport 需要把 proxy 契约重新包装成 Gateway-like 形态
 */
export class ProxyOpenClawTransport implements OpenClawGatewayTransport {
  private readonly eventHandlers = new Map<
    OpenClawGatewayEventType,
    Set<(event: OpenClawGatewayEvent) => void>
  >();
  private readonly statusHandlers = new Set<TransportStatusHandler>();
  private eventSource: EventSourceLike | null = null;
  private connectPromise: Promise<void> | null = null;
  private connectResolver: (() => void) | null = null;
  private connectRejector: ((reason?: unknown) => void) | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private manualDisconnect = false;

  constructor(private readonly options: ProxyOpenClawTransportOptions = {}) {}

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

    const baseUrl = normalizeProxyBaseUrl(this.options.proxyUrl ?? OPENCLAW_PROXY_URL);
    const eventSourceFactory =
      this.options.eventSourceFactory ??
      ((url: string) => new EventSource(url) as unknown as EventSourceLike);

    this.manualDisconnect = false;
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolver = resolve;
      this.connectRejector = reject;
    });

    this.eventSource = eventSourceFactory(`${baseUrl}/events`);
    this.eventSource.addEventListener('open', this.handleOpen);
    this.eventSource.addEventListener('message', this.handleMessage);
    this.eventSource.addEventListener('error', this.handleError);

    this.connectTimeout = setTimeout(() => {
      this.handleConnectFailure(
        new ProxyOpenClawTransportError(
          'PROXY_CONNECT_TIMEOUT',
          '等待 OpenClaw company gateway 连接超时，请检查 proxy dev server 是否已启动',
        ),
      );
    }, CONNECT_TIMEOUT_MS);

    return this.connectPromise;
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.clearConnectTimeout();
    this.updateConnectionStatus(false);
    this.teardownEventSource();
    this.resetConnectPromise();
  }

  async request<TMethod extends keyof OpenClawMethodParamsMap>(
    method: TMethod,
    params: OpenClawMethodParamsMap[TMethod],
  ): Promise<OpenClawMethodResultMap[TMethod]> {
    const baseUrl = normalizeProxyBaseUrl(this.options.proxyUrl ?? OPENCLAW_PROXY_URL);
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchImpl(`${baseUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        payload?: OpenClawMethodResultMap[TMethod];
        error?: { message?: string };
      } | null;

      if (!response.ok || payload?.ok !== true) {
        throw new ProxyOpenClawTransportError(
          'PROXY_REQUEST_FAILED',
          payload?.error?.message ||
            `OpenClaw company gateway 请求失败：${String(method)} (${response.status})`,
        );
      }

      return (payload.payload ?? {}) as OpenClawMethodResultMap[TMethod];
    } catch (error) {
      if (error instanceof ProxyOpenClawTransportError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProxyOpenClawTransportError(
          'PROXY_REQUEST_TIMEOUT',
          `OpenClaw company gateway 请求超时：${String(method)}`,
        );
      }

      throw new ProxyOpenClawTransportError(
        'PROXY_REQUEST_FAILED',
        error instanceof Error
          ? error.message
          : `OpenClaw company gateway 请求失败：${String(method)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
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

  private readonly handleOpen = (): void => {
    this.clearConnectTimeout();
    this.updateConnectionStatus(true);
    this.connectResolver?.();
    this.connectResolver = null;
    this.connectRejector = null;
  };

  private readonly handleMessage = (event: Event | MessageEvent): void => {
    const messageEvent = event as MessageEvent;
    if (typeof messageEvent.data !== 'string') {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(messageEvent.data);
    } catch {
      console.error('[ProxyOpenClawTransport] 收到无法解析的 SSE 数据');
      return;
    }

    if (!isGatewayEventFrame(parsed)) {
      return;
    }

    const handlerSet = this.eventHandlers.get(parsed.event);
    handlerSet?.forEach((handler) => {
      handler(parsed);
    });
  };

  private readonly handleError = (): void => {
    if (this.manualDisconnect) {
      return;
    }

    /**
     * EventSource 会自动重连，这里只更新状态，不主动销毁实例。
     *
     * 设计原因：
     * - company-gateway dev server 在本地重启时，浏览器应尽量自动恢复
     * - 若每次 error 都主动 close，会把原生的自动重连能力浪费掉
     */
    this.updateConnectionStatus(false);
  };

  private handleConnectFailure(error: ProxyOpenClawTransportError): void {
    this.updateConnectionStatus(false);
    this.teardownEventSource();
    this.connectRejector?.(error);
    this.resetConnectPromise();
  }

  private teardownEventSource(): void {
    if (!this.eventSource) {
      return;
    }

    this.eventSource.removeEventListener('open', this.handleOpen);
    this.eventSource.removeEventListener('message', this.handleMessage);
    this.eventSource.removeEventListener('error', this.handleError);
    this.eventSource.close();
    this.eventSource = null;
  }

  private clearConnectTimeout(): void {
    if (!this.connectTimeout) {
      return;
    }

    clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
  }

  private updateConnectionStatus(connected: boolean): void {
    if (this._isConnected === connected) {
      return;
    }

    this._isConnected = connected;
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  private resetConnectPromise(): void {
    this.clearConnectTimeout();
    this.connectPromise = null;
    this.connectResolver = null;
    this.connectRejector = null;
  }
}

export const proxyOpenClawTransport = new ProxyOpenClawTransport();
