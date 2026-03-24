import { Image, Button, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ImagePayload } from '@/types/chart';
import styles from './ImageChart.module.less';

interface ImageChartProps {
  payload: ImagePayload;
}

/**
 * 图片类型图表组件
 * 使用 Ant Design Image 组件渲染，支持：
 * - 点击预览放大
 * - downloadable=true 时显示下载按钮
 * 高度自适应图片比例，最大高度 60vh 避免撑满屏幕
 */
export default function ImageChart({ payload }: ImageChartProps) {
  /** 下载图片 */
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = payload.url;
    link.download = payload.alt ?? 'image';
    link.target = '_blank';
    link.click();
  };

  return (
    <div className={styles.container}>
      <Image
        src={payload.url}
        alt={payload.alt ?? '图表图片'}
        loading="lazy"
        style={{
          maxWidth: '100%',
          maxHeight: '60vh',
          width: payload.width ? payload.width : 'auto',
          height: payload.height ? payload.height : 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
        className={styles.image}
        preview={{
          // 预览时不限制尺寸
          mask: <span className={styles.previewMask}>点击预览</span>,
        }}
      />

      {/* 下载按钮（可选） */}
      {payload.downloadable && (
        <div className={styles.toolbar}>
          <Tooltip title="下载图片">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={handleDownload}
              className={styles.toolBtn}
            >
              下载
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
