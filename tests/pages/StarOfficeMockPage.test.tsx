import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockedClient = vi.hoisted(() => ({
  fetchLocalStarOfficeStatus: vi.fn(),
  fetchLocalStarOfficeAgents: vi.fn(),
}));

vi.mock('@/constants', async () => {
  const actual = await vi.importActual<typeof import('@/constants')>('@/constants');
  return {
    ...actual,
    STAR_OFFICE_MOCK_ENABLED: true,
  };
});

vi.mock('@/mocks/starOffice/client', () => ({
  fetchLocalStarOfficeStatus: mockedClient.fetchLocalStarOfficeStatus,
  fetchLocalStarOfficeAgents: mockedClient.fetchLocalStarOfficeAgents,
}));

import StarOfficeMockPage from '@/pages/StarOfficeMock';

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<StarOfficeMockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StarOfficeMockPage', () => {
  beforeEach(() => {
    mockedClient.fetchLocalStarOfficeStatus.mockReset();
    mockedClient.fetchLocalStarOfficeAgents.mockReset();
  });

  it('缺少 sessionId 时显示错误提示', () => {
    renderPage('/');
    expect(screen.getByText('缺少会话 ID')).toBeInTheDocument();
  });

  it('无状态时显示等待提示', async () => {
    mockedClient.fetchLocalStarOfficeStatus.mockResolvedValue(null);
    mockedClient.fetchLocalStarOfficeAgents.mockResolvedValue(null);

    renderPage('/?sessionId=session_empty');

    await waitFor(() => {
      expect(screen.getByText('等待该会话的执行状态')).toBeInTheDocument();
    });
  });

  it('有状态时展示会话、状态和详情', async () => {
    mockedClient.fetchLocalStarOfficeStatus.mockResolvedValue({
      sessionId: 'session_ready',
      state: 'writing',
      detail: '正在生成回复',
      progress: 58,
      updatedAt: Date.now(),
    });
    mockedClient.fetchLocalStarOfficeAgents.mockResolvedValue({
      sessionId: 'session_ready',
      agents: [
        {
          agentId: 'main',
          name: 'OpenClaw',
          state: 'writing',
          detail: '正在生成回复',
          progress: 58,
          updatedAt: Date.now(),
        },
      ],
    });

    renderPage('/?sessionId=session_ready');

    await waitFor(() => {
      expect(screen.getByText('执行状态本地预览')).toBeInTheDocument();
      expect(screen.getByText(/会话：session_ready/)).toBeInTheDocument();
      expect(screen.getAllByText('生成中').length).toBeGreaterThan(0);
      expect(screen.getAllByText('正在生成回复').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('Star Office Mock Stage')).toBeInTheDocument();
      expect(screen.getByText('写作桌')).toBeInTheDocument();
      expect(screen.getByText(/当前主 Agent 位于「写作桌」/)).toBeInTheDocument();
    });
  });

  it('adapter 异常时显示服务不可用提示', async () => {
    mockedClient.fetchLocalStarOfficeStatus.mockRejectedValue(new Error('adapter down'));
    mockedClient.fetchLocalStarOfficeAgents.mockResolvedValue(null);

    renderPage('/?sessionId=session_error');

    await waitFor(() => {
      expect(screen.getByText('本地执行状态服务不可用')).toBeInTheDocument();
      expect(screen.getByText('adapter down')).toBeInTheDocument();
    });
  });
});
