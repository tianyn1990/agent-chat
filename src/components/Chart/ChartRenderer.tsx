import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import type {
  ChartMessage,
  ImagePayload,
  TablePayload,
  G2ChartPayload,
  IframePayload,
} from '@/types/chart';
import ImageChart from './ImageChart';
import IframeChart from './IframeChart';
import styles from './ChartRenderer.module.less';

/**
 * G2 统计图表懒加载
 * G2 体积较大（~600KB），懒加载避免影响首屏速度
 */
const G2Chart = lazy(() => import('./G2Chart'));
const TableChart = lazy(() => import('./TableChart'));

/** G2 支持的图表类型集合 */
const G2_CHART_TYPES = new Set(['line', 'bar', 'pie', 'area', 'scatter']);

interface ChartRendererProps {
  /** 图表消息体 */
  chart: ChartMessage;
}

/**
 * 图表渲染入口组件
 *
 * 根据 chart.chartType 分发到对应的子渲染组件：
 * - image  → ImageChart（Ant Design Image，支持预览）
 * - table  → TableChart（Ant Design Table，支持排序/分页/导出 CSV）
 * - line/bar/pie/area/scatter → G2Chart（AntV G2，懒加载）
 * - iframe → IframeChart（iframe 嵌入，支持全屏）
 *
 * 非法格式时显示错误占位，不抛出异常，保证消息列表不崩溃
 */
export default function ChartRenderer({ chart }: ChartRendererProps) {
  return <div className={styles.container}>{renderChart(chart)}</div>;
}

function renderChart(chart: ChartMessage) {
  const { chartType, payload } = chart;

  // G2 统计图（line / bar / pie / area / scatter）
  if (G2_CHART_TYPES.has(chartType)) {
    return (
      <Suspense
        fallback={
          <div className={styles.loading}>
            <Spin tip="图表加载中..." />
          </div>
        }
      >
        <G2Chart payload={payload as G2ChartPayload} />
      </Suspense>
    );
  }

  switch (chartType) {
    case 'image':
      return <ImageChart payload={payload as ImagePayload} />;

    case 'table':
      return (
        <Suspense
          fallback={
            <div className={styles.loading}>
              <Spin tip="表格加载中..." />
            </div>
          }
        >
          <TableChart payload={payload as TablePayload} />
        </Suspense>
      );

    case 'iframe':
      return <IframeChart payload={payload as IframePayload} />;

    default:
      // 未知图表类型：显示降级占位，不崩溃
      return (
        <div className={styles.unknown}>
          <span>未支持的图表类型：{chartType}</span>
        </div>
      );
  }
}
