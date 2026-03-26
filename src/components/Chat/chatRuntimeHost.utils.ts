import type { Message } from '@/types/message';

/**
 * 判断某个 sending 会话是否可以用历史记录收敛到终态。
 *
 * 设计原因：
 * - 本地直连阶段真实 Gateway 偶发出现“历史已落盘，但当前连接没收到 final 事件”
 * - 此时不能无脑用历史覆盖所有 sending 会话，否则会把真正进行中的回复提前判完成
 * - 这里要求“历史侧已有更晚的 assistant 回复”，再执行收敛
 */
export function shouldRecoverSessionFromHistory(params: {
  existingMessages: Message[];
  historyMessages: Message[];
}): boolean {
  const { existingMessages, historyMessages } = params;
  if (historyMessages.length === 0) {
    return false;
  }

  const latestUserTimestamp = existingMessages
    .filter((message) => message.role === 'user')
    .reduce((max, message) => Math.max(max, message.timestamp), 0);
  const latestExistingAssistantTimestamp = existingMessages
    .filter((message) => message.role === 'assistant')
    .reduce((max, message) => Math.max(max, message.timestamp), 0);
  const latestHistoryAssistantTimestamp = historyMessages
    .filter((message) => message.role === 'assistant')
    .reduce((max, message) => Math.max(max, message.timestamp), 0);

  if (latestHistoryAssistantTimestamp === 0) {
    return false;
  }

  if (latestHistoryAssistantTimestamp > latestExistingAssistantTimestamp) {
    return latestHistoryAssistantTimestamp >= latestUserTimestamp;
  }

  if (historyMessages.length > existingMessages.length) {
    return true;
  }

  const hasStreamingAssistantMessage = existingMessages.some(
    (message) => message.role === 'assistant' && message.status === 'streaming',
  );
  return hasStreamingAssistantMessage && latestHistoryAssistantTimestamp >= latestUserTimestamp;
}

/**
 * 判断当前运行时是否具备“本地 Star-Office 承接能力”。
 *
 * 设计原因：
 * - direct / proxy 模式下聊天协议已经切到真实链路，但工作台仍可能需要由本地 mock / real dev 页面承接
 * - 旧逻辑把 bridge 绑在 `IS_MOCK_ENABLED` 上，会导致真实协议模式下 runtime 无法继续推给本地工作台
 * - 这里仅根据“是否存在本地承接层”判断，更符合当前架构边界
 */
export function shouldBridgeLocalStarOfficeRuntime(params: {
  hasStarOfficeUrl: boolean;
  starOfficeMockEnabled: boolean;
  starOfficeRealDevEnabled: boolean;
}): boolean {
  return (
    !params.hasStarOfficeUrl && (params.starOfficeMockEnabled || params.starOfficeRealDevEnabled)
  );
}
