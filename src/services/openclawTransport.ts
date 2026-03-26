import type {
  OpenClawGatewayEvent,
  OpenClawGatewayEventType,
  OpenClawMethodParamsMap,
  OpenClawMethodResultMap,
} from '@/types/openclaw';

export type OpenClawGatewayEventHandler<TEvent extends OpenClawGatewayEventType> = (
  event: Extract<OpenClawGatewayEvent, { event: TEvent }>,
) => void;

/**
 * OpenClaw Gateway transport 抽象。
 *
 * 设计原因：
 * - 第一阶段先让本地 mock 与页面解耦
 * - 第二阶段可在不改页面层的前提下替换成真实 direct transport
 * - 第三阶段可继续替换为公司网关 proxy transport
 */
export interface OpenClawGatewayTransport {
  connect(): Promise<void> | void;
  disconnect(): void;
  readonly isConnected: boolean;
  request<TMethod extends keyof OpenClawMethodParamsMap>(
    method: TMethod,
    params: OpenClawMethodParamsMap[TMethod],
  ): Promise<OpenClawMethodResultMap[TMethod]>;
  on<TEvent extends OpenClawGatewayEventType>(
    event: TEvent,
    handler: OpenClawGatewayEventHandler<TEvent>,
  ): () => void;
  onStatus(handler: (connected: boolean) => void): () => void;
}
