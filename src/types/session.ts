/** 对话会话 */
export interface Session {
  /** 会话唯一 ID */
  id: string;
  /** 会话标题（默认取第一条消息前 20 字） */
  title: string;
  /** 最后一条消息摘要 */
  lastMessage?: string;
  /** 最后消息时间戳（毫秒） */
  lastMessageAt?: number;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 消息总数 */
  messageCount: number;
}
