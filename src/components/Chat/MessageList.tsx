import { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/types/message';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ScrollToBottom from './ScrollToBottom';
import styles from './MessageList.module.less';

/** 距底部多少像素以内认为"用户在底部" */
const AT_BOTTOM_THRESHOLD = 120;

/** 各消息类型的预估高度（px）
 * 图表/卡片消息远高于普通文本，提前估算可大幅减少虚拟列表的位置修正次数，避免滚动抖动
 */
const ESTIMATED_HEIGHT_TEXT = 90;
const ESTIMATED_HEIGHT_CHART = 420;
const ESTIMATED_HEIGHT_CARD = 200;

interface MessageListProps {
  /** 当前所属会话 ID，用于在切换会话时重置滚动状态 */
  sessionId?: string | null;
  /** 消息列表 */
  messages: Message[];
  /** 流式文本缓冲（messageId → 累积文本） */
  streamingBuffer: Record<string, string>;
  /** 是否有消息正在流式传输（显示 TypingIndicator） */
  isStreaming: boolean;
  /** 是否处于“已发送但首个 delta 尚未到达”的等待阶段 */
  isAwaitingResponse?: boolean;
  /**
   * 卡片动作回调，透传给 MessageBubble
   * ChatPage 注入，通过 WS 回传服务端
   */
  onCardAction?: (
    cardId: string,
    key: string,
    value: unknown,
    tag: 'button' | 'select' | 'form',
  ) => void;
  /** 卡片过期回调，透传给 MessageBubble */
  onCardExpire?: (messageId: string) => void;
}

/**
 * 消息列表组件（虚拟滚动）
 * - 使用 @tanstack/react-virtual 虚拟化渲染，支持长对话流畅滚动
 * - 新消息到达时自动滚底（若用户已上滚则停止自动滚动，显示"↓ 新消息"按钮）
 * - 支持流式消息实时文本更新
 */
export default function MessageList({
  sessionId = null,
  messages,
  streamingBuffer,
  isStreaming,
  isAwaitingResponse = false,
  onCardAction,
  onCardExpire,
}: MessageListProps) {
  /**
   * 统一抽象“当前存在活跃助手反馈”。
   *
   * 设计原因：
   * - pending 与 streaming 对滚动跟随的要求一致，都是会持续增长的底部反馈
   * - 收敛成一个布尔值后，可以避免两套 effect 分支在后续维护时再次漂移
   */
  const hasLiveAssistantFeedback = isAwaitingResponse || isStreaming;
  const pendingAccessoryMessageId = isAwaitingResponse
    ? ([...messages].reverse().find((message) => message.role === 'user')?.id ?? null)
    : null;

  /** 实际承载消息滚动的视口 ref */
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  /** 用户是否已向上滚动（超出阈值，暂停自动滚底） */
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  /**
   * 同步保存用户是否已上滚。
   *
   * 设计原因：
   * - 流式回复期间会连续触发 effect
   * - React state 更新存在异步窗口，用户刚上滚时若仍读到旧值，会被自动滚底抢回去
   * - ref 可让滚动决策直接基于最新滚动位置，消除“我在上滚，列表还在往下吸”的抖动
   */
  const isUserScrolledUpRef = useRef(false);
  /** 是否有新消息未读（在非底部时收到新消息） */
  const [hasNewMessage, setHasNewMessage] = useState(false);

  /** 上一次消息数量，用于检测新消息到达 */
  const prevMsgCountRef = useRef(messages.length);
  /** 会话切换后的稳定滚底调度句柄 */
  const settleScrollTimerIdsRef = useRef<number[]>([]);

  // ===========================
  // 虚拟列表配置
  // ===========================

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollViewportRef.current,
    // 按消息类型给出贴近真实高度的初始估算值
    // 减少虚拟列表因测量修正导致的位置跳变（滚动抖动）
    estimateSize: (index) => {
      const msg = messages[index];
      if (!msg) return ESTIMATED_HEIGHT_TEXT;
      if (msg.contentType === 'chart') return ESTIMATED_HEIGHT_CHART;
      if (msg.contentType === 'card') return ESTIMATED_HEIGHT_CARD;
      return ESTIMATED_HEIGHT_TEXT;
    },
    overscan: 8, // 视口外上下各多渲染 8 条，减少快速滚动时的白屏和重测量
  });

  // ===========================
  // 滚动到底部
  // ===========================

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollViewportRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  /**
   * 在会话切换后补一次“稳定滚底”。
   *
   * 设计原因：
   * - 切换会话时，虚拟列表与图片/图表测量经常会在首帧后再次修正高度
   * - 仅首帧 `scrollToBottom` 可能停在接近底部但不是真正底部的位置
   * - 这里用两次短延迟补滚，确保内容完成布局后仍然落在最后一条消息
   */
  const scheduleSettleScrollToBottom = useCallback(() => {
    settleScrollTimerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });

    const timerIds = [0, 32].map((delayMs) =>
      window.setTimeout(() => {
        if (!isUserScrolledUpRef.current) {
          scrollToBottom('instant');
        }
      }, delayMs),
    );

    settleScrollTimerIdsRef.current = timerIds;
  }, [scrollToBottom]);

  // ===========================
  // 监听滚动位置，判断用户是否在底部
  // ===========================

  const handleScroll = useCallback(() => {
    const container = scrollViewportRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= AT_BOTTOM_THRESHOLD;

    isUserScrolledUpRef.current = !atBottom;
    setIsUserScrolledUp(!atBottom);

    // 用户回到底部后清除"新消息"标记
    if (atBottom) {
      setHasNewMessage(false);
    }
  }, []);

  // ===========================
  // 新消息到达时的处理逻辑
  // ===========================

  useEffect(() => {
    const newCount = messages.length;
    const oldCount = prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;

    if (newCount <= oldCount) return; // 没有新增消息（例如切换会话时重置）

    if (isUserScrolledUpRef.current) {
      // 用户已上滚：标记有新消息，不强制滚底
      setHasNewMessage(true);
    } else {
      /**
       * 用户仍位于底部时，新增消息直接瞬时跟随。
       *
       * 设计原因：
       * - 机器人刚进入 streaming 的第一拍，如果这里使用 smooth，会和用户随后的手动滚动竞争
       * - 改为 instant 可去掉过渡动画带来的“被拽一下”感
       */
      scrollToBottom('instant');
    }
  }, [messages.length, scrollToBottom]);

  // 流式消息更新时，若用户在底部则持续跟随
  useEffect(() => {
    if (hasLiveAssistantFeedback && !isUserScrolledUpRef.current) {
      scrollToBottom('instant');
    }
  }, [streamingBuffer, hasLiveAssistantFeedback, scrollToBottom]);

  /**
   * 会话切换后首批消息渲染完成时，再补一次稳定滚底。
   *
   * 设计原因：
   * - 历史消息通常在切会话后异步注入
   * - 若只在 `sessionId` 变化时滚动，容易因为内容尚未挂载完整而停在半中腰
   */
  useEffect(() => {
    if (!sessionId || messages.length === 0 || isUserScrolledUpRef.current) {
      return;
    }

    scheduleSettleScrollToBottom();
  }, [messages.length, scheduleSettleScrollToBottom, sessionId]);

  // 初次进入或切换会话时，立即滚底并清理旧会话遗留的滚动状态。
  useEffect(() => {
    scrollToBottom('instant');
    isUserScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    setHasNewMessage(false);
    prevMsgCountRef.current = messages.length;
    scheduleSettleScrollToBottom();
    return () => {
      settleScrollTimerIdsRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      settleScrollTimerIdsRef.current = [];
    };
  }, [messages.length, scheduleSettleScrollToBottom, scrollToBottom, sessionId]);

  return (
    <div className={styles.root}>
      <div ref={scrollViewportRef} className={styles.container} onScroll={handleScroll}>
        {/* 虚拟列表总高度撑开容器 */}
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {/* 仅渲染视口内的消息条目 */}
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            const streamingText = streamingBuffer[message.id];

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement} // 动态测量实际高度
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageBubble
                  message={message}
                  streamingText={streamingText}
                  pendingAccessory={message.id === pendingAccessoryMessageId}
                  onCardAction={onCardAction}
                  onCardExpire={onCardExpire}
                />
              </div>
            );
          })}
        </div>

        {/* AI 思考中动画（在最后一条消息之后显示） */}
        {isStreaming && (
          <div className={styles.typingWrapper}>
            <TypingIndicator mode="streaming" />
          </div>
        )}
      </div>

      {/* 回到底部按钮提升为舞台级 overlay，避免随着滚动内容一起移动。 */}
      <ScrollToBottom
        visible={isUserScrolledUp}
        hasNewMessage={hasNewMessage}
        onClick={() => {
          scrollToBottom();
          isUserScrolledUpRef.current = false;
          setIsUserScrolledUp(false);
          setHasNewMessage(false);
        }}
      />
    </div>
  );
}
