import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStarOfficeAdapterStore } from '@/mocks/starOffice/adapterStore';

describe('LocalStarOfficeAdapterStore', () => {
  const store = new LocalStarOfficeAdapterStore();

  beforeEach(() => {
    store.reset();
  });

  it('按 sessionId 保存并读取状态', () => {
    store.push({
      sessionId: 'session_alpha',
      state: 'writing',
      detail: '正在生成回复',
      source: 'frontend',
    });

    expect(store.getStatus('session_alpha')?.state).toBe('writing');
    expect(store.getStatus('session_alpha')?.detail).toBe('正在生成回复');
  });

  it('不同会话状态互不覆盖', () => {
    store.push({
      sessionId: 'session_a',
      state: 'writing',
      detail: 'A 正在生成',
      source: 'frontend',
    });
    store.push({
      sessionId: 'session_b',
      state: 'executing',
      detail: 'B 正在执行',
      source: 'frontend',
    });

    expect(store.getStatus('session_a')?.detail).toBe('A 正在生成');
    expect(store.getStatus('session_b')?.detail).toBe('B 正在执行');
  });

  it('未指定 progress 时使用默认进度值', () => {
    const nextState = store.push({
      sessionId: 'session_progress',
      state: 'executing',
      detail: '正在执行图表生成',
      source: 'frontend',
    });

    expect(nextState.progress).toBe(82);
  });

  it('getAgents 返回当前会话的主 Agent 状态', () => {
    store.push({
      sessionId: 'session_agents',
      state: 'researching',
      detail: '正在分析用户请求',
      source: 'frontend',
    });

    const agents = store.getAgents('session_agents');
    expect(agents?.agents).toHaveLength(1);
    expect(agents?.agents[0].name).toBe('OpenClaw');
    expect(agents?.agents[0].state).toBe('researching');
  });

  it('reset 会清空全部会话状态', () => {
    store.push({
      sessionId: 'session_reset',
      state: 'idle',
      detail: '已完成',
      source: 'frontend',
    });

    store.reset();
    expect(store.getStatus('session_reset')).toBeNull();
  });
});
