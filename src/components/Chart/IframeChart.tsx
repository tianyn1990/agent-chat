import { useState } from 'react';
import { Spin, Button, Tooltip } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import type { IframePayload } from '@/types/chart';
import styles from './IframeChart.module.less';

/**
 * iframe 嵌入默认高度（px）
 */
const DEFAULT_HEIGHT = 400;
/**
 * iframe 最大高度（px）
 * 超过此高度时使用 MAX_HEIGHT，避免超出视口
 */
const MAX_HEIGHT = 560;
/** 全屏模式下的高度（80vh） */
const FULLSCREEN_HEIGHT = '80vh';

interface IframeChartProps {
  payload: IframePayload;
}

/**
 * iframe 嵌入图表组件
 *
 * 适用于无法用 G2/S2 渲染的外部可视化页面（方案 B）
 * 高度策略：
 *   - 使用 payload.height 或默认 400px
 *   - 不超过 MAX_HEIGHT(560px)
 *   - 支持全屏模式（高度切换至 80vh）
 * 功能：
 *   - iframe 加载中显示 loading 状态
 *   - allowFullscreen=true 时显示全屏切换按钮
 */
export default function IframeChart({ payload }: IframeChartProps) {
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 计算实际高度（不超过 MAX_HEIGHT）
  const baseHeight = Math.min(payload.height ?? DEFAULT_HEIGHT, MAX_HEIGHT);
  const displayHeight = isFullscreen ? FULLSCREEN_HEIGHT : baseHeight;

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* 工具栏 */}
      {payload.allowFullscreen && (
        <div className={styles.toolbar}>
          <Tooltip title={isFullscreen ? '退出全屏' : '全屏查看'}>
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              size="small"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={styles.toolBtn}
            />
          </Tooltip>
        </div>
      )}

      {/* iframe 容器 */}
      <div className={styles.iframeWrapper} style={{ height: displayHeight }}>
        {/* 加载中蒙层 */}
        {loading && (
          <div className={styles.loadingMask}>
            <Spin size="default" />
            <span className={styles.loadingText}>加载中...</span>
          </div>
        )}

        <iframe
          src={payload.url}
          className={styles.iframe}
          onLoad={() => setLoading(false)}
          // 出于安全考虑，限制 iframe 权限
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="嵌入内容"
        />
      </div>
    </div>
  );
}
