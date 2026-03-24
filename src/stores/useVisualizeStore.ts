import { create } from 'zustand';
import type { SessionVisualizeRuntime } from '@/types/visualize';

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
  runtimeBySession: Record<string, SessionVisualizeRuntime>;

  openPanel: (sessionId: string, messageId?: string) => void;
  closePanel: () => void;
  openWorkbench: (sessionId: string, messageId?: string) => void;
  hideWorkbench: () => void;
  setSessionRuntime: (sessionId: string, runtime: SessionVisualizeRuntime) => void;
  clearSessionRuntime: (sessionId: string) => void;
}

export const useVisualizeStore = create<VisualizeState>()((set) => ({
  isPanelOpen: false,
  panelSessionId: null,
  panelMessageId: null,
  isWorkbenchVisible: false,
  workbenchSessionId: null,
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
   * 打开沉浸式执行状态工作台。
   *
   * 规则：
   * - 总是记录当前目标会话
   * - 隐藏后再次打开同一会话时，会复用此前保活的 iframe
   * - 进入工作台时默认关闭轻量提示，避免同时干扰沉浸式界面
   */
  openWorkbench: (sessionId, messageId) =>
    set({
      isWorkbenchVisible: true,
      workbenchSessionId: sessionId,
      isPanelOpen: false,
      panelSessionId: sessionId,
      panelMessageId: messageId ?? null,
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
