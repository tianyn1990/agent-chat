import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionList from '@/components/Chat/SessionList';
import { useChatStore, createTempSession } from '@/stores/useChatStore';
import styles from '@/components/Chat/SessionList.module.less';
import itemStyles from '@/components/Chat/SessionItem.module.less';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SessionList', () => {
  const mockOnNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });
  });

  it('会话为空时显示空状态提示', () => {
    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);
    expect(screen.getByText('暂无对话')).toBeInTheDocument();
  });

  it('渲染所有会话条目', () => {
    const s1 = createTempSession('会话A');
    const s2 = createTempSession('会话B');
    useChatStore.setState({ sessions: [s1, s2] });

    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);

    expect(screen.getByText('会话A')).toBeInTheDocument();
    expect(screen.getByText('会话B')).toBeInTheDocument();
  });

  it('点击"新建对话"按钮触发回调', () => {
    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);
    fireEvent.click(screen.getByRole('button', { name: /新建对话/ }));
    expect(mockOnNewChat).toHaveBeenCalledTimes(1);
  });

  it('存在空白会话时按钮文案切换为继续新对话', () => {
    const session = createTempSession('新对话');
    useChatStore.setState({
      sessions: [session],
      messages: { [session.id]: [] },
    });

    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);

    expect(screen.getByRole('button', { name: /继续新对话/ })).toBeInTheDocument();
  });

  it('点击会话条目切换当前会话', () => {
    const session = createTempSession('目标会话');
    useChatStore.setState({ sessions: [session] });

    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);
    fireEvent.click(screen.getByText('目标会话'));

    expect(useChatStore.getState().currentSessionId).toBe(session.id);
  });

  it('当前活跃会话显示激活样式', () => {
    const session = createTempSession('激活会话');
    useChatStore.setState({
      sessions: [session],
      currentSessionId: session.id,
    });

    const { container } = renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);

    // 找到会话条目（有激活类名）
    const activeItem = container.querySelector('[class*="itemActive"]');
    expect(activeItem).not.toBeNull();
  });

  it('会话面板结构保留满宽布局所需的容器层级', () => {
    const session = createTempSession('短标题');
    useChatStore.setState({ sessions: [session] });

    const { container } = renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);

    // 这几个结构类共同保证二级侧栏中的新建按钮与会话项始终贴满可用宽度。
    expect(container.querySelector(`.${styles.container}`)).not.toBeNull();
    expect(container.querySelector(`.${styles.newBtnWrapper}`)).not.toBeNull();
    expect(container.querySelector(`.${styles.list}`)).not.toBeNull();
    expect(container.querySelector(`.${itemStyles.item}`)).not.toBeNull();
  });

  it('重命名会话后 store 更新', () => {
    const session = createTempSession('旧标题');
    useChatStore.setState({ sessions: [session] });

    renderWithRouter(<SessionList onNewChat={mockOnNewChat} />);

    // 通过 store action 模拟重命名
    useChatStore.getState().updateSession(session.id, { title: '新标题' });

    expect(useChatStore.getState().sessions[0].title).toBe('新标题');
  });

  it('删除会优先走外部处理器', async () => {
    const session = createTempSession('待删除会话');
    const onDeleteSession = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({
      sessions: [session],
      currentSessionId: session.id,
    });

    const { container } = renderWithRouter(
      <SessionList onNewChat={mockOnNewChat} onDeleteSession={onDeleteSession} />,
    );

    const sessionItem = container.querySelector('[class*="itemActive"]') as HTMLElement;
    const menuButton = container.querySelector('[class*="menuBtn"]') as HTMLElement;

    fireEvent.mouseEnter(sessionItem);
    fireEvent.click(menuButton);
    fireEvent.click(await screen.findByText('删除'));
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(onDeleteSession).toHaveBeenCalledWith(session.id, '待删除会话');
    });
  });
});
