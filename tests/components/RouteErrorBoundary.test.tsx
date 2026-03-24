import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RouteErrorBoundary from '@/components/Common/RouteErrorBoundary';

describe('RouteErrorBoundary', () => {
  it('在动态导入失败时展示中文排查指引', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <div>ok</div>,
          errorElement: <RouteErrorBoundary />,
          children: [
            {
              path: 'boom',
              loader: () => {
                throw new TypeError(
                  'Failed to fetch dynamically imported module: http://127.0.0.1:3000/src/pages/Skills/index.tsx',
                );
              },
              element: <div>boom</div>,
            },
          ],
        },
      ],
      { initialEntries: ['/boom'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('页面加载失败')).toBeInTheDocument();
    expect(
      screen.getByText('开发态模块加载失败，通常是 Vite dev server 模块图或预构建缓存已失效。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
  });
});
