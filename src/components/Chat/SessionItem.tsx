import { useState, useRef, useEffect } from 'react';
import { Input, Dropdown, type MenuProps, type InputRef } from 'antd';
import { EditOutlined, DeleteOutlined, EllipsisOutlined, MessageOutlined } from '@ant-design/icons';
import type { Session } from '@/types/session';
import { fromNow } from '@/utils/format';
import styles from './SessionItem.module.less';

interface SessionItemProps {
  /** 会话数据 */
  session: Session;
  /** 是否为当前激活会话 */
  isActive: boolean;
  /** 点击切换会话 */
  onClick: () => void;
  /** 重命名确认回调 */
  onRename: (newTitle: string) => void;
  /** 删除回调 */
  onDelete: () => void;
}

/**
 * 会话列表单条目组件
 * 支持点击切换、双击重命名、右侧菜单（重命名/删除）
 */
export default function SessionItem({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
}: SessionItemProps) {
  /** 是否处于内联重命名编辑模式 */
  const [isEditing, setIsEditing] = useState(false);
  /** 编辑中的临时标题 */
  const [editTitle, setEditTitle] = useState(session.title);
  /** 是否显示操作菜单按钮（hover 状态） */
  const [isHovered, setIsHovered] = useState(false);
  /** Ant Design Input 组件 ref（类型为 InputRef） */
  const inputRef = useRef<InputRef>(null);

  /** 进入编辑状态时自动聚焦并全选文本 */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // InputRef 暴露 input 属性指向底层 HTMLInputElement
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /** 开始重命名 */
  const handleStartRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditTitle(session.title);
    setIsEditing(true);
  };

  /** 确认重命名 */
  const handleConfirmRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  /** 按键处理：Enter 确认，Escape 取消 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmRename();
    } else if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  /** 右侧下拉菜单配置 */
  const menuItems: MenuProps['items'] = [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleStartRename();
      },
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onDelete();
      },
    },
  ];

  return (
    <div
      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      onClick={isEditing ? undefined : onClick}
      onDoubleClick={handleStartRename}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 会话图标 */}
      <span className={styles.icon}>
        <MessageOutlined />
      </span>

      {/* 标题区：普通状态显示文本，编辑状态显示输入框 */}
      <div className={styles.titleArea}>
        {isEditing ? (
          <Input
            ref={inputRef}
            size="small"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleConfirmRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={styles.renameInput}
            maxLength={50}
          />
        ) : (
          <>
            <div className={styles.metaRow}>
              <span className={styles.title}>{session.title}</span>
              {session.lastMessageAt ? (
                <span className={styles.updatedAt}>{fromNow(session.lastMessageAt)}</span>
              ) : null}
            </div>
            {/* 最后一条消息摘要 */}
            {session.lastMessage && (
              <span className={styles.lastMessage}>{session.lastMessage}</span>
            )}
          </>
        )}
      </div>

      {/* 操作菜单按钮：hover 或激活时显示 */}
      {!isEditing && (isHovered || isActive) && (
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ minWidth: 120 }}
        >
          <button className={styles.menuBtn} onClick={(e) => e.stopPropagation()}>
            <EllipsisOutlined />
          </button>
        </Dropdown>
      )}
    </div>
  );
}
