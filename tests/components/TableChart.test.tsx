import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TableChart from '@/components/Chart/TableChart';
import type { TablePayload } from '@/types/chart';

describe('TableChart', () => {
  const basePayload: TablePayload = {
    columns: [
      { key: 'name', title: '姓名' },
      { key: 'score', title: '分数', dataType: 'number', sortable: true },
      { key: 'rate', title: '通过率', dataType: 'percent' },
    ],
    rows: [
      { name: '张三', score: 90, rate: 95 },
      { name: '李四', score: 85, rate: 88 },
      { name: '王五', score: 92, rate: 100 },
    ],
  };

  describe('基础渲染', () => {
    it('渲染列标题', () => {
      render(<TableChart payload={basePayload} />);
      expect(screen.getByText('姓名')).toBeInTheDocument();
      expect(screen.getByText('分数')).toBeInTheDocument();
      expect(screen.getByText('通过率')).toBeInTheDocument();
    });

    it('渲染数据行', () => {
      render(<TableChart payload={basePayload} />);
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
      expect(screen.getByText('王五')).toBeInTheDocument();
    });

    it('百分比列数据自动加 % 后缀', () => {
      render(<TableChart payload={basePayload} />);
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });
  });

  describe('导出 CSV', () => {
    it('exportable=true 时显示导出按钮', () => {
      const payload: TablePayload = { ...basePayload, options: { exportable: true } };
      render(<TableChart payload={payload} />);
      expect(screen.getByText('导出 CSV')).toBeInTheDocument();
    });

    it('exportable=false 时不显示导出按钮', () => {
      const payload: TablePayload = { ...basePayload, options: { exportable: false } };
      render(<TableChart payload={payload} />);
      expect(screen.queryByText('导出 CSV')).toBeNull();
    });

    it('点击导出 CSV 会触发下载', () => {
      // Mock URL.createObjectURL 和 URL.revokeObjectURL
      const createObjectURL = vi.fn(() => 'blob:mock');
      const revokeObjectURL = vi.fn();
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;

      // Mock click 防止实际触发
      const clickMock = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = clickMock;
        }
        return el;
      });

      const payload: TablePayload = { ...basePayload, options: { exportable: true } };
      render(<TableChart payload={payload} />);
      fireEvent.click(screen.getByText('导出 CSV'));

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

      vi.restoreAllMocks();
    });
  });

  describe('空数据', () => {
    it('空行数据不崩溃', () => {
      const payload: TablePayload = {
        columns: [{ key: 'name', title: '姓名' }],
        rows: [],
      };
      const { container } = render(<TableChart payload={payload} />);
      expect(container.querySelector('.ant-table')).toBeInTheDocument();
    });

    it('无列时不崩溃', () => {
      const payload: TablePayload = { columns: [], rows: [] };
      const { container } = render(<TableChart payload={payload} />);
      expect(container.querySelector('.ant-table')).toBeInTheDocument();
    });
  });
});
