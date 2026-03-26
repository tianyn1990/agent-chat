import { create } from 'zustand';
import type { Session } from '@/types/session';
import type { Message } from '@/types/message';
import { prefixedId } from '@/utils/id';

interface ChatState {
  /** 会话列表 */
  sessions: Session[];
  /** 当前活跃的会话 ID */
  currentSessionId: string | null;
  /** 按 sessionId 分组存储的消息 */
  messages: Record<string, Message[]>;
  /** 流式消息文本缓冲（key: messageId，value: 累积文本） */
  streamingBuffer: Record<string, string>;
  /** WebSocket 连接状态 */
  isConnected: boolean;
  /** 是否存在任一会话正在发送消息 */
  isSending: boolean;
  /** 按 sessionId 记录发送中的会话 */
  sendingSessionIds: Record<string, boolean>;
  /** 输入框草稿（key: sessionId） */
  drafts: Record<string, string>;

  // Session Actions
  addSession: (session: Session) => void;
  upsertSessions: (sessions: Session[]) => void;
  updateSession: (sessionId: string, patch: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;

  // Message Actions
  addMessage: (message: Message) => void;
  replaceMessages: (sessionId: string, messages: Message[]) => void;
  updateMessage: (sessionId: string, messageId: string, patch: Partial<Message>) => void;
  /** 追加流式文本块 */
  appendStreamChunk: (messageId: string, delta: string) => void;
  /** 完成流式消息，将 buffer 写入消息 */
  finalizeStream: (sessionId: string, messageId: string) => void;

  // UI Actions
  setConnected: (connected: boolean) => void;
  setSending: (sending: boolean) => void;
  setSessionSending: (sessionId: string, sending: boolean) => void;
  setDraft: (sessionId: string, text: string) => void;

  // Selectors（直接暴露计算属性）
  getCurrentMessages: () => Message[];
  getCurrentSession: () => Session | null;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  streamingBuffer: {},
  isConnected: false,
  isSending: false,
  sendingSessionIds: {},
  drafts: {},

  // --- Session Actions ---

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
    })),

  /**
   * 以服务端返回为主更新会话列表，同时保留本地尚未持久化的草稿会话。
   *
   * 设计原因：
   * - direct / proxy 模式下已有会话来自真实 OpenClaw 链路
   * - 但用户也可能先创建了一个尚未发送的本地草稿会话，这时不能被远端列表直接覆盖掉
   */
  upsertSessions: (sessions) =>
    set((state) => {
      const nextSessionMap = new Map<string, Session>();

      sessions.forEach((session) => {
        const existing = state.sessions.find((item) => item.id === session.id);
        nextSessionMap.set(session.id, existing ? { ...existing, ...session } : session);
      });

      state.sessions.forEach((session) => {
        if (!nextSessionMap.has(session.id)) {
          nextSessionMap.set(session.id, session);
        }
      });

      return {
        sessions: [...nextSessionMap.values()].sort((left, right) => {
          const leftTime = left.lastMessageAt ?? left.createdAt;
          const rightTime = right.lastMessageAt ?? right.createdAt;
          return rightTime - leftTime;
        }),
      };
    }),

  updateSession: (sessionId, patch) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
    })),

  removeSession: (sessionId) =>
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId);
      const newMessages = { ...state.messages };
      const newSendingSessionIds = { ...state.sendingSessionIds };
      delete newMessages[sessionId];
      delete newSendingSessionIds[sessionId];
      const newCurrentId =
        state.currentSessionId === sessionId
          ? (newSessions[0]?.id ?? null)
          : state.currentSessionId;
      return {
        sessions: newSessions,
        messages: newMessages,
        sendingSessionIds: newSendingSessionIds,
        isSending: Object.values(newSendingSessionIds).some(Boolean),
        currentSessionId: newCurrentId,
      };
    }),

  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

  // --- Message Actions ---

  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.sessionId] ?? [];
      return {
        messages: {
          ...state.messages,
          [message.sessionId]: [...existing, message],
        },
      };
    }),

  /** 用远端历史记录整体替换某个会话的消息列表。 */
  replaceMessages: (sessionId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: messages,
      },
    })),

  updateMessage: (sessionId, messageId, patch) =>
    set((state) => {
      const msgs = state.messages[sessionId];
      if (!msgs) return {};
      return {
        messages: {
          ...state.messages,
          [sessionId]: msgs.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
        },
      };
    }),

  appendStreamChunk: (messageId, delta) =>
    set((state) => ({
      streamingBuffer: {
        ...state.streamingBuffer,
        [messageId]: (state.streamingBuffer[messageId] ?? '') + delta,
      },
    })),

  finalizeStream: (sessionId, messageId) => {
    const state = get();
    const fullText = state.streamingBuffer[messageId] ?? '';

    // 将完整文本写入消息，更新状态
    const msgs = state.messages[sessionId];
    if (!msgs) return;

    const newBuffer = { ...state.streamingBuffer };
    delete newBuffer[messageId];

    set({
      streamingBuffer: newBuffer,
      messages: {
        ...state.messages,
        [sessionId]: msgs.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: { text: fullText },
                status: 'done' as const,
              }
            : m,
        ),
      },
    });
  },

  // --- UI Actions ---

  setConnected: (connected) => set({ isConnected: connected }),
  setSending: (sending) => set({ isSending: sending }),
  setSessionSending: (sessionId, sending) =>
    set((state) => {
      const nextSendingSessionIds = { ...state.sendingSessionIds };

      if (sending) {
        nextSendingSessionIds[sessionId] = true;
      } else {
        delete nextSendingSessionIds[sessionId];
      }

      return {
        sendingSessionIds: nextSendingSessionIds,
        isSending: Object.values(nextSendingSessionIds).some(Boolean),
      };
    }),
  setDraft: (sessionId, text) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: text } })),

  // --- Selectors ---

  getCurrentMessages: () => {
    const state = get();
    if (!state.currentSessionId) return [];
    return state.messages[state.currentSessionId] ?? [];
  },

  getCurrentSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.currentSessionId) ?? null;
  },
}));

/** 生成新会话的默认标题 */
export function generateSessionTitle(firstMessage?: string): string {
  if (!firstMessage) return `对话 ${new Date().toLocaleDateString('zh-CN')}`;
  return firstMessage.slice(0, 20) + (firstMessage.length > 20 ? '...' : '');
}

/**
 * 判断一个会话标题是否仍处于“占位/临时”阶段。
 *
 * 设计原因：
 * - 新建会话初始标题通常只是占位文案，真正可读的标题应来自首条消息或用户重命名
 * - direct 模式下若仍把这类占位 label 持久化到 Gateway，会影响刷新后的标题展示
 */
export function isEphemeralSessionTitle(title?: string | null): boolean {
  const normalizedTitle = title?.trim() ?? '';
  return (
    normalizedTitle.length === 0 ||
    normalizedTitle === '新对话' ||
    normalizedTitle === 'OpenClaw 会话' ||
    normalizedTitle === 'New Chat' ||
    normalizedTitle === 'New chat'
  );
}

/** 创建本地临时会话对象（在服务端确认前使用） */
export function createTempSession(title?: string): Session {
  return {
    id: prefixedId('temp_session'),
    title: title ?? '新对话',
    createdAt: Date.now(),
    messageCount: 0,
  };
}

/**
 * 查找可复用的空白会话。
 *
 * 设计原因：
 * - 当前产品不希望用户在尚未发送任何消息前连续创建多个“空新对话”
 * - 因此点击“新建对话”时，应优先复用已有的空白会话，而不是继续新增
 */
export function findReusableDraftSession(
  sessions: Session[],
  messages: Record<string, Message[]>,
): Session | null {
  return (
    sessions.find((session) => {
      const sessionMessages = messages[session.id] ?? [];
      return sessionMessages.length === 0;
    }) ?? null
  );
}
