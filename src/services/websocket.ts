import { API_BASE_URL, WS_CONFIG } from '@/constants';
import { getToken } from '@/utils/token';
import type { WsClientMessage, WsServerMessage } from '@/types/ws';

type MessageHandler = (message: WsServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

/**
 * WebSocket 连接管理服务
 * 特性：
 * - 自动重连（指数退避）
 * - 心跳保活
 * - 消息订阅/取消订阅
 * - 连接状态回调
 */
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;

  /** 按消息类型分组的监听器 */
  private typeListeners = new Map<string, Set<MessageHandler>>();
  /** 全量消息监听器（监听所有消息类型） */
  private allListeners = new Set<MessageHandler>();
  /** 连接状态变化监听器 */
  private statusListeners = new Set<StatusHandler>();

  /**
   * 建立 WebSocket 连接
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isManualClose = false;
    const token = getToken();
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const url = token ? `${wsBase}/ws?token=${encodeURIComponent(token)}` : `${wsBase}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyStatus(true);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WsServerMessage;
        this.dispatch(message);
      } catch (err) {
        console.warn('[WebSocket] 消息解析失败:', err);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.notifyStatus(false);
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[WebSocket] 连接错误:', err);
    };
  }

  /**
   * 主动断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
  }

  /**
   * 发送消息
   * @param message - 要发送的消息对象（自动序列化为 JSON）
   */
  send(message: WsClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] 连接未建立，无法发送消息');
      return false;
    }
    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * 订阅指定类型的消息
   * @param type - 消息类型（对应 WsServerMessage.type）
   * @param handler - 消息处理函数
   * @returns 取消订阅函数
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.typeListeners.has(type)) {
      this.typeListeners.set(type, new Set());
    }
    this.typeListeners.get(type)!.add(handler);
    return () => this.typeListeners.get(type)?.delete(handler);
  }

  /**
   * 订阅所有消息
   * @param handler - 消息处理函数
   * @returns 取消订阅函数
   */
  onAll(handler: MessageHandler): () => void {
    this.allListeners.add(handler);
    return () => this.allListeners.delete(handler);
  }

  /**
   * 订阅连接状态变化
   * @param handler - 状态处理函数（true=已连接，false=已断开）
   * @returns 取消订阅函数
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  /** 是否已连接 */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ===========================
  // 私有方法
  // ===========================

  private dispatch(message: WsServerMessage): void {
    // 派发到对应类型的监听器
    this.typeListeners.get(message.type)?.forEach((handler) => handler(message));
    // 派发到全量监听器
    this.allListeners.forEach((handler) => handler(message));
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((handler) => handler(connected));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_CONFIG.RECONNECT_MAX) {
      console.warn('[WebSocket] 已达到最大重连次数，停止重连');
      return;
    }

    // 指数退避：1s, 2s, 4s, 8s, 16s
    const delay = WS_CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] 第 ${this.reconnectAttempts} 次重连...`);
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/** 全局单例 */
export const wsService = new WebSocketService();
