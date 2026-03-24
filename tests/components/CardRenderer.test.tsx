import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardRenderer from '@/components/Card/CardRenderer';
import type { InteractiveCard } from '@/types/card';

/** 构造最简卡片 */
function makeCard(overrides: Partial<InteractiveCard> = {}): InteractiveCard {
  return {
    type: 'interactive_card',
    cardId: 'card_001',
    elements: [],
    ...overrides,
  };
}

describe('CardRenderer', () => {
  const noop = vi.fn();

  describe('卡片头部', () => {
    it('有 header 时渲染标题', () => {
      render(
        <CardRenderer
          card={makeCard({ header: { title: '测试标题', template: 'blue' } })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      expect(screen.getByText('测试标题')).toBeInTheDocument();
    });

    it('无 header 时不渲染标题区域', () => {
      const { container } = render(
        <CardRenderer card={makeCard()} onAction={noop} onFormSubmit={noop} />,
      );
      // 不应有 header 相关节点
      expect(container.querySelector('[class*="header"]')).toBeNull();
    });
  });

  describe('div 元素（文本块）', () => {
    it('渲染 div 元素文本内容', () => {
      render(
        <CardRenderer
          card={makeCard({
            elements: [{ tag: 'div', text: '这是一段说明文字' }],
          })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      expect(screen.getByText('这是一段说明文字')).toBeInTheDocument();
    });
  });

  describe('note 元素（提示块）', () => {
    it('渲染 info 类型提示', () => {
      render(
        <CardRenderer
          card={makeCard({
            elements: [{ tag: 'note', text: '这是一条提示信息', type: 'info' }],
          })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      expect(screen.getByText('这是一条提示信息')).toBeInTheDocument();
    });

    it('渲染 warning 类型提示', () => {
      render(
        <CardRenderer
          card={makeCard({
            elements: [{ tag: 'note', text: '警告内容', type: 'warning' }],
          })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      expect(screen.getByText('警告内容')).toBeInTheDocument();
    });
  });

  describe('action 元素（按钮组）', () => {
    it('渲染按钮并触发 onAction', () => {
      const onAction = vi.fn();
      render(
        <CardRenderer
          card={makeCard({
            cardId: 'card_test',
            elements: [
              {
                tag: 'action',
                layout: 'horizontal',
                // 使用超过两字的文本，避免 Ant Design 自动插入空格
                actions: [{ tag: 'button', key: 'confirm', text: '确认操作', type: 'primary' }],
              },
            ],
          })}
          onAction={onAction}
          onFormSubmit={noop}
        />,
      );
      const btn = screen.getByText('确认操作');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledWith('card_test', 'confirm', null);
    });

    it('过期时按钮被禁用', () => {
      render(
        <CardRenderer
          card={makeCard({
            expired: true,
            elements: [
              {
                tag: 'action',
                layout: 'horizontal',
                // 使用超过两字的文本，避免 Ant Design 自动插入空格
                actions: [{ tag: 'button', key: 'btn', text: '执行操作', type: 'primary' }],
              },
            ],
          })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      const btn = screen.getByText('执行操作').closest('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('过期状态', () => {
    it('过期时显示"已提交"标记', () => {
      render(
        <CardRenderer
          card={makeCard({ expired: true })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      expect(screen.getByText('已提交')).toBeInTheDocument();
    });

    it('未过期时不显示"已提交"', () => {
      render(
        <CardRenderer card={makeCard()} onAction={noop} onFormSubmit={noop} />,
      );
      expect(screen.queryByText('已提交')).toBeNull();
    });

    it('过期时卡片容器有 expired 样式类', () => {
      const { container } = render(
        <CardRenderer
          card={makeCard({ expired: true })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/cardExpired/);
    });
  });

  describe('hr 分割线', () => {
    it('渲染 hr 元素时产生分割线', () => {
      const { container } = render(
        <CardRenderer
          card={makeCard({ elements: [{ tag: 'hr' }] })}
          onAction={noop}
          onFormSubmit={noop}
        />,
      );
      // Ant Design Divider 会渲染 .ant-divider
      expect(container.querySelector('.ant-divider')).toBeInTheDocument();
    });
  });
});
