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

export const VISUALIZE_STATE_LABELS: Record<VisualizeRuntimeState, string> = {
  idle: '待命中',
  researching: '调研中',
  writing: '生成中',
  executing: '执行中',
  syncing: '同步中',
  error: '异常',
};
