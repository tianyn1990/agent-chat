import type { SessionVisualizeRuntime } from '@/types/visualize';
import type { LocalStarOfficePushPayload } from './adapterStore';
import { pushLocalStarOfficeState } from './client';

/** 非终态采用短节流，避免流式 chunk 导致大量无意义 HTTP 推送 */
export const LOCAL_STAR_OFFICE_PUSH_DELAY = 300;

/** 会话运行态到本地 mock 进度值的映射 */
export const LOCAL_STAR_OFFICE_PROGRESS_BY_STATE: Record<SessionVisualizeRuntime['state'], number> =
  {
    idle: 100,
    researching: 24,
    writing: 58,
    executing: 82,
    syncing: 92,
    error: 0,
  };

interface LocalStarOfficeBridgeDeps {
  pushState: (payload: LocalStarOfficePushPayload) => Promise<void>;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
}

/**
 * 将前端会话运行态映射为本地 mock adapter 可消费的载荷。
 */
export function mapRuntimeToLocalStarOfficePayload(
  sessionId: string,
  runtime: SessionVisualizeRuntime,
): LocalStarOfficePushPayload {
  return {
    sessionId,
    state: runtime.state,
    detail: runtime.detail,
    progress: LOCAL_STAR_OFFICE_PROGRESS_BY_STATE[runtime.state],
    messageId: runtime.messageId,
    source: runtime.source,
  };
}

/**
 * 创建本地 mock 桥接器。
 *
 * 职责：
 * 1. 接收前端 `sessionId -> runtime` 更新
 * 2. 做最小必要的去重与节流
 * 3. 将结果推送到本地 mock adapter
 */
export function createLocalStarOfficeBridge(
  deps: LocalStarOfficeBridgeDeps = {
    pushState: pushLocalStarOfficeState,
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancel: (timer) => window.clearTimeout(timer),
  },
) {
  const timerBySession = new Map<string, number>();
  const signatureBySession = new Map<string, string>();

  const dispatchPayload = async (payload: LocalStarOfficePushPayload) => {
    const signature = JSON.stringify(payload);
    if (signatureBySession.get(payload.sessionId) === signature) {
      return;
    }

    signatureBySession.set(payload.sessionId, signature);

    try {
      await deps.pushState(payload);
    } catch (error) {
      console.warn('[StarOfficeMock] 推送本地执行状态失败', error);
    }
  };

  return {
    /**
     * 入队某个会话的最新运行态。
     *
     * 规则：
     * - `idle` / `error` 直接立即推送，避免终态延迟
     * - 其他中间态做会话级节流
     */
    enqueue(sessionId: string, runtime: SessionVisualizeRuntime) {
      const payload = mapRuntimeToLocalStarOfficePayload(sessionId, runtime);
      const existingTimer = timerBySession.get(sessionId);

      if (existingTimer) {
        deps.cancel(existingTimer);
        timerBySession.delete(sessionId);
      }

      if (payload.state === 'idle' || payload.state === 'error') {
        void dispatchPayload(payload);
        return;
      }

      const timer = deps.schedule(() => {
        timerBySession.delete(sessionId);
        void dispatchPayload(payload);
      }, LOCAL_STAR_OFFICE_PUSH_DELAY);

      timerBySession.set(sessionId, timer);
    },

    /** 清理桥接器内部定时器，供页面卸载或测试复位使用 */
    reset() {
      timerBySession.forEach((timer) => deps.cancel(timer));
      timerBySession.clear();
      signatureBySession.clear();
    },
  };
}

/** 默认导出的全局桥接器实例 */
export const localStarOfficeBridge = createLocalStarOfficeBridge();
