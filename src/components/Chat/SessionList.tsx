import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import { ROUTES } from '@/constants';
import SessionItem from './SessionItem';
import styles from './SessionList.module.less';

interface SessionListProps {
  /** 点击"新建对话"的回调 */
  onNewChat: () => void;
  /** 删除会话时的外部处理器。 */
  onDeleteSession?: (sessionId: string, title: string) => Promise<void> | void;
  /** 重命名会话时的外部处理器。 */
  onRenameSession?: (sessionId: string, newTitle: string) => Promise<void> | void;
}

/**
 * 会话列表组件
 * 展示所有历史会话，支持新建、切换、重命名、删除操作
 */
export default function SessionList({
  onNewChat,
  onDeleteSession,
  onRenameSession,
}: SessionListProps) {
  const navigate = useNavigate();
  const sessions = useChatStore((s) => s.sessions);
  const messages = useChatStore((s) => s.messages);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const updateSession = useChatStore((s) => s.updateSession);
  const removeSession = useChatStore((s) => s.removeSession);
  const hasReusableDraftSession = sessions.some(
    (session) => (messages[session.id] ?? []).length === 0,
  );

  /** 处理删除会话，需要二次确认 */
  const handleDelete = useCallback(
    (sessionId: string, title: string) => {
      Modal.confirm({
        title: '删除对话',
        content: `确定要删除「${title}」吗？删除后无法恢复。`,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          if (onDeleteSession) {
            await onDeleteSession(sessionId, title);
            return;
          }

          removeSession(sessionId);
        },
        // 避免点击空白处误触 Modal 关闭逻辑
        maskClosable: false,
      });
    },
    [onDeleteSession, removeSession],
  );

  /** 处理重命名会话 */
  const handleRename = useCallback(
    (sessionId: string, newTitle: string) => {
      if (onRenameSession) {
        void onRenameSession(sessionId, newTitle);
        return;
      }

      updateSession(sessionId, { title: newTitle });
    },
    [onRenameSession, updateSession],
  );

  return (
    <div className={styles.container}>
      {/* 新建对话按钮 */}
      <div className={styles.newBtnWrapper}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={onNewChat}
          className={styles.newBtn}
        >
          {hasReusableDraftSession ? '继续新对话' : '新建对话'}
        </Button>
      </div>

      {/* 会话列表 */}
      <div className={styles.list}>
        {sessions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span className={styles.emptyText}>暂无对话</span>}
            className={styles.empty}
          />
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onClick={() => {
                setCurrentSession(session.id);
                navigate(`${ROUTES.CHAT}/${session.id}`);
              }}
              onRename={(newTitle) => handleRename(session.id, newTitle)}
              onDelete={() => handleDelete(session.id, session.title)}
            />
          ))
        )}
      </div>
    </div>
  );
}
