import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import {
  useChatStore,
  findReusableDraftSession,
  generateSessionTitle,
} from '@/stores/useChatStore';
import { useUserStore } from '@/stores/useUserStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import { mockWsService } from '@/mocks/websocket';
import { localStarOfficeBridge } from '@/mocks/starOffice/bridge';
import { wsService } from '@/services/websocket';
import { ClockCircleOutlined, CommentOutlined, Loading3QuartersOutlined } from '@ant-design/icons';
import {
  IS_MOCK_ENABLED,
  ROUTES,
  STAR_OFFICE_MOCK_ENABLED,
  STAR_OFFICE_REAL_DEV_ENABLED,
  STAR_OFFICE_URL,
} from '@/constants';
import { prefixedId } from '@/utils/id';
import { VISUALIZE_STATE_LABELS } from '@/types/visualize';
import type { VisualizeRuntimeState } from '@/types/visualize';
import type {
  WsMessageChunk,
  WsCardMessage,
  WsChartMessage,
  WsSessionCreated,
  WsError,
} from '@/types/message';
import type { Message } from '@/types/message';
import SessionList from '@/components/Chat/SessionList';
import MessageList from '@/components/Chat/MessageList';
import MessageInput from '@/components/Chat/MessageInput';
import WelcomeScreen from '@/components/Chat/WelcomeScreen';
import VisualizePanel from '@/components/Visualize/VisualizePanel';
import type { SelectedFile } from '@/components/Chat/FileUploadButton';
import styles from './Chat.module.less';

/**
 * 判断当前可视化状态是否处于“活跃执行”阶段。
 * 只有真正代表 Agent 正在工作的状态才触发旋转，避免右上角状态胶囊长期抢占注意力。
 */
function isRuntimeActive(state?: VisualizeRuntimeState): boolean {
  return (
    state === 'researching' || state === 'writing' || state === 'executing' || state === 'syncing'
  );
}

/**
 * 对话页面（主容器）
 *
 * 职责：
 * 1. 管理 WebSocket 连接生命周期（连接/断开/重连）
 * 2. 监听服务端消息（流式文本/卡片/图表/错误）并更新 store
 * 3. 处理会话创建、消息发送的用户操作
 * 4. 向侧边栏注入会话列表（通过 useSidebarStore）
 * 5. 渲染消息列表、输入框、欢迎界面
 */
export default function ChatPage() {
  const { message: antMessage } = App.useApp();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Store
  const {
    sessions,
    currentSessionId,
    messages,
    streamingBuffer,
    sendingSessionIds,
    setCurrentSession,
    addSession,
    addMessage,
    appendStreamChunk,
    finalizeStream,
    updateSession,
    setConnected,
    setSessionSending,
    drafts,
    setDraft,
  } = useChatStore();

  const token = useUserStore((s) => s.token);
  const setExtraContent = useSidebarStore((s) => s.setExtraContent);
  const isVisualizePanelOpen = useVisualizeStore((s) => s.isPanelOpen);
  const currentRuntime = useVisualizeStore((s) =>
    currentSessionId ? s.runtimeBySession[currentSessionId] : null,
  );

  /** 当前输入框待发送的文件列表 */
  const [pendingFiles, setPendingFiles] = useState<SelectedFile[]>([]);
  /**
   * 待注入到目标会话输入框的草稿。
   *
   * 设计原因：
   * - 欢迎态快捷建议、技能详情跳转等入口，可能发生在“当前还没有会话”时
   * - 此时需要先创建/复用会话，再把文案一次性注入到新会话草稿中
   * - 使用本地桥接态可以避免用户必须点击第二次才能看到预填内容
   */
  const [pendingDraftInjection, setPendingDraftInjection] = useState<string | null>(null);

  // 根据 Mock/真实模式选择 WS 服务
  const ws = IS_MOCK_ENABLED ? mockWsService : wsService;

  // ===========================
  // WebSocket 连接管理
  // ===========================

  useEffect(() => {
    // 建立连接（真实模式下 wsService 从 localStorage 自行读取 token）
    if (IS_MOCK_ENABLED) {
      mockWsService.connect();
    } else {
      wsService.connect();
    }

    // 监听连接状态变化
    const unsubStatus = ws.onStatus((connected) => {
      setConnected(connected);
    });

    // 监听流式消息块
    const unsubChunk = ws.on('message_chunk', (msg) => {
      const chunk = msg as WsMessageChunk;

      if (chunk.done) {
        // 流结束：将 buffer 写入消息，更新状态为 done
        finalizeStream(chunk.sessionId, chunk.messageId);
        setSessionSending(chunk.sessionId, false);
        useVisualizeStore.getState().setSessionRuntime(chunk.sessionId, {
          state: 'idle',
          detail: '本轮回复已完成',
          updatedAt: Date.now(),
          source: 'frontend',
          messageId: chunk.messageId,
        });
        // 更新会话的最后消息摘要
        const fullText = useChatStore.getState().streamingBuffer[chunk.messageId] ?? '';
        updateSession(chunk.sessionId, {
          lastMessage: fullText.slice(0, 40),
          lastMessageAt: Date.now(),
        });
      } else {
        // 中间块：初始化 AI 消息条目（仅第一块时），追加文本
        const existingMsgs = useChatStore.getState().messages[chunk.sessionId] ?? [];
        const exists = existingMsgs.some((m) => m.id === chunk.messageId);

        if (!exists) {
          // 首个 chunk：创建 streaming 状态的消息条目
          const aiMessage: Message = {
            id: chunk.messageId,
            sessionId: chunk.sessionId,
            role: 'assistant',
            contentType: 'text',
            content: { text: '' },
            status: 'streaming',
            timestamp: Date.now(),
          };
          addMessage(aiMessage);
        }

        appendStreamChunk(chunk.messageId, chunk.delta);
        useVisualizeStore.getState().setSessionRuntime(chunk.sessionId, {
          state: 'writing',
          detail: '正在生成回复内容',
          updatedAt: Date.now(),
          source: 'frontend',
          messageId: chunk.messageId,
        });
      }
    });

    // 监听卡片消息
    const unsubCard = ws.on('card', (msg) => {
      const cardMsg = msg as WsCardMessage;
      const cardMessage: Message = {
        id: cardMsg.messageId,
        sessionId: cardMsg.sessionId,
        role: 'assistant',
        contentType: 'card',
        content: cardMsg.card,
        status: 'done',
        timestamp: Date.now(),
      };
      addMessage(cardMessage);
      setSessionSending(cardMsg.sessionId, false);
      useVisualizeStore.getState().setSessionRuntime(cardMsg.sessionId, {
        state: 'idle',
        detail: '已返回交互卡片',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: cardMsg.messageId,
      });
      updateSession(cardMsg.sessionId, {
        lastMessage: '[卡片消息]',
        lastMessageAt: Date.now(),
      });
    });

    // 监听图表消息
    const unsubChart = ws.on('chart', (msg) => {
      const chartMsg = msg as WsChartMessage;
      const chartMessage: Message = {
        id: chartMsg.messageId,
        sessionId: chartMsg.sessionId,
        role: 'assistant',
        contentType: 'chart',
        content: chartMsg.chart,
        status: 'done',
        timestamp: Date.now(),
      };
      addMessage(chartMessage);
      setSessionSending(chartMsg.sessionId, false);
      useVisualizeStore.getState().setSessionRuntime(chartMsg.sessionId, {
        state: 'idle',
        detail: '已返回图表结果',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: chartMsg.messageId,
      });
      updateSession(chartMsg.sessionId, {
        lastMessage: '[图表]',
        lastMessageAt: Date.now(),
      });
    });

    // 监听会话创建成功
    const unsubSession = ws.on('session_created', (msg) => {
      const sessionMsg = msg as WsSessionCreated;
      const { session } = sessionMsg;

      // 检查是否已存在该 session（避免重复添加）
      const existing = useChatStore.getState().sessions.find((s) => s.id === session.id);
      if (!existing) {
        addSession({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          messageCount: 0,
        });
      }

      // 切换到新会话并更新路由
      setCurrentSession(session.id);
      navigate(`${ROUTES.CHAT}/${session.id}`, { replace: true });
    });

    // 监听错误消息
    const unsubError = ws.on('error', (msg) => {
      const errorMsg = msg as WsError;
      antMessage.error(errorMsg.message || '发生未知错误');
      if (errorMsg.sessionId) {
        setSessionSending(errorMsg.sessionId, false);
        useVisualizeStore.getState().setSessionRuntime(errorMsg.sessionId, {
          state: 'error',
          detail: errorMsg.message || '发生未知错误',
          updatedAt: Date.now(),
          source: 'frontend',
        });
      }
    });

    return () => {
      // 组件卸载时清理监听器（不断开 WS 连接，保持后台复用）
      unsubStatus();
      unsubChunk();
      unsubCard();
      unsubChart();
      unsubSession();
      unsubError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ===========================
  // 本地 Star-Office adapter 桥接
  // ===========================

  useEffect(() => {
    // 本地 adapter 需要覆盖两类场景：
    // 1. 纯本地 mock 页面
    // 2. 真实 Star-Office 本地联调模式
    //
    // 共同点都是：最终状态都由本地 Vite 中间件中的 adapter store 提供。
    const shouldUseLocalAdapter =
      IS_MOCK_ENABLED &&
      !STAR_OFFICE_URL &&
      (STAR_OFFICE_MOCK_ENABLED || STAR_OFFICE_REAL_DEV_ENABLED);

    if (!shouldUseLocalAdapter) {
      return;
    }

    const previousSignatureBySession = new Map<string, string>();

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

  // ===========================
  // 新建对话
  // ===========================

  const handleNewChat = useCallback(() => {
    const state = useChatStore.getState();
    const reusableSession = findReusableDraftSession(state.sessions, state.messages);

    // 若已经存在未发送任何消息的新会话，则直接复用，避免用户堆积多个空白会话。
    if (reusableSession) {
      state.setCurrentSession(reusableSession.id);
      navigate(`${ROUTES.CHAT}/${reusableSession.id}`);
      return;
    }

    const requestId = prefixedId('req');
    // 仅当不存在空白会话时，才请求服务端创建新的 session。
    ws.send({ type: 'create_session', requestId, title: '新对话' });
  }, [navigate, ws]);

  // ===========================
  // 路由参数与当前会话同步
  // ===========================

  useEffect(() => {
    if (routeSessionId) {
      // URL 带有 sessionId：切换到对应会话
      const target = sessions.find((s) => s.id === routeSessionId);
      if (target) {
        setCurrentSession(routeSessionId);
      }
    } else if (sessions.length > 0 && !currentSessionId) {
      // URL 无 sessionId 但有历史会话：自动切换到最近一个
      setCurrentSession(sessions[0].id);
      navigate(`${ROUTES.CHAT}/${sessions[0].id}`, { replace: true });
    }
  }, [routeSessionId, sessions, currentSessionId, setCurrentSession, navigate]);

  /**
   * 当新会话创建完成或切换到可复用空白会话后，将桥接草稿注入输入框。
   *
   * 这里不直接在 `handleSuggestion` 中写入，是因为首次点击时目标 session 尚未存在。
   */
  useEffect(() => {
    if (!pendingDraftInjection || !currentSessionId) return;

    setDraft(currentSessionId, pendingDraftInjection);
    setPendingDraftInjection(null);
  }, [pendingDraftInjection, currentSessionId, setDraft]);

  /**
   * 兼容从技能详情等入口通过 `?skill=` 打开对话页的场景。
   *
   * 行为约束：
   * - 有当前会话时直接预填到该会话
   * - 无当前会话时自动创建/复用会话，并在创建完成后注入草稿
   * - 注入完成后清理查询参数，避免刷新或重新聚焦时重复覆盖用户输入
   */
  useEffect(() => {
    const skillName = searchParams.get('skill')?.trim();
    if (!skillName) return;

    const nextDraft = `请介绍技能「${skillName}」，并告诉我如何在当前工作台中使用它。`;

    if (!currentSessionId) {
      // 如果已有会话但当前会话尚未同步到位，先等待路由同步逻辑完成，避免额外创建新会话。
      if (sessions.length > 0) {
        setPendingDraftInjection(nextDraft);
        return;
      }

      if (pendingDraftInjection !== nextDraft) {
        setPendingDraftInjection(nextDraft);
        handleNewChat();
      }
      return;
    }

    setDraft(currentSessionId, nextDraft);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('skill');
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    searchParams,
    currentSessionId,
    sessions.length,
    pendingDraftInjection,
    handleNewChat,
    setDraft,
    setSearchParams,
  ]);

  // ===========================
  // 向侧边栏注入会话列表
  // ===========================

  useEffect(() => {
    setExtraContent(<SessionList onNewChat={handleNewChat} />);
    return () => setExtraContent(null);
    // 每次 handleNewChat 引用变化时重新注入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setExtraContent]);

  // ===========================
  // 发送消息
  // ===========================

  const currentSessionSending = currentSessionId
    ? (sendingSessionIds[currentSessionId] ?? false)
    : false;

  const handleSend = useCallback(() => {
    const draft = currentSessionId ? (drafts[currentSessionId] ?? '') : '';
    const text = draft.trim();

    if (!text || !currentSessionId) return;
    if (currentSessionSending) return;

    const requestId = prefixedId('req');

    // 构建文件附件信息
    const files = pendingFiles.map((f) => ({
      fileId: f.fileId,
      fileName: f.file.name,
      fileType: f.file.type,
    }));

    // 乐观更新：立即在 UI 显示用户消息
    const userMsg: Message = {
      id: prefixedId('msg'),
      sessionId: currentSessionId,
      role: 'user',
      contentType: text ? 'text' : 'file',
      content: { text },
      status: 'done',
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // 更新会话摘要
    updateSession(currentSessionId, {
      lastMessage: text.slice(0, 40),
      lastMessageAt: Date.now(),
      messageCount: (messages[currentSessionId]?.length ?? 0) + 1,
    });

    // 清空输入框和文件列表
    setDraft(currentSessionId, '');
    setPendingFiles([]);

    // 发送 WebSocket 消息
    setSessionSending(currentSessionId, true);
    useVisualizeStore.getState().setSessionRuntime(currentSessionId, {
      state: 'researching',
      detail: '等待 OpenClaw 响应',
      updatedAt: Date.now(),
      source: 'frontend',
    });
    ws.send({
      type: 'user_message',
      sessionId: currentSessionId,
      requestId,
      content: { text, files: files.length > 0 ? files : undefined },
    });

    // 若是第一条消息，更新会话标题
    if ((messages[currentSessionId]?.length ?? 0) === 0) {
      updateSession(currentSessionId, {
        title: generateSessionTitle(text),
      });
    }
  }, [
    currentSessionId,
    currentSessionSending,
    drafts,
    pendingFiles,
    messages,
    addMessage,
    updateSession,
    setDraft,
    setSessionSending,
    ws,
  ]);

  // ===========================
  // 快捷提问
  // ===========================

  const handleSuggestion = useCallback(
    (text: string) => {
      if (!currentSessionId) {
        // 没有会话时，先记住待注入草稿，再创建/复用会话，避免用户需要点击第二次。
        setPendingDraftInjection(text);
        handleNewChat();
        return;
      }
      setDraft(currentSessionId, text);
    },
    [currentSessionId, handleNewChat, setDraft],
  );

  // ===========================
  // 卡片交互回传
  // ===========================

  /**
   * 用户操作卡片后，通过 WebSocket 发送 card_action 消息
   * @param cardId  - 被操作的卡片 ID
   * @param key     - 操作标识（button key / form submitKey）
   * @param value   - 操作值（按钮为 null，表单为字段键值对）
   * @param tag     - 操作来源类型
   */
  const handleCardAction = useCallback(
    (cardId: string, key: string, value: unknown, tag: 'button' | 'select' | 'form') => {
      if (!currentSessionId) return;
      const requestId = prefixedId('req');
      ws.send({
        type: 'card_action',
        sessionId: currentSessionId,
        requestId,
        cardId,
        action: { tag, key, value },
      });
    },
    [currentSessionId, ws],
  );

  /**
   * 将卡片置为过期状态（用户操作后禁用所有交互）
   * 通过 updateMessage 更新 store 中消息的 content.expired 字段
   */
  const handleCardExpire = useCallback(
    (messageId: string) => {
      if (!currentSessionId) return;
      const msgs = messages[currentSessionId] ?? [];
      const target = msgs.find((m) => m.id === messageId);
      if (!target || target.contentType !== 'card') return;

      // 将卡片内容的 expired 置为 true
      // 直接通过 getState() 调用，避免 ESLint exhaustive-deps 警告（Zustand 方法是稳定引用）
      const card = target.content as import('@/types/card').InteractiveCard;
      useChatStore.getState().updateMessage(currentSessionId, messageId, {
        content: { ...card, expired: true },
      });
    },
    [currentSessionId, messages],
  );

  // ===========================
  // 渲染
  // ===========================

  const currentMessages = currentSessionId ? (messages[currentSessionId] ?? []) : [];
  const currentDraft = currentSessionId ? (drafts[currentSessionId] ?? '') : '';
  const currentSession = currentSessionId
    ? (sessions.find((session) => session.id === currentSessionId) ?? null)
    : null;

  // 检查是否有消息正在流式传输
  const isStreaming =
    currentSessionSending && currentMessages.some((m) => m.status === 'streaming');

  const showWelcome = currentMessages.length === 0;
  /**
   * 将会话摘要压缩为简洁的工作台副标题。
   * `Graphite Console` 阶段有意弱化头部说明，因此这里只保留真正影响下一步操作的信息。
   */
  const stageSummary = showWelcome
    ? '从左侧档案架恢复历史协作，或直接在下方开始新的任务。'
    : currentRuntime?.detail || '围绕当前会话继续推进分析、写作、代码与执行动作。';
  const currentStateLabel = currentRuntime
    ? VISUALIZE_STATE_LABELS[currentRuntime.state]
    : '待命中';
  const isRuntimeBusy = isRuntimeActive(currentRuntime?.state);

  return (
    <div className={styles.container}>
      <div className={styles.chatColumn}>
        {/* 顶部改为极简 console bar，把空间优先让给中部主舞台和底部 dock。 */}
        <header className={styles.stageHeader}>
          <div className={styles.stageIdentity}>
            <div className={styles.titleRow}>
              <span className={styles.eyebrow}>Agent Console</span>
              <h1 className={styles.stageTitle}>{currentSession?.title ?? '新建会话'}</h1>
            </div>
            <p className={styles.stageSubtitle}>{stageSummary}</p>
          </div>

          <div className={styles.headerMeta} aria-label="会话摘要信息">
            <div
              className={styles.metaCard}
              data-running={isRuntimeBusy ? 'true' : 'false'}
              aria-label={`当前执行状态：${currentStateLabel}`}
            >
              <Loading3QuartersOutlined
                className={`${styles.metaIcon} ${isRuntimeBusy ? styles.metaIconSpinning : ''}`}
              />
              <span className={styles.metaValue}>{currentStateLabel}</span>
            </div>
            <div className={styles.metaCard}>
              <CommentOutlined className={styles.metaIcon} />
              <span className={styles.metaValue}>{currentMessages.length} 条消息</span>
            </div>
            <div className={styles.metaCard}>
              <ClockCircleOutlined className={styles.metaIcon} />
              <span className={styles.metaValue}>
                {currentSession
                  ? new Date(currentSession.createdAt).toLocaleDateString('zh-CN')
                  : '等待开始'}
              </span>
            </div>
          </div>
        </header>

        <div className={styles.workspace}>
          {/* 主舞台保持最大可视面积：欢迎态居中，对话态优先正文轨道。 */}
          <div className={styles.messageArea}>
            {showWelcome ? (
              <WelcomeScreen onSuggestionClick={handleSuggestion} />
            ) : (
              <MessageList
                messages={currentMessages}
                streamingBuffer={streamingBuffer}
                isStreaming={isStreaming}
                onCardAction={handleCardAction}
                onCardExpire={handleCardExpire}
              />
            )}
          </div>

          {/* 输入区重构为底部 dock，让发送动作稳定停靠在主舞台底部。 */}
          <div className={styles.inputArea}>
            {!currentSessionId ? (
              <div className={styles.noSessionTip}>点击左侧「新建对话」开始</div>
            ) : (
              <div className={styles.composerHint}>
                Enter 发送，Shift+Enter 换行。结果、图表与执行状态会继续沉淀到当前会话。
              </div>
            )}

            <MessageInput
              value={currentDraft}
              onChange={(v) => currentSessionId && setDraft(currentSessionId, v)}
              files={pendingFiles}
              onFilesChange={setPendingFiles}
              onSend={handleSend}
              disabled={!currentSessionId || currentSessionSending}
              placeholder={
                !currentSessionId
                  ? '请先新建一个对话...'
                  : '输入你的下一步目标、问题或要执行的动作...'
              }
            />
          </div>
        </div>
      </div>

      {isVisualizePanelOpen ? <VisualizePanel /> : null}
    </div>
  );
}
