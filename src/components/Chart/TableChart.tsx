import { useMemo } from 'react';
import { Table, Button, Tooltip, type TableColumnType, type TablePaginationConfig } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { TablePayload } from '@/types/chart';
import styles from './TableChart.module.less';

/**
 * 每行数据量对应的预估行高（px）
 * 用于计算自适应表格高度
 */
const ROW_HEIGHT = 40;
/** 表头高度 */
const HEADER_HEIGHT = 44;
/** 分页区高度 */
const PAGINATION_HEIGHT = 48;
/**
 * 表格最大高度（px）
 * 超过此高度时表格内部滚动，避免超出视口
 */
const MAX_TABLE_HEIGHT = 420;

interface TableChartProps {
  payload: TablePayload;
}

/**
 * 数据表格图表组件（基于 Ant Design Table）
 *
 * 高度策略：
 *   - 自适应行数：rows.length × ROW_HEIGHT + HEADER_HEIGHT
 *   - 不超过 MAX_TABLE_HEIGHT(420px)，超出时表格内部启用 y 轴滚动
 *   - 有分页时额外加上分页区高度
 *
 * 功能：
 *   - 数字列右对齐 + 百分比列自动格式化
 *   - sortable 列支持前端排序
 *   - exportable=true 时显示导出 CSV 按钮
 *   - 支持分页（可配置 pageSize）
 */
export default function TableChart({ payload }: TableChartProps) {
  const { columns, rows, options } = payload;

  const pageSize = options?.pageSize ?? 10;
  const hasPagination = (options?.pagination ?? false) && rows.length > pageSize;

  // ===========================
  // 计算自适应高度
  // ===========================
  const dataRowsVisible = hasPagination ? pageSize : rows.length;
  const contentHeight = dataRowsVisible * ROW_HEIGHT + HEADER_HEIGHT;
  const totalHeight = hasPagination ? contentHeight + PAGINATION_HEIGHT : contentHeight;
  // 超过最大高度时内部滚动
  const scrollY = totalHeight > MAX_TABLE_HEIGHT ? MAX_TABLE_HEIGHT - HEADER_HEIGHT : undefined;

  // ===========================
  // 构建 Ant Design 列配置
  // ===========================
  const antColumns = useMemo((): TableColumnType<Record<string, unknown>>[] => {
    return columns.map((col) => ({
      key: col.key,
      dataIndex: col.key,
      title: col.title,
      width: col.width,
      sorter: col.sortable
        ? (a: Record<string, unknown>, b: Record<string, unknown>) => {
            const va = a[col.key];
            const vb = b[col.key];
            // 数字类型按数值排序
            if (typeof va === 'number' && typeof vb === 'number') return va - vb;
            // 其他类型转字符串按字典序排序
            return String(va ?? '').localeCompare(String(vb ?? ''));
          }
        : undefined,
      // 数字列和百分比列右对齐
      align: col.dataType === 'number' || col.dataType === 'percent' ? 'right' : 'left',
      // 百分比列自动加 %
      render:
        col.dataType === 'percent'
          ? (val: unknown) => (typeof val === 'number' ? `${val}%` : String(val ?? ''))
          : undefined,
    }));
  }, [columns]);

  // 为每行数据添加 key（Ant Design Table 要求）
  const dataSource = useMemo(() => rows.map((row, idx) => ({ ...row, _key: idx })), [rows]);

  // 分页配置
  const pagination: TablePaginationConfig | false = hasPagination
    ? { pageSize, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }
    : false;

  // ===========================
  // 导出 CSV
  // ===========================
  const handleExportCSV = () => {
    // 构建 CSV header
    const header = columns.map((c) => `"${c.title}"`).join(',');
    // 构建每行数据
    const body = rows
      .map((row) =>
        columns
          .map((c) => {
            const val = row[c.key];
            // 字符串类型加引号，避免逗号问题
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : String(val ?? '');
          })
          .join(','),
      )
      .join('\n');

    const csv = `\uFEFF${header}\n${body}`; // \uFEFF BOM 保证 Excel 中文正常显示
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <Table<Record<string, unknown>>
        columns={antColumns}
        dataSource={dataSource}
        rowKey="_key"
        pagination={pagination}
        size="small"
        scroll={scrollY ? { y: scrollY } : undefined}
        className={styles.table}
      />

      {/* 导出按钮 */}
      {options?.exportable && (
        <div className={styles.toolbar}>
          <Tooltip title="导出 CSV">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={handleExportCSV}
              className={styles.toolBtn}
            >
              导出 CSV
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
