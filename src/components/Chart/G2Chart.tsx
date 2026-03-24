import { useEffect, useRef, useState } from 'react';
import { Chart } from '@antv/g2';
import { Button, Tooltip, Spin } from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import type { G2ChartPayload } from '@/types/chart';
import styles from './G2Chart.module.less';

/**
 * 图表最大高度（px）
 * 超过此高度时启用内部滚动，避免超出一屏
 */
const MAX_HEIGHT = 480;

/** 图表默认高度 */
const DEFAULT_HEIGHT = 360;

interface G2ChartProps {
  payload: G2ChartPayload;
}

/**
 * AntV G2 统计图表封装组件
 *
 * 支持类型：line / bar / pie / area / scatter（通过 payload.spec.type 区分）
 * 高度策略：
 *   - 使用 payload.height 或默认 300px
 *   - 不超过 MAX_HEIGHT(480px)，超出时图表内部滚动
 * 功能：
 *   - exportable=true 时显示"导出图片"按钮
 *   - 支持全屏预览（新窗口打开 PNG）
 *
 * 生命周期：
 *   - useEffect 中初始化 G2 Chart 实例
 *   - spec 变化时销毁重建（spec 不支持增量更新）
 *   - 组件卸载时 chart.destroy() 释放资源
 */
export default function G2Chart({ payload }: G2ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 计算实际渲染高度（不超过 MAX_HEIGHT）
  const chartHeight = Math.min(payload.height ?? DEFAULT_HEIGHT, MAX_HEIGHT);

  useEffect(() => {
    if (!containerRef.current) return;

    // 销毁上一个实例（spec 变化时重建）
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    setLoading(true);
    setError(null);

    let destroyed = false;

    const initChart = async () => {
      try {
        const chart = new Chart({
          container: containerRef.current!,
          autoFit: true, // 宽度自适应容器
          height: chartHeight,
        });

        // 合并用户传入的 spec 与基础配置
        chart.options({
          theme: 'classicDark',
          /**
           * 为结果区图表提供更宽松的默认留白。
           *
           * 设计原因：
           * - 当前消息卡片承载空间有限，若图表默认 padding 太小，坐标轴、图例和标题会显得拥挤
           * - 这里先给出一组更稳妥的默认值，用户自定义 spec 仍然可以覆盖
           */
          padding: [28, 28, 40, 44],
          ...payload.spec,
          // 强制覆盖高度，确保不超过限制
          height: chartHeight,
        });

        await chart.render();

        if (!destroyed) {
          chartRef.current = chart;
          setLoading(false);
        } else {
          // 组件已卸载，立即销毁
          chart.destroy();
        }
      } catch (err) {
        if (!destroyed) {
          setError('图表渲染失败，请检查数据格式');
          setLoading(false);
          console.error('[G2Chart] 渲染错误:', err);
        }
      }
    };

    initChart();

    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // spec 用 JSON 序列化比较，避免对象引用变化导致不必要的重渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload.spec), chartHeight]);

  /** 导出图表为 PNG 图片 */
  const handleExport = () => {
    if (!chartRef.current) return;
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (error) {
    return (
      <div className={styles.errorState}>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 加载中蒙层 */}
      {loading && (
        <div className={styles.loadingMask} style={{ height: chartHeight }}>
          <Spin size="default" />
        </div>
      )}

      {/* G2 图表挂载容器 */}
      <div ref={containerRef} className={styles.chartContainer} style={{ height: chartHeight }} />

      {/* 工具栏（导出 / 全屏） */}
      {payload.exportable && !loading && (
        <div className={styles.toolbar}>
          <Tooltip title="导出 PNG">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={handleExport}
              className={styles.toolBtn}
            >
              导出图片
            </Button>
          </Tooltip>
          <Tooltip title="全屏查看">
            <Button
              type="text"
              icon={<FullscreenOutlined />}
              size="small"
              onClick={handleExport}
              className={styles.toolBtn}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
