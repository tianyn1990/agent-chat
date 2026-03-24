import type { SessionVisualizeRuntime, VisualizeRuntimeState } from '../../types/visualize';

/**
 * 本地 mock adapter 支持的状态推送载荷。
 *
 * 该结构尽量贴近未来真实适配层会输出的会话状态快照，
 * 以便后续从本地 mock 平滑切换到真实服务端。
 */
export interface LocalStarOfficePushPayload {
  sessionId: string;
  state: VisualizeRuntimeState;
  detail: string;
  progress?: number;
  messageId?: string;
  source: SessionVisualizeRuntime['source'] | 'frontend-mock';
}

/** 本地 mock 的主状态响应结构 */
export interface LocalStarOfficeStatusResponse {
  sessionId: string;
  state: VisualizeRuntimeState;
  detail: string;
  progress: number;
  updatedAt: number;
  messageId?: string;
}

/** 本地 mock 的 Agent 状态结构 */
export interface LocalStarOfficeAgentState {
  agentId: string;
  name: string;
  state: VisualizeRuntimeState;
  detail: string;
  progress: number;
  updatedAt: number;
}

/** 本地 mock 的 Agent 列表响应结构 */
export interface LocalStarOfficeAgentsResponse {
  sessionId: string;
  agents: LocalStarOfficeAgentState[];
}

/** 不同执行状态对应的默认进度值，用于本地 mock 展示 */
export const DEFAULT_PROGRESS_BY_STATE: Record<VisualizeRuntimeState, number> = {
  idle: 100,
  researching: 24,
  writing: 58,
  executing: 82,
  syncing: 92,
  error: 0,
};

/**
 * 本地 Star-Office mock adapter 的内存态存储。
 *
 * 职责：
 * 1. 按 `sessionId` 持久化最近一次会话状态
 * 2. 提供 `/status` 所需主状态快照
 * 3. 提供 `/agents` 所需 Agent 列表快照
 * 4. 为单元测试与 Vite 中间件共用同一套状态逻辑
 */
export class LocalStarOfficeAdapterStore {
  private stateBySession = new Map<string, LocalStarOfficeStatusResponse>();

  /**
   * 写入或覆盖某个会话的本地状态。
   *
   * 约束：
   * - 必须显式指定 `sessionId`
   * - 未提供 `progress` 时使用状态默认值
   * - `updatedAt` 由 adapter 写入，避免依赖前端时钟精度
   */
  push(payload: LocalStarOfficePushPayload): LocalStarOfficeStatusResponse {
    const nextState: LocalStarOfficeStatusResponse = {
      sessionId: payload.sessionId,
      state: payload.state,
      detail: payload.detail,
      progress: payload.progress ?? DEFAULT_PROGRESS_BY_STATE[payload.state],
      updatedAt: Date.now(),
      messageId: payload.messageId,
    };

    this.stateBySession.set(payload.sessionId, nextState);
    return nextState;
  }

  /** 读取某个会话的主状态 */
  getStatus(sessionId: string): LocalStarOfficeStatusResponse | null {
    return this.stateBySession.get(sessionId) ?? null;
  }

  /**
   * 读取某个会话的 Agent 列表。
   *
   * 当前阶段只返回一个主 Agent，后续若要模拟多 Agent 协作，
   * 可以在不改接口形状的前提下继续扩展。
   */
  getAgents(sessionId: string): LocalStarOfficeAgentsResponse | null {
    const status = this.getStatus(sessionId);
    if (!status) return null;

    return {
      sessionId,
      agents: [
        {
          agentId: 'main',
          name: 'OpenClaw',
          state: status.state,
          detail: status.detail,
          progress: status.progress,
          updatedAt: status.updatedAt,
        },
      ],
    };
  }

  /** 清空所有本地 mock 状态，供测试与开发重置使用 */
  reset(): void {
    this.stateBySession.clear();
  }
}

/** Vite 开发期中间件使用的单例 store */
export const localStarOfficeAdapterStore = new LocalStarOfficeAdapterStore();
