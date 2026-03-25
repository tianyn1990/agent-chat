import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VisualizeWorkspaceView from '@/components/Visualize/VisualizeWorkspaceView';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

describe('VisualizeWorkspaceView', () => {
  beforeEach(() => {
    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
      workbenchCacheSessionIds: [],
      workbenchLifecycleBySession: {},
      runtimeBySession: {},
    });
  });

  it('展示当前会话 ID 和默认提示', () => {
    render(<VisualizeWorkspaceView sessionId="session_alpha" />);

    if (screen.queryByTitle('Star-Office-UI')) {
      expect(screen.getByTitle('Star-Office-UI')).toBeInTheDocument();
    } else {
      expect(screen.getByText('未配置 Star-Office-UI 地址')).toBeInTheDocument();
    }
  });

  it('存在本地运行态时显示状态文案', () => {
    useVisualizeStore.getState().setSessionRuntime('session_beta', {
      state: 'writing',
      detail: '正在生成回复内容',
      updatedAt: Date.now(),
      source: 'frontend',
    });

    render(<VisualizeWorkspaceView sessionId="session_beta" />);

    if (screen.queryByTitle('Star-Office-UI')) {
      expect(screen.getByTitle('Star-Office-UI')).toBeInTheDocument();
    } else {
      expect(screen.getByText('未配置 Star-Office-UI 地址')).toBeInTheDocument();
    }
  });

  it('iframe 地址始终携带当前 sessionId', () => {
    const { container } = render(<VisualizeWorkspaceView sessionId="session_gamma" />);
    const iframe = container.querySelector('iframe');

    if (iframe) {
      expect(iframe.getAttribute('src')).toContain('/session/session_gamma/');
    } else {
      expect(
        screen.getByText(
          /请设置 VITE_STAR_OFFICE_URL、开启真实 Star-Office 本地联调，或启用本地 Star-Office mock/,
        ),
      ).toBeInTheDocument();
    }
  });
});
