import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartRenderer from '@/components/Chart/ChartRenderer';
import type { ChartMessage } from '@/types/chart';

describe('ChartRenderer', () => {
  describe('table 类型', () => {
    it('渲染 TableChart 并显示列标题', async () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_001',
        chartType: 'table',
        payload: {
          columns: [
            { key: 'name', title: '姓名' },
            { key: 'score', title: '分数', dataType: 'number' },
          ],
          rows: [
            { name: '张三', score: 90 },
            { name: '李四', score: 85 },
          ],
        },
      };
      render(<ChartRenderer chart={chart} />);
      expect(await screen.findByText('姓名', undefined, { timeout: 3000 })).toBeInTheDocument();
      expect(await screen.findByText('分数', undefined, { timeout: 3000 })).toBeInTheDocument();
      expect(await screen.findByText('张三', undefined, { timeout: 3000 })).toBeInTheDocument();
    });

    it('渲染 TableChart 数据行', async () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_002',
        chartType: 'table',
        payload: {
          columns: [{ key: 'dept', title: '部门' }],
          rows: [{ dept: '研发部' }, { dept: '产品部' }],
        },
      };
      render(<ChartRenderer chart={chart} />);
      expect(await screen.findByText('研发部', undefined, { timeout: 3000 })).toBeInTheDocument();
      expect(await screen.findByText('产品部', undefined, { timeout: 3000 })).toBeInTheDocument();
    });
  });

  describe('image 类型', () => {
    it('渲染 ImageChart 并有图片元素', () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_003',
        chartType: 'image',
        payload: { url: 'https://example.com/image.png', alt: '示例图片' },
      };
      const { container } = render(<ChartRenderer chart={chart} />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('alt')).toBe('示例图片');
    });

    it('downloadable=true 时显示下载按钮', () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_004',
        chartType: 'image',
        payload: { url: 'https://example.com/image.png', downloadable: true },
      };
      render(<ChartRenderer chart={chart} />);
      expect(screen.getByText('下载')).toBeInTheDocument();
    });

    it('downloadable=false 时不显示下载按钮', () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_005',
        chartType: 'image',
        payload: { url: 'https://example.com/image.png', downloadable: false },
      };
      render(<ChartRenderer chart={chart} />);
      expect(screen.queryByText('下载')).toBeNull();
    });
  });

  describe('iframe 类型', () => {
    it('渲染 IframeChart 并有 iframe 元素', () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_006',
        chartType: 'iframe',
        payload: { url: 'https://example.com', height: 400 },
      };
      const { container } = render(<ChartRenderer chart={chart} />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute('src')).toBe('https://example.com');
    });
  });

  describe('未知类型', () => {
    it('未知 chartType 显示降级提示', () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_007',
        chartType: 'unknown_type' as ChartMessage['chartType'],
        payload: {},
      };
      render(<ChartRenderer chart={chart} />);
      expect(screen.getByText(/未支持的图表类型/)).toBeInTheDocument();
    });
  });

  describe('容器结构', () => {
    it('渲染外层 container 包裹层', async () => {
      const chart: ChartMessage = {
        type: 'chart',
        messageId: 'msg_008',
        chartType: 'table',
        payload: { columns: [], rows: [] },
      };
      const { container } = render(<ChartRenderer chart={chart} />);
      await screen.findByRole('table');
      expect(container.querySelector('[class*="container"]')).toBeInTheDocument();
    });
  });
});
