import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore, createTempSession, generateSessionTitle } from '@/stores/useChatStore';
import type { Message } from '@/types/message';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });
  });

  describe('会话管理', () => {
    it('addSession 添加会话到列表头部', () => {
      const s1 = createTempSession('会话1');
      const s2 = createTempSession('会话2');
      useChatStore.getState().addSession(s1);
      useChatStore.getState().addSession(s2);

      const { sessions } = useChatStore.getState();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].title).toBe('会话2'); // 最新的在前
    });

    it('removeSession 删除会话及其消息', () => {
      const session = createTempSession();
      useChatStore.getState().addSession(session);
      useChatStore.setState({
        messages: { [session.id]: [] },
        currentSessionId: session.id,
      });

      useChatStore.getState().removeSession(session.id);

      const { sessions, messages, currentSessionId } = useChatStore.getState();
      expect(sessions).toHaveLength(0);
      expect(messages[session.id]).toBeUndefined();
      expect(currentSessionId).toBeNull();
    });

    it('removeSession 删除当前会话后切换到下一个会话', () => {
      const s1 = createTempSession('1');
      const s2 = createTempSession('2');
      useChatStore.getState().addSession(s1);
      useChatStore.getState().addSession(s2);
      useChatStore.getState().setCurrentSession(s2.id); // s2 在前

      useChatStore.getState().removeSession(s2.id);
      expect(useChatStore.getState().currentSessionId).toBe(s1.id);
    });

    it('updateSession 更新会话属性', () => {
      const session = createTempSession();
      useChatStore.getState().addSession(session);
      useChatStore.getState().updateSession(session.id, { title: '新标题' });

      const updated = useChatStore.getState().sessions.find((s) => s.id === session.id);
      expect(updated?.title).toBe('新标题');
    });
  });

  describe('消息管理', () => {
    it('addMessage 追加消息', () => {
      const session = createTempSession();
      useChatStore.getState().addSession(session);
      useChatStore.getState().setCurrentSession(session.id);

      const msg: Message = {
        id: 'msg_001',
        sessionId: session.id,
        role: 'user',
        contentType: 'text',
        content: { text: '你好' },
        status: 'done',
        timestamp: Date.now(),
      };
      useChatStore.getState().addMessage(msg);

      const messages = useChatStore.getState().getCurrentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg_001');
    });

    it('流式消息：appendStreamChunk + finalizeStream', () => {
      const session = createTempSession();
      const messageId = 'msg_stream_001';
      useChatStore.getState().addSession(session);

      // 添加一条 streaming 状态的消息
      const msg: Message = {
        id: messageId,
        sessionId: session.id,
        role: 'assistant',
        contentType: 'text',
        content: { text: '' },
        status: 'streaming',
        timestamp: Date.now(),
      };
      useChatStore.getState().addMessage(msg);

      // 模拟流式追加
      useChatStore.getState().appendStreamChunk(messageId, '你');
      useChatStore.getState().appendStreamChunk(messageId, '好');
      useChatStore.getState().appendStreamChunk(messageId, '！');

      expect(useChatStore.getState().streamingBuffer[messageId]).toBe('你好！');

      // 完成流式
      useChatStore.getState().finalizeStream(session.id, messageId);

      const messages = useChatStore.getState().messages[session.id];
      const finalMsg = messages?.find((m) => m.id === messageId);
      expect(finalMsg?.status).toBe('done');
      expect((finalMsg?.content as { text: string }).text).toBe('你好！');
      expect(useChatStore.getState().streamingBuffer[messageId]).toBeUndefined();
    });
  });

  describe('UI 状态', () => {
    it('setConnected 更新连接状态', () => {
      useChatStore.getState().setConnected(true);
      expect(useChatStore.getState().isConnected).toBe(true);
      useChatStore.getState().setConnected(false);
      expect(useChatStore.getState().isConnected).toBe(false);
    });

    it('setDraft 保存草稿', () => {
      useChatStore.getState().setDraft('session_1', '草稿文字');
      expect(useChatStore.getState().drafts['session_1']).toBe('草稿文字');
    });

    it('setSessionSending 按会话维护发送态', () => {
      useChatStore.getState().setSessionSending('session_a', true);
      expect(useChatStore.getState().sendingSessionIds['session_a']).toBe(true);
      expect(useChatStore.getState().isSending).toBe(true);

      useChatStore.getState().setSessionSending('session_b', true);
      useChatStore.getState().setSessionSending('session_a', false);

      expect(useChatStore.getState().sendingSessionIds['session_a']).toBeUndefined();
      expect(useChatStore.getState().sendingSessionIds['session_b']).toBe(true);
      expect(useChatStore.getState().isSending).toBe(true);

      useChatStore.getState().setSessionSending('session_b', false);
      expect(useChatStore.getState().isSending).toBe(false);
    });
  });
});

describe('工具函数', () => {
  it('generateSessionTitle: 短文本不加省略号', () => {
    expect(generateSessionTitle('你好')).toBe('你好');
  });

  it('generateSessionTitle: 超过 20 字截断加省略号', () => {
    const long = '这是一段超过二十个字的文字消息内容，用于测试截断功能';
    const result = generateSessionTitle(long);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(23); // 20字 + '...'
  });

  it('generateSessionTitle: 无参数返回包含当前日期的标题', () => {
    const result = generateSessionTitle();
    expect(result.startsWith('对话 ')).toBe(true);
  });
});
