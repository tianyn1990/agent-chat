import { useEffect } from 'react';
import { App } from 'antd';
import {
  CHAT_RUNTIME,
  CHAT_RUNTIME_REQUIRES_LOGIN,
  STAR_OFFICE_MOCK_ENABLED,
  STAR_OFFICE_REAL_DEV_ENABLED,
  STAR_OFFICE_URL,
} from '@/constants';
import { localStarOfficeBridge } from '@/mocks/starOffice/bridge';
import { getActiveChatAdapter } from '@/services/chatAdapter';
import { useChatStore } from '@/stores/useChatStore';
import { useUserStore } from '@/stores/useUserStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import type { Message } from '@/types/message';
import {
  shouldBridgeLocalStarOfficeRuntime,
  shouldRecoverSessionFromHistory,
} from '@/components/Chat/chatRuntimeHost.utils';

const chatAdapter = getActiveChatAdapter();
const DIRECT_HISTORY_RECOVERY_INTERVAL = 2200;

/**
 * 全局常驻的 chat runtime 宿主。
 *
 * 设计原因：
 * - `ChatPage` 会在 `/chat/:sessionId` 与 `/visualize/:sessionId` 之间切换时被卸载
 * - 但 chat adapter / transport 在流式回复期间仍可能持续收到事件
 * - 若事件消费绑定在页面层，就会在工作台场景下丢失 `message.completed` 等关键终态事件
 *
 * 因此这里将运行时消费提升到 `AppShell` 层，使其和工作台保活宿主一样常驻。
 */
export default function ChatRuntimeHost() {
  const { message: antMessage } = App.useApp();
  const token = useUserStore((state) => state.token);

  useEffect(() => {
    // legacy websocket 仍依赖仓库原有登录态；mock / direct 均允许在无登录态下接入。
    if (CHAT_RUNTIME_REQUIRES_LOGIN && !token) {
      return;
    }

    const unsubStatus = chatAdapter.onStatus((connected) => {
      useChatStore.getState().setConnected(connected);
    });

    const unsubEvent = chatAdapter.onEvent((event) => {
      switch (event.type) {
        case 'message.delta': {
          const existingMessages = useChatStore.getState().messages[event.sessionId] ?? [];
          const exists = existingMessages.some((message) => message.id === event.messageId);

          if (!exists) {
            const aiMessage: Message = {
              id: event.messageId,
              sessionId: event.sessionId,
              role: 'assistant',
              contentType: 'text',
              content: { text: '' },
              status: 'streaming',
              timestamp: Date.now(),
            };
            useChatStore.getState().addMessage(aiMessage);
          }

          useChatStore.getState().appendStreamChunk(event.messageId, event.delta);
          break;
        }

        case 'message.completed': {
          const fullText = useChatStore.getState().streamingBuffer[event.messageId] ?? '';
          useChatStore.getState().finalizeStream(event.sessionId, event.messageId);
          useChatStore.getState().setSessionSending(event.sessionId, false);
          useChatStore.getState().updateSession(event.sessionId, {
            lastMessage: fullText.slice(0, 40),
            lastMessageAt: Date.now(),
          });
          break;
        }

        case 'message.card': {
          const cardMessage: Message = {
            id: event.messageId,
            sessionId: event.sessionId,
            role: 'assistant',
            contentType: 'card',
            content: event.card,
            status: 'done',
            timestamp: Date.now(),
          };
          useChatStore.getState().addMessage(cardMessage);
          useChatStore.getState().setSessionSending(event.sessionId, false);
          useChatStore.getState().updateSession(event.sessionId, {
            lastMessage: '[卡片消息]',
            lastMessageAt: Date.now(),
          });
          break;
        }

        case 'message.chart': {
          const chartMessage: Message = {
            id: event.messageId,
            sessionId: event.sessionId,
            role: 'assistant',
            contentType: 'chart',
            content: event.chart,
            status: 'done',
            timestamp: Date.now(),
          };
          useChatStore.getState().addMessage(chartMessage);
          useChatStore.getState().setSessionSending(event.sessionId, false);
          useChatStore.getState().updateSession(event.sessionId, {
            lastMessage: '[图表]',
            lastMessageAt: Date.now(),
          });
          break;
        }

        case 'runtime.changed': {
          useVisualizeStore.getState().setSessionRuntime(event.sessionId, event.runtime);

          /**
           * 防御式收敛：
           * - 正常情况下完成事件会先清理发送态
           * - 但如果未来某些 transport 在路由切换或网络波动时漏掉终态事件，仍需避免会话永久卡死
           */
          if (event.runtime.state === 'idle' || event.runtime.state === 'error') {
            useChatStore.getState().setSessionSending(event.sessionId, false);
          }
          break;
        }

        case 'error':
          antMessage.error(event.message || '发生未知错误');
          if (event.sessionId) {
            useChatStore.getState().setSessionSending(event.sessionId, false);
          }
          break;
      }
    });

    void Promise.resolve(chatAdapter.connect()).catch((error: unknown) => {
      console.error('[ChatRuntimeHost] 初始化 chat runtime 失败', error);
      useChatStore.getState().setConnected(false);
      antMessage.error(error instanceof Error ? error.message : '聊天运行时初始化失败');
    });

    return () => {
      unsubStatus();
      unsubEvent();
    };
  }, [antMessage, token]);

  useEffect(() => {
    if (CHAT_RUNTIME !== 'openclaw-direct' && CHAT_RUNTIME !== 'openclaw-proxy') {
      return;
    }

    const inflightSessionIds = new Set<string>();
    let recoveryTimer: number | null = null;

    const clearRecoveryTimer = () => {
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    };

    const hasSendingSessions = () =>
      Object.keys(useChatStore.getState().sendingSessionIds).length > 0;

    const recoverSendingSessions = async () => {
      const { sendingSessionIds, messages, replaceMessages, setSessionSending, updateSession } =
        useChatStore.getState();
      const sendingIds = Object.keys(sendingSessionIds);
      if (sendingIds.length === 0) {
        return;
      }

      await Promise.allSettled(
        sendingIds.map(async (sessionId) => {
          if (inflightSessionIds.has(sessionId)) {
            return;
          }

          inflightSessionIds.add(sessionId);

          try {
            const result = await chatAdapter.getHistory(sessionId);
            const existingMessages = messages[sessionId] ?? [];
            if (
              !shouldRecoverSessionFromHistory({
                existingMessages,
                historyMessages: result.messages,
              })
            ) {
              return;
            }

            replaceMessages(sessionId, result.messages);
            if (result.sessionPatch) {
              updateSession(sessionId, result.sessionPatch);
            }
            setSessionSending(sessionId, false);
            useVisualizeStore.getState().setSessionRuntime(sessionId, {
              state: 'idle',
              detail: '已同步到最新回复',
              updatedAt: Date.now(),
              source: 'gateway',
            });
          } catch (error) {
            console.warn('[ChatRuntimeHost] sending 会话历史补偿失败', sessionId, error);
          } finally {
            inflightSessionIds.delete(sessionId);
          }
        }),
      );
    };

    const scheduleRecoveryIfNeeded = () => {
      if (recoveryTimer !== null || !hasSendingSessions()) {
        return;
      }

      recoveryTimer = window.setTimeout(async () => {
        recoveryTimer = null;
        await recoverSendingSessions();
        scheduleRecoveryIfNeeded();
      }, DIRECT_HISTORY_RECOVERY_INTERVAL);
    };

    const unsubscribe = useChatStore.subscribe((state) => {
      if (Object.keys(state.sendingSessionIds).length === 0) {
        clearRecoveryTimer();
        return;
      }

      scheduleRecoveryIfNeeded();
    });

    scheduleRecoveryIfNeeded();

    return () => {
      clearRecoveryTimer();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const shouldUseLocalAdapter = shouldBridgeLocalStarOfficeRuntime({
      hasStarOfficeUrl: Boolean(STAR_OFFICE_URL),
      starOfficeMockEnabled: STAR_OFFICE_MOCK_ENABLED,
      starOfficeRealDevEnabled: STAR_OFFICE_REAL_DEV_ENABLED,
    });

    if (!shouldUseLocalAdapter) {
      return;
    }

    const previousSignatureBySession = new Map<string, string>();

    /**
     * 将 visualize runtime 常驻桥接到本地 Star-Office adapter。
     *
     * 设计原因：
     * - 工作台路由打开后，聊天页会被卸载
     * - 如果桥接仍放在 `ChatPage` 内，沉浸式工作台期间本地 mock 办公室就会停止接收状态更新
     * - 因此桥接也必须跟随 runtime 宿主一起常驻
     */
    const unsubscribe = useVisualizeStore.subscribe((state) => {
      Object.entries(state.runtimeBySession).forEach(([sessionId, runtime]) => {
        const signature = JSON.stringify(runtime);

        if (previousSignatureBySession.get(sessionId) === signature) {
          return;
        }

        previousSignatureBySession.set(sessionId, signature);
        localStarOfficeBridge.enqueue(sessionId, runtime);
      });
    });

    return () => {
      unsubscribe();
      localStarOfficeBridge.reset();
    };
  }, []);

  return null;
}
