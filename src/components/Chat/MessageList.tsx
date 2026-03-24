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
  /** 消息列表 */
  messages: Message[];
  /** 流式文本缓冲（messageId → 累积文本） */
  streamingBuffer: Record<string, string>;
  /** 是否有消息正在流式传输（显示 TypingIndicator） */
  isStreaming: boolean;
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
  messages,
  streamingBuffer,
  isStreaming,
  onCardAction,
  onCardExpire,
}: MessageListProps) {
  /** 外层滚动容器 ref */
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /** 用户是否已向上滚动（超出阈值，暂停自动滚底） */
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  /** 是否有新消息未读（在非底部时收到新消息） */
  const [hasNewMessage, setHasNewMessage] = useState(false);

  /** 上一次消息数量，用于检测新消息到达 */
  const prevMsgCountRef = useRef(messages.length);

  // ===========================
  // 虚拟列表配置
  // ===========================

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
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
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  // ===========================
  // 监听滚动位置，判断用户是否在底部
  // ===========================

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= AT_BOTTOM_THRESHOLD;

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

    if (isUserScrolledUp) {
      // 用户已上滚：标记有新消息，不强制滚底
      setHasNewMessage(true);
    } else {
      // 用户在底部：自动滚底
      scrollToBottom();
    }
  }, [messages.length, isUserScrolledUp, scrollToBottom]);

  // 流式消息更新时，若用户在底部则持续跟随
  useEffect(() => {
    if (isStreaming && !isUserScrolledUp) {
      scrollToBottom('instant');
    }
  }, [streamingBuffer, isStreaming, isUserScrolledUp, scrollToBottom]);

  // 初次进入会话，立即滚底（不需要动画）
  useEffect(() => {
    scrollToBottom('instant');
    setIsUserScrolledUp(false);
    setHasNewMessage(false);
    prevMsgCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在首次挂载时执行

  return (
    <div ref={scrollContainerRef} className={styles.container} onScroll={handleScroll}>
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
          <TypingIndicator />
        </div>
      )}

      {/* 回到底部浮动按钮 */}
      <ScrollToBottom
        visible={isUserScrolledUp}
        hasNewMessage={hasNewMessage}
        onClick={() => {
          scrollToBottom();
          setIsUserScrolledUp(false);
          setHasNewMessage(false);
        }}
      />
    </div>
  );
}
