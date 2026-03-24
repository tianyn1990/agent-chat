import { useRef, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import FileUploadButton, { type SelectedFile } from './FileUploadButton';
import styles from './MessageInput.module.less';

interface MessageInputProps {
  /** 输入框当前值 */
  value: string;
  /** 输入变更回调 */
  onChange: (value: string) => void;
  /** 已选文件列表 */
  files: SelectedFile[];
  /** 文件变更回调 */
  onFilesChange: (files: SelectedFile[]) => void;
  /** 发送消息回调 */
  onSend: () => void;
  /** 是否禁用（AI 回复中/未连接） */
  disabled?: boolean;
  /** 占位文字 */
  placeholder?: string;
}

/** 单条消息最大字符数 */
const MAX_LENGTH = 4000;

/**
 * 消息输入框组件
 * - 多行文本输入，Enter 发送，Shift+Enter 换行
 * - 集成文件上传按钮
 * - 字数统计与超限提示
 * - 禁用态（AI 回复中）
 */
export default function MessageInput({
  value,
  onChange,
  files,
  onFilesChange,
  onSend,
  disabled,
  placeholder = '输入消息，Enter 发送，Shift+Enter 换行...',
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 发送前校验：非空且未超限 */
  const canSend = value.trim().length > 0 && value.length <= MAX_LENGTH && !disabled;

  /** 处理键盘事件：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSend) {
          onSend();
        }
      }
    },
    [canSend, onSend],
  );

  /** 动态调整文本框高度（最多 6 行） */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // 重置高度后再设为 scrollHeight，实现自动扩展
      const el = e.target;
      el.style.height = 'auto';
      const lineHeight = 22;
      const maxHeight = lineHeight * 6;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    },
    [onChange],
  );

  const isOverLimit = value.length > MAX_LENGTH;

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* 输入区域行：附件、文本和发送动作保持在同一条 dock 中，避免附件独占一行。 */}
      <div className={styles.inputRow}>
        {/* 文件上传按钮（含已选文件预览） */}
        <FileUploadButton files={files} onChange={onFilesChange} disabled={disabled} />

        {/* 多行文本输入框 */}
        <textarea
          ref={textareaRef}
          className={`${styles.textarea} ${isOverLimit ? styles.overLimit : ''}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={MAX_LENGTH + 100} // 允许稍微超过以便用户看到提示
          aria-label="消息输入框"
        />

        {/* 右侧操作区 */}
        <div className={styles.actions}>
          {/* 字数统计（接近限制时显示） */}
          {value.length > MAX_LENGTH * 0.8 && (
            <span className={`${styles.charCount} ${isOverLimit ? styles.charCountOver : ''}`}>
              {value.length}/{MAX_LENGTH}
            </span>
          )}

          {/* 发送按钮 */}
          <Tooltip
            title={
              disabled
                ? 'AI 回复中，请稍候...'
                : isOverLimit
                  ? `消息过长（最多 ${MAX_LENGTH} 字）`
                  : 'Enter 发送'
            }
            placement="top"
          >
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!canSend}
              onClick={onSend}
              className={styles.sendBtn}
              aria-label="发送消息"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
