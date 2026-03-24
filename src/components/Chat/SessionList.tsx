import { useCallback } from 'react';
import { Button, Modal, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/useChatStore';
import SessionItem from './SessionItem';
import styles from './SessionList.module.less';

interface SessionListProps {
  /** 点击"新建对话"的回调 */
  onNewChat: () => void;
}

/**
 * 会话列表组件
 * 展示所有历史会话，支持新建、切换、重命名、删除操作
 */
export default function SessionList({ onNewChat }: SessionListProps) {
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const updateSession = useChatStore((s) => s.updateSession);
  const removeSession = useChatStore((s) => s.removeSession);

  /** 处理删除会话，需要二次确认 */
  const handleDelete = useCallback(
    (sessionId: string, title: string) => {
      Modal.confirm({
        title: '删除对话',
        content: `确定要删除「${title}」吗？删除后无法恢复。`,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => removeSession(sessionId),
        // 避免点击空白处误触 Modal 关闭逻辑
        maskClosable: false,
      });
    },
    [removeSession],
  );

  /** 处理重命名会话 */
  const handleRename = useCallback(
    (sessionId: string, newTitle: string) => {
      updateSession(sessionId, { title: newTitle });
    },
    [updateSession],
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
          新建对话
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
              onClick={() => setCurrentSession(session.id)}
              onRename={(newTitle) => handleRename(session.id, newTitle)}
              onDelete={() => handleDelete(session.id, session.title)}
            />
          ))
        )}
      </div>
    </div>
  );
}
