import type { ReactElement } from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MessageBubble from '@/components/Chat/MessageBubble';
import type { Message } from '@/types/message';

/** 创建测试用消息对象 */
function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg_001',
    sessionId: 'session_001',
    role: 'user',
    contentType: 'text',
    content: { text: '测试消息' },
    status: 'done',
    timestamp: new Date('2024-01-15 10:30:00').getTime(),
    ...overrides,
  };
}

/**
 * 为消息气泡测试统一补齐路由上下文。
 *
 * 说明：
 * - 当前 AI 消息会渲染消息操作区，其中依赖 `useNavigate`
 * - 因此测试环境需要始终提供最小 Router 包装
 */
function render(ui: ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
});

afterAll(() => {
  window.matchMedia = originalMatchMedia;
});

describe('MessageBubble', () => {
  describe('文本消息', () => {
    it('渲染用户文本消息', () => {
      render(<MessageBubble message={makeMessage({ content: { text: '你好世界' } })} />);
      expect(screen.getByText('你好世界')).toBeInTheDocument();
    });

    it('用户消息无 Markdown 特征时使用 <pre> 纯文本渲染', () => {
      const { container } = render(
        <MessageBubble message={makeMessage({ content: { text: '普通文字，没有特殊格式' } })} />,
      );
      expect(container.querySelector('pre')).toBeInTheDocument();
    });

    it('用户消息含代码块时启用 Markdown 渲染（带语法高亮）', async () => {
      const msg = makeMessage({
        content: { text: '```javascript\nconsole.log("hello");\n```' },
      });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(
        () => {
          expect(container.textContent).not.toContain('```');
          expect(container.querySelector('[class*="codeBlock"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('用户消息含标题时渲染 h 标签', async () => {
      const msg = makeMessage({ content: { text: '# 主标题\n内容' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('h1')).toBeInTheDocument();
      });
    });

    it('用户消息含无序列表时渲染 ul/li', async () => {
      const msg = makeMessage({ content: { text: '- 项目一\n- 项目二' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeInTheDocument();
        expect(container.querySelectorAll('li')).toHaveLength(2);
      });
    });

    it('用户消息含有序列表时渲染 ol/li', async () => {
      const msg = makeMessage({ content: { text: '1. 步骤一\n2. 步骤二\n3. 步骤三' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('ol')).toBeInTheDocument();
        expect(container.querySelectorAll('li')).toHaveLength(3);
      });
    });

    it('用户消息含行内代码时渲染 code 标签', async () => {
      const msg = makeMessage({ content: { text: '使用 `npm install` 安装依赖' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('code')).toBeInTheDocument();
      });
    });

    it('用户消息含加粗时渲染 strong 标签', async () => {
      const msg = makeMessage({ content: { text: '这是 **加粗文字** 示例' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('strong')).toBeInTheDocument();
      });
    });

    it('用户消息含斜体时渲染 em 标签', async () => {
      const msg = makeMessage({ content: { text: '这是 *斜体文字* 示例' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('em')).toBeInTheDocument();
      });
    });

    it('用户消息含链接时渲染 a 标签', async () => {
      const msg = makeMessage({ content: { text: '访问 [官网](https://example.com) 了解更多' } });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link).toBeInTheDocument();
        expect(link?.getAttribute('href')).toBe('https://example.com');
      });
    });

    it('渲染 AI 文本消息（Markdown）', async () => {
      const msg = makeMessage({
        role: 'assistant',
        content: { text: '**加粗文字**' },
      });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('strong')).toBeInTheDocument();
      });
    });

    it('流式消息显示光标', () => {
      const msg = makeMessage({
        role: 'assistant',
        status: 'streaming',
        content: { text: '' },
      });
      const { container } = render(
        <MessageBubble message={msg} streamingText="正在生成..." />,
      );
      // 光标元素（class 包含 cursor）
      expect(container.querySelector('[class*="cursor"]')).toBeInTheDocument();
    });

    it('流式传输中显示 streamingText 而非 content.text', () => {
      const msg = makeMessage({
        role: 'assistant',
        status: 'streaming',
        content: { text: '旧内容' },
      });
      render(<MessageBubble message={msg} streamingText="实时流式内容" />);
      expect(screen.getByText('实时流式内容')).toBeInTheDocument();
    });

    it('AI 消息中代码块有语法高亮容器', async () => {
      const msg = makeMessage({
        role: 'assistant',
        content: { text: '```javascript\nconsole.log("test");\n```' },
      });
      const { container } = render(<MessageBubble message={msg} />);
      await waitFor(() => {
        expect(container.querySelector('pre') || container.querySelector('.codeBlock')).toBeTruthy();
      });
    });
  });

  describe('错误消息', () => {
    it('渲染错误消息', () => {
      const msg = makeMessage({
        contentType: 'error',
        content: { code: 'ERR_500', message: '服务器内部错误' },
      });
      render(<MessageBubble message={msg} />);
      expect(screen.getByText('发送失败')).toBeInTheDocument();
      expect(screen.getByText('服务器内部错误')).toBeInTheDocument();
    });
  });

  describe('卡片渲染', () => {
    it('卡片消息渲染 CardRenderer（带标题）', () => {
      const msg = makeMessage({
        role: 'assistant',
        contentType: 'card',
        content: {
          type: 'interactive_card',
          cardId: 'c1',
          header: { title: '操作确认', template: 'blue' },
          elements: [],
        } as unknown as Message['content'],
      });
      render(<MessageBubble message={msg} />);
      // CardRenderer 应渲染卡片标题
      expect(screen.getByText('操作确认')).toBeInTheDocument();
    });

    it('图表消息渲染 ChartRenderer 容器', async () => {
      const msg = makeMessage({
        role: 'assistant',
        contentType: 'chart',
        content: {
          type: 'chart',
          messageId: 'm1',
          chartType: 'table',
          payload: {
            columns: [{ key: 'name', title: '姓名' }],
            rows: [{ name: '张三' }],
          },
        } as unknown as Message['content'],
      });
      const { container } = render(<MessageBubble message={msg} />);
      await screen.findByText('姓名');
      // ChartRenderer 应渲染容器元素
      expect(container.querySelector('[class*="container"]')).toBeInTheDocument();
    });

    it('图表消息使用宽轨道布局，避免结果区被压成窄卡片', async () => {
      const msg = makeMessage({
        role: 'assistant',
        contentType: 'chart',
        content: {
          type: 'chart',
          messageId: 'm2',
          chartType: 'table',
          payload: {
            columns: [{ key: 'name', title: '姓名' }],
            rows: [{ name: '张三' }],
          },
        } as unknown as Message['content'],
      });
      const { container } = render(<MessageBubble message={msg} />);
      await screen.findByText('姓名');

      expect(container.querySelector('[class*="contentWide"]')).toBeInTheDocument();
    });
  });

  describe('附件消息', () => {
    it('图片附件支持查看大图和下载图片', async () => {
      const msg = makeMessage({
        contentType: 'file',
        content: {
          fileId: 'file_image_1',
          fileName: 'office.png',
          fileType: 'image/png',
          fileSize: 2048,
          previewUrl: 'blob:office-image',
          downloadUrl: 'blob:office-image',
        } as Message['content'],
      });

      render(<MessageBubble message={msg} />);

      fireEvent.click(screen.getByRole('button', { name: '查看大图 office.png' }));

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByAltText('office.png').length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: '下载图片 office.png' })).toHaveAttribute(
        'download',
        'office.png',
      );
    });

    it('普通文件附件在发送后支持下载', () => {
      const msg = makeMessage({
        contentType: 'file',
        content: {
          fileId: 'file_doc_1',
          fileName: 'report.pdf',
          fileType: 'application/pdf',
          fileSize: 4096,
          downloadUrl: 'blob:report-file',
        } as Message['content'],
      });

      render(<MessageBubble message={msg} />);

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '下载文件 report.pdf' })).toHaveAttribute(
        'download',
        'report.pdf',
      );
    });
  });

  describe('消息布局', () => {
    it('用户消息靠右排列', () => {
      const { container } = render(
        <MessageBubble message={makeMessage({ role: 'user' })} />,
      );
      const row = container.firstChild as HTMLElement;
      expect(row.className).toMatch(/rowUser/);
    });

    it('AI 消息靠左排列', () => {
      const { container } = render(
        <MessageBubble message={makeMessage({ role: 'assistant' })} />,
      );
      const row = container.firstChild as HTMLElement;
      expect(row.className).toMatch(/rowAssistant/);
    });

    it('用户消息头像位于消息内容右侧', () => {
      const { container } = render(<MessageBubble message={makeMessage({ role: 'user' })} />);
      const row = container.firstChild as HTMLElement;

      expect(row.children[0]?.className).toMatch(/content/);
      expect(row.children[1]?.className).toMatch(/avatar/);
    });

    it('显示时间戳', () => {
      const msg = makeMessage({ timestamp: new Date('2024-01-15 10:30:00').getTime() });
      const { container } = render(<MessageBubble message={msg} />);
      // 时间戳应该在 DOM 中
      const timeEl = container.querySelector('[class*="time"]');
      expect(timeEl).not.toBeNull();
      expect(timeEl?.textContent).toBeTruthy();
    });
  });
});
