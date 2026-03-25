import { create } from 'zustand';
import type {
  SessionVisualizeRuntime,
  WorkbenchLoadState,
  WorkbenchSessionLifecycle,
} from '@/types/visualize';

/**
 * 沉浸式工作台缓存上限。
 *
 * 设计原因：
 * - `iframe + Phaser` 运行时相对较重，不适合无限保活
 * - 最近 2 个会话已经足以覆盖最常见的往返切换路径
 */
export const MAX_WORKBENCH_CACHE_SIZE = 2;

/**
 * 以 LRU 规则更新工作台缓存顺序。
 *
 * 规则：
 * - 被访问的 `sessionId` 总是移动到末尾，表示最近使用
 * - 当容量超限时，优先淘汰最久未使用且不在保护名单中的实例
 */
function touchWorkbenchCache(
  cacheSessionIds: string[],
  sessionId: string,
  protectedSessionIds: Array<string | null | undefined> = [],
) {
  const nextCache = [...cacheSessionIds.filter((cachedId) => cachedId !== sessionId), sessionId];
  const protectedSet = new Set(
    protectedSessionIds.filter((value): value is string => Boolean(value && value.trim())),
  );
  protectedSet.add(sessionId);

  while (nextCache.length > MAX_WORKBENCH_CACHE_SIZE) {
    const removableIndex = nextCache.findIndex((cachedId) => !protectedSet.has(cachedId));
    nextCache.splice(removableIndex >= 0 ? removableIndex : 0, 1);
  }

  return nextCache;
}

/**
 * 统一创建工作台生命周期对象，避免 TS 在 setState 合并时把字面量状态放宽成 `string`。
 */
function createWorkbenchLifecycle(
  status: WorkbenchLoadState,
  errorMessage: string | null = null,
): WorkbenchSessionLifecycle {
  return {
    status,
    errorMessage,
    updatedAt: Date.now(),
  };
}

interface VisualizeState {
  /** 轻量执行状态提示是否打开 */
  isPanelOpen: boolean;
  /** 当前轻量提示绑定的会话 ID */
  panelSessionId: string | null;
  /** 当前轻量提示来源消息 ID */
  panelMessageId: string | null;
  /** 沉浸式工作台当前是否可见 */
  isWorkbenchVisible: boolean;
  /** 已保活的工作台会话 ID。隐藏时仍保留，用于避免重复初始化 iframe */
  workbenchSessionId: string | null;
  /** 最近使用的工作台会话缓存，按 LRU 顺序维护 */
  workbenchCacheSessionIds: string[];
  /** 每个会话的工作台加载生命周期 */
  workbenchLifecycleBySession: Record<string, WorkbenchSessionLifecycle>;
  runtimeBySession: Record<string, SessionVisualizeRuntime>;

  openPanel: (sessionId: string, messageId?: string) => void;
  closePanel: () => void;
  ensureWorkbenchSession: (sessionId: string) => void;
  openWorkbench: (sessionId: string, messageId?: string) => void;
  hideWorkbench: () => void;
  markWorkbenchLoading: (sessionId: string) => void;
  markWorkbenchReady: (sessionId: string) => void;
  markWorkbenchError: (sessionId: string, errorMessage?: string) => void;
  setSessionRuntime: (sessionId: string, runtime: SessionVisualizeRuntime) => void;
  clearSessionRuntime: (sessionId: string) => void;
}

export const useVisualizeStore = create<VisualizeState>()((set) => ({
  isPanelOpen: false,
  panelSessionId: null,
  panelMessageId: null,
  isWorkbenchVisible: false,
  workbenchSessionId: null,
  workbenchCacheSessionIds: [],
  workbenchLifecycleBySession: {},
  runtimeBySession: {},

  /**
   * 打开轻量执行状态提示，并记录当前会话上下文。
   *
   * 说明：
   * - 轻量提示只负责提供状态摘要和恢复入口
   * - 不负责承载真实像素办公室 iframe
   */
  openPanel: (sessionId, messageId) =>
    set({
      isPanelOpen: true,
      panelSessionId: sessionId,
      panelMessageId: messageId ?? null,
    }),

  /** 关闭轻量提示，并清理其激活上下文。 */
  closePanel: () =>
    set({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
    }),

  /**
   * 将某个会话加入工作台缓存。
   *
   * 设计原因：
   * - 聊天页进入某个会话后，希望可以静默预热该会话的办公室 iframe
   * - 缓存命中时再次进入工作台可避免重新初始化
   */
  ensureWorkbenchSession: (sessionId) =>
    set((state) => {
      const nextCacheSessionIds = touchWorkbenchCache(
        state.workbenchCacheSessionIds,
        sessionId,
        state.isWorkbenchVisible ? [state.workbenchSessionId] : [],
      );
      const evictedSessionIds = state.workbenchCacheSessionIds.filter(
        (cachedId) => !nextCacheSessionIds.includes(cachedId),
      );
      const nextLifecycleBySession = { ...state.workbenchLifecycleBySession };

      evictedSessionIds.forEach((cachedId) => {
        delete nextLifecycleBySession[cachedId];
      });

      if (!nextLifecycleBySession[sessionId]) {
        nextLifecycleBySession[sessionId] = createWorkbenchLifecycle('idle');
      }

      return {
        workbenchCacheSessionIds: nextCacheSessionIds,
        workbenchLifecycleBySession: nextLifecycleBySession,
      };
    }),

  /**
   * 打开沉浸式执行状态工作台。
   *
   * 规则：
   * - 总是记录当前目标会话
   * - 隐藏后再次打开同一会话时，会复用此前保活的 iframe
   * - 进入工作台时默认关闭轻量提示，避免同时干扰沉浸式界面
   */
  openWorkbench: (sessionId, messageId) =>
    set((state) => {
      const nextCacheSessionIds = touchWorkbenchCache(state.workbenchCacheSessionIds, sessionId, [
        state.workbenchSessionId,
      ]);
      const evictedSessionIds = state.workbenchCacheSessionIds.filter(
        (cachedId) => !nextCacheSessionIds.includes(cachedId),
      );
      const nextLifecycleBySession = { ...state.workbenchLifecycleBySession };

      evictedSessionIds.forEach((cachedId) => {
        delete nextLifecycleBySession[cachedId];
      });

      if (!nextLifecycleBySession[sessionId]) {
        nextLifecycleBySession[sessionId] = createWorkbenchLifecycle('idle');
      }

      return {
        isWorkbenchVisible: true,
        workbenchSessionId: sessionId,
        workbenchCacheSessionIds: nextCacheSessionIds,
        workbenchLifecycleBySession: nextLifecycleBySession,
        isPanelOpen: false,
        panelSessionId: sessionId,
        panelMessageId: messageId ?? null,
      };
    }),

  /**
   * 收起沉浸式工作台，但不清除 `workbenchSessionId`。
   *
   * 这样再次打开同一会话时，React 不需要重新卸载/挂载 iframe，
   * 可以尽量复用已完成初始化的真实 Star-Office 页面。
   *
   * 同时在聊天页重新暴露轻量提示，给用户一个明确的“恢复工作台”入口，
   * 避免退出后只能依赖消息操作再次进入。
   */
  hideWorkbench: () =>
    set((state) => ({
      isWorkbenchVisible: false,
      workbenchSessionId: state.workbenchSessionId,
      isPanelOpen: Boolean(state.workbenchSessionId),
      panelSessionId: state.workbenchSessionId ?? state.panelSessionId,
    })),

  /**
   * 标记某个会话的工作台正在初始化。
   *
   * 说明：
   * - 无论来自显式打开还是静默预热，都统一落到 warming
   * - 这样头部入口与工作台壳层都可以共享同一套生命周期信息
   */
  markWorkbenchLoading: (sessionId) =>
    set((state) => ({
      workbenchLifecycleBySession: {
        ...state.workbenchLifecycleBySession,
        [sessionId]: createWorkbenchLifecycle('warming'),
      },
    })),

  /** 标记某个会话的工作台已完成初始化，可直接恢复显示。 */
  markWorkbenchReady: (sessionId) =>
    set((state) => {
      const nextCacheSessionIds = touchWorkbenchCache(
        state.workbenchCacheSessionIds,
        sessionId,
        state.isWorkbenchVisible ? [state.workbenchSessionId] : [],
      );
      const evictedSessionIds = state.workbenchCacheSessionIds.filter(
        (cachedId) => !nextCacheSessionIds.includes(cachedId),
      );
      const nextLifecycleBySession = {
        ...state.workbenchLifecycleBySession,
        [sessionId]: createWorkbenchLifecycle('ready'),
      };

      evictedSessionIds.forEach((cachedId) => {
        delete nextLifecycleBySession[cachedId];
      });

      return {
        workbenchCacheSessionIds: nextCacheSessionIds,
        workbenchLifecycleBySession: nextLifecycleBySession,
      };
    }),

  /** 标记某个会话的工作台加载异常，便于入口与宿主展示明确反馈。 */
  markWorkbenchError: (sessionId, errorMessage) =>
    set((state) => ({
      workbenchLifecycleBySession: {
        ...state.workbenchLifecycleBySession,
        [sessionId]: createWorkbenchLifecycle('error', errorMessage ?? null),
      },
    })),

  setSessionRuntime: (sessionId, runtime) =>
    set((state) => ({
      runtimeBySession: {
        ...state.runtimeBySession,
        [sessionId]: runtime,
      },
    })),

  clearSessionRuntime: (sessionId) =>
    set((state) => {
      const nextRuntimeBySession = { ...state.runtimeBySession };
      delete nextRuntimeBySession[sessionId];

      return {
        runtimeBySession: nextRuntimeBySession,
      };
    }),
}));
