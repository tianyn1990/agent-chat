import { beforeEach, describe, expect, it } from 'vitest';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

describe('useVisualizeStore', () => {
  beforeEach(() => {
    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
      runtimeBySession: {},
    });
  });

  it('openPanel 打开面板并记录会话与消息来源', () => {
    useVisualizeStore.getState().openPanel('session_1', 'msg_1');

    const state = useVisualizeStore.getState();
    expect(state.isPanelOpen).toBe(true);
    expect(state.panelSessionId).toBe('session_1');
    expect(state.panelMessageId).toBe('msg_1');
  });

  it('setSessionRuntime 保存会话运行态', () => {
    useVisualizeStore.getState().setSessionRuntime('session_2', {
      state: 'writing',
      detail: '正在生成回复',
      updatedAt: Date.now(),
      source: 'frontend',
    });

    expect(useVisualizeStore.getState().runtimeBySession.session_2?.state).toBe('writing');
  });

  it('closePanel 关闭面板并清空激活上下文', () => {
    useVisualizeStore.getState().openPanel('session_3');
    useVisualizeStore.getState().closePanel();

    const state = useVisualizeStore.getState();
    expect(state.isPanelOpen).toBe(false);
    expect(state.panelSessionId).toBeNull();
    expect(state.panelMessageId).toBeNull();
  });

  it('openWorkbench 打开沉浸式工作台并保留目标会话', () => {
    useVisualizeStore.getState().openWorkbench('session_4', 'msg_4');

    const state = useVisualizeStore.getState();
    expect(state.isWorkbenchVisible).toBe(true);
    expect(state.workbenchSessionId).toBe('session_4');
    expect(state.panelSessionId).toBe('session_4');
  });

  it('hideWorkbench 只隐藏工作台，不清理已保活会话', () => {
    useVisualizeStore.getState().openWorkbench('session_5');
    useVisualizeStore.getState().hideWorkbench();

    const state = useVisualizeStore.getState();
    expect(state.isWorkbenchVisible).toBe(false);
    expect(state.workbenchSessionId).toBe('session_5');
    expect(state.isPanelOpen).toBe(true);
    expect(state.panelSessionId).toBe('session_5');
  });
});
