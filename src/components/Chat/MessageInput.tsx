import { useRef, useCallback, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import FileUploadButton, { FileAttachmentList, type SelectedFile } from './FileUploadButton';
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
  /** 是否暂时禁止提交（例如当前会话仍在处理中） */
  sendDisabled?: boolean;
  /** 占位文字 */
  placeholder?: string;
  /** 触发输入框恢复焦点的信号 */
  focusKey?: string | number;
}

/** 单条消息最大字符数 */
const MAX_LENGTH = 4000;
/** 输入框单行基准高度 */
const TEXTAREA_LINE_HEIGHT = 22;
/** 输入框最多展示 6 行 */
const MAX_VISIBLE_LINES = 6;

/**
 * 统一同步输入框高度。
 *
 * 设计原因：
 * - 高度必须跟随当前草稿值，而不是残留在某次 DOM 操作后的内联样式里
 * - 发送后、切换会话后和草稿注入后都需要走同一套归一逻辑
 */
function syncTextareaHeight(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;

  textarea.style.height = 'auto';
  const maxHeight = TEXTAREA_LINE_HEIGHT * MAX_VISIBLE_LINES;
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, TEXTAREA_LINE_HEIGHT), maxHeight);
  textarea.style.height = `${nextHeight}px`;
}

/**
 * 消息输入框组件
 * - 多行文本输入，Enter 发送，Shift+Enter 换行
 * - 集成文件上传按钮
 * - 字数统计与超限提示
 * - 区分“不可编辑”和“可编辑但不可发送”两种状态
 */
export default function MessageInput({
  value,
  onChange,
  files,
  onFilesChange,
  onSend,
  disabled,
  sendDisabled = false,
  placeholder = '输入消息，Enter 发送，Shift+Enter 换行…',
  focusKey,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * 记录 IME composition 状态。
   *
   * 设计原因：
   * - 中文输入法在候选词未确认时也会触发 Enter
   * - 仅依赖 `nativeEvent.isComposing` 在部分浏览器中不稳定
   * - 额外保留一个 ref，可避免拼音串被误当成正式消息发送
   */
  const isComposingRef = useRef(false);
  const isEditable = !disabled;

  /** 发送前校验：非空、未超限、当前允许提交。 */
  const canSend =
    (value.trim().length > 0 || files.length > 0) &&
    value.length <= MAX_LENGTH &&
    isEditable &&
    !sendDisabled;

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [value]);

  useEffect(() => {
    if (!isEditable) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    // 焦点恢复只由明确的上层信号驱动，避免每次渲染都抢占用户当前操作。
    const rafId = window.requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      const caret = textarea.value.length;
      textarea.setSelectionRange(caret, caret);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [focusKey, isEditable]);

  /** 处理键盘事件：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const nativeEvent = e.nativeEvent as KeyboardEvent & {
        isComposing?: boolean;
        keyCode?: number;
      };

      // IME 组合输入期间，Enter 只用于确认候选词，绝不能提前发送消息。
      if (nativeEvent.isComposing || nativeEvent.keyCode === 229 || isComposingRef.current) {
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && canSend) {
        e.preventDefault();
        onSend();
      }
    },
    [canSend, onSend],
  );

  /** 标记进入 IME 组合输入阶段，防止拼音未确认时误发送。 */
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  /** 候选词确认后再恢复普通 Enter 发送语义。 */
  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  /** 动态调整文本框高度（最多 6 行） */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      syncTextareaHeight(e.target);
    },
    [onChange],
  );

  const isOverLimit = value.length > MAX_LENGTH;

  /**
   * 移除附件时同时释放预览 URL，避免在长对话里残留无用的 blob 引用。
   */
  const handleRemoveFile = useCallback(
    (localId: string) => {
      const target = files.find((file) => file.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      if (target?.downloadUrl && target.downloadUrl !== target.previewUrl) {
        URL.revokeObjectURL(target.downloadUrl);
      }
      onFilesChange(files.filter((file) => file.localId !== localId));
    },
    [files, onFilesChange],
  );

  return (
    <div className={`${styles.container} ${!isEditable ? styles.disabled : ''}`}>
      {/* 附件条带独立于正文输入区，避免已选文件持续挤压 textarea 可编辑宽度。 */}
      <FileAttachmentList files={files} onRemove={handleRemoveFile} />

      {/* 输入区域行：保留上传入口、正文输入和发送动作三段式 dock。 */}
      <div className={styles.inputRow}>
        {/* 文件上传按钮在“处理中”阶段仍可使用，便于用户提前准备下一条消息。 */}
        <FileUploadButton files={files} onChange={onFilesChange} disabled={!isEditable} />

        {/* 多行文本输入框 */}
        <textarea
          ref={textareaRef}
          className={`${styles.textarea} ${isOverLimit ? styles.overLimit : ''}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={!isEditable}
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
              !isEditable
                ? '请先新建一个对话'
                : sendDisabled
                  ? 'OpenClaw 回复中，可继续输入，完成后再发送'
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
