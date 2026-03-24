// ===========================
// 图表消息类型定义
// ===========================

/** 图片类型 */
export interface ImagePayload {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  /** 是否支持下载 */
  downloadable?: boolean;
}

/** S2 表格列定义 */
export interface TableColumn {
  key: string;
  title: string;
  dataType?: 'text' | 'number' | 'date' | 'percent';
  width?: number;
  sortable?: boolean;
}

/** S2 表格类型 */
export interface TablePayload {
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  options?: {
    pagination?: boolean;
    pageSize?: number;
    /** 支持导出 CSV */
    exportable?: boolean;
    /** 显示合计行 */
    totals?: boolean;
  };
}

/** G2 通用图表（折线/柱状/饼图/面积/散点等） */
export interface G2ChartPayload {
  /** AntV G2 Spec 配置，直接传入 G2 渲染 */
  spec: Record<string, unknown>;
  /** 图表高度，默认 300 */
  height?: number;
  /** 是否支持导出图片 */
  exportable?: boolean;
}

/** iframe 嵌入（方案 B 备选） */
export interface IframePayload {
  url: string;
  height?: number;
  allowFullscreen?: boolean;
}

/** 图表类型 */
export type ChartType = 'image' | 'table' | 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'iframe';

/** 图表消息体 */
export interface ChartMessage {
  type: 'chart';
  messageId: string;
  chartType: ChartType;
  payload: ImagePayload | TablePayload | G2ChartPayload | IframePayload;
}
