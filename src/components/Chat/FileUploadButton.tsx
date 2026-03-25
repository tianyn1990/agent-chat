import { useRef, useState } from 'react';
import { Upload, Button, Tooltip, Modal } from 'antd';
import {
  PaperClipOutlined,
  CloseOutlined,
  FileOutlined,
  PictureOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
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
  /** 本地下载 URL（发送后用于继续下载原文件） */
  downloadUrl?: string;
}

interface FileUploadButtonProps {
  /** 当前已选文件列表 */
  files: SelectedFile[];
  /** 文件选择/变更回调 */
  onChange: (files: SelectedFile[]) => void;
  /** 是否禁用（例如当前没有可编辑会话） */
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
 * - 仅负责触发文件选择，预览列表由外层输入区独立承载
 * - 这样可以避免附件条目侵占正文输入区域
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

      /**
       * 为所有附件生成本地 object URL。
       *
       * 设计原因：
       * - 图片发送前后都需要支持大图预览和下载
       * - 非图片文件发送后也需要继续下载
       * - 统一在选择阶段生成 URL，后续消息渲染只消费稳定的数据结构
       */
      const downloadUrl = URL.createObjectURL(file);
      const selected: SelectedFile = { localId, file, fileId, downloadUrl };

      // 图片直接复用同一个 object URL 作为缩略图和大图源，避免重复创建 blob URL。
      if (file.type.startsWith('image/')) {
        selected.previewUrl = downloadUrl;
      }

      added.push(selected);
    });

    onChange([...files, ...added]);

    // 清空 input，允许重复选择同一文件
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* 隐藏的原生文件 input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        disabled={disabled}
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
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className={styles.previewItem}>
        {/* 图片附件允许在发送前直接点击查看大图；普通文件保持静态图标。 */}
        {isImage && file.previewUrl ? (
          <button
            type="button"
            className={`${styles.previewThumb} ${styles.previewThumbButton}`}
            onClick={() => setPreviewOpen(true)}
            aria-label={`预览图片 ${file.file.name}`}
          >
            <img src={file.previewUrl} alt={file.file.name} className={styles.thumbImg} />
          </button>
        ) : (
          <div className={styles.previewThumb}>
            <FileOutlined className={styles.fileIcon} />
          </div>
        )}

        {/* 文件名与大小 */}
        <div className={styles.previewInfo}>
          <span className={styles.previewName}>{file.file.name}</span>
          <span className={styles.previewSize}>{formatFileSize(file.file.size)}</span>
        </div>

        <div className={styles.previewActions}>
          {isImage && file.downloadUrl ? (
            <a
              href={file.downloadUrl}
              download={file.file.name}
              className={styles.inlineAction}
              aria-label={`下载图片 ${file.file.name}`}
            >
              <DownloadOutlined />
            </a>
          ) : null}

          {/* 移除按钮 */}
          <button
            className={styles.removeBtn}
            onClick={onRemove}
            aria-label={`移除 ${file.file.name}`}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {isImage && file.previewUrl ? (
        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={
            file.downloadUrl ? (
              <a
                href={file.downloadUrl}
                download={file.file.name}
                className={styles.previewDownload}
              >
                <DownloadOutlined />
                <span>下载图片</span>
              </a>
            ) : null
          }
          title={file.file.name}
          centered
          width="min(92vw, 1080px)"
          destroyOnHidden
        >
          <img src={file.previewUrl} alt={file.file.name} className={styles.previewModalImage} />
        </Modal>
      ) : null}
    </>
  );
}

interface FileAttachmentListProps {
  /** 已选文件列表 */
  files: SelectedFile[];
  /** 移除文件回调 */
  onRemove: (localId: string) => void;
}

/**
 * 输入区附件条带。
 *
 * 设计原因：
 * - 附件属于“待发送上下文”，但不应挤压正文输入宽度
 * - 单独放在输入区上方，既保留可见性，也能让 textarea 保持稳定可编辑面积
 */
export function FileAttachmentList({ files, onRemove }: FileAttachmentListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={styles.fileList} aria-label="已选附件列表">
      {files.map((file) => (
        <FilePreviewItem key={file.localId} file={file} onRemove={() => onRemove(file.localId)} />
      ))}
    </div>
  );
}

// 对外暴露 Upload 组件（供拖拽使用，目前为备用）
export { Upload, PictureOutlined };
