import { useRef } from 'react';
import { Upload, Button, Tooltip } from 'antd';
import { PaperClipOutlined, CloseOutlined, FileOutlined, PictureOutlined } from '@ant-design/icons';
import { formatFileSize } from '@/utils/format';
import { generateId } from '@/utils/id';
import styles from './FileUploadButton.module.less';

/** 已选文件（含本地预览 URL 和 Mock fileId） */
export interface SelectedFile {
  /** 本地唯一标识（非服务端 fileId） */
  localId: string;
  /** 原始 File 对象 */
  file: File;
  /** Mock 上传后的 fileId（真实场景替换为后端返回值） */
  fileId: string;
  /** 本地预览 URL（图片类型使用） */
  previewUrl?: string;
}

interface FileUploadButtonProps {
  /** 当前已选文件列表 */
  files: SelectedFile[];
  /** 文件选择/变更回调 */
  onChange: (files: SelectedFile[]) => void;
  /** 是否禁用（发送中） */
  disabled?: boolean;
}

/** 允许上传的文件类型 */
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/** 单文件最大 20MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * 文件上传按钮组件
 * - 点击或拖拽选择文件
 * - Mock 模式下直接生成 fileId，不调用真实上传接口
 * - 显示已选文件预览列表，支持逐个移除
 */
export default function FileUploadButton({ files, onChange, disabled }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /** 处理文件选择 */
  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const added: SelectedFile[] = [];

    Array.from(newFiles).forEach((file) => {
      // 文件类型校验
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return; // 跳过不支持的文件
      }
      // 文件大小校验
      if (file.size > MAX_FILE_SIZE) {
        return;
      }

      const localId = generateId();
      // Mock 模式：直接生成假 fileId（真实场景应调用 POST /api/upload 获取）
      const fileId = `mock_file_${localId}`;

      const selected: SelectedFile = { localId, file, fileId };

      // 图片类型生成本地预览 URL
      if (file.type.startsWith('image/')) {
        selected.previewUrl = URL.createObjectURL(file);
      }

      added.push(selected);
    });

    onChange([...files, ...added]);

    // 清空 input，允许重复选择同一文件
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  /** 移除指定文件 */
  const handleRemove = (localId: string) => {
    const target = files.find((f) => f.localId === localId);
    // 释放预览 URL，避免内存泄漏
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(files.filter((f) => f.localId !== localId));
  };

  return (
    <div className={styles.wrapper}>
      {/* 已选文件预览列表 */}
      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((f) => (
            <FilePreviewItem key={f.localId} file={f} onRemove={() => handleRemove(f.localId)} />
          ))}
        </div>
      )}

      {/* 隐藏的原生文件 input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* 附件按钮 */}
      <Tooltip title="上传文件（最大 20MB）" placement="top">
        <Button
          type="text"
          icon={<PaperClipOutlined />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={styles.uploadBtn}
          aria-label="上传文件"
        />
      </Tooltip>
    </div>
  );
}

// =============================
// 文件预览条目（内部组件）
// =============================

interface FilePreviewItemProps {
  file: SelectedFile;
  onRemove: () => void;
}

function FilePreviewItem({ file, onRemove }: FilePreviewItemProps) {
  const isImage = file.file.type.startsWith('image/');

  return (
    <div className={styles.previewItem}>
      {/* 文件缩略图或图标 */}
      <div className={styles.previewThumb}>
        {isImage && file.previewUrl ? (
          <img src={file.previewUrl} alt={file.file.name} className={styles.thumbImg} />
        ) : (
          <FileOutlined className={styles.fileIcon} />
        )}
      </div>

      {/* 文件名与大小 */}
      <div className={styles.previewInfo}>
        <span className={styles.previewName}>{file.file.name}</span>
        <span className={styles.previewSize}>{formatFileSize(file.file.size)}</span>
      </div>

      {/* 移除按钮 */}
      <button className={styles.removeBtn} onClick={onRemove} aria-label={`移除 ${file.file.name}`}>
        <CloseOutlined />
      </button>
    </div>
  );
}

// 对外暴露 Upload 组件（供拖拽使用，目前为备用）
export { Upload, PictureOutlined };
