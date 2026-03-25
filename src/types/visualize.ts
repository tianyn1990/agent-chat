export type VisualizeRuntimeState =
  | 'idle'
  | 'researching'
  | 'writing'
  | 'executing'
  | 'syncing'
  | 'error';

export interface SessionVisualizeRuntime {
  state: VisualizeRuntimeState;
  detail: string;
  updatedAt: number;
  source: 'frontend' | 'gateway';
  messageId?: string;
}

/**
 * 沉浸式工作台 iframe 生命周期状态。
 *
 * 说明：
 * - `warming` 表示 iframe 已开始初始化，但真实办公室尚未 ready
 * - `ready` 表示可直接显示已完成初始化的工作台
 * - `error` 表示加载超时或宿主已判定当前工作台不可用
 */
export type WorkbenchLoadState = 'idle' | 'warming' | 'ready' | 'error';

export interface WorkbenchSessionLifecycle {
  status: WorkbenchLoadState;
  errorMessage?: string | null;
  updatedAt: number;
}

export const VISUALIZE_STATE_LABELS: Record<VisualizeRuntimeState, string> = {
  idle: '待命中',
  researching: '调研中',
  writing: '生成中',
  executing: '执行中',
  syncing: '同步中',
  error: '异常',
};
