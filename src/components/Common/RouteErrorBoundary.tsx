import { Button, Result } from 'antd';
import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { ROUTES } from '@/constants';
import styles from './RouteErrorBoundary.module.less';

/**
 * 路由级错误边界。
 *
 * 设计目标：
 * - 接住懒加载页面、loader/action 与渲染期抛出的路由错误
 * - 在开发态给出更明确的排查建议，避免直接暴露 React Router 默认英文报错
 * - 保持与当前 `Graphite Console` 一致的界面语气和视觉层级
 */
export default function RouteErrorBoundary() {
  const navigate = useNavigate();
  const error = useRouteError();

  let title = '页面加载失败';
  let subTitle = '请稍后重试，或返回工作台继续操作。';
  let detail = '';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    subTitle = typeof error.data === 'string' ? error.data : subTitle;
  } else if (error instanceof Error) {
    detail = error.message;

    if (error.message.includes('Failed to fetch dynamically imported module')) {
      subTitle = '开发态模块加载失败，通常是 Vite dev server 模块图或预构建缓存已失效。';
    } else {
      subTitle = error.message || subTitle;
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <Result
          status="warning"
          title={title}
          subTitle={subTitle}
          extra={
            <div className={styles.actions}>
              <Button type="primary" onClick={() => window.location.reload()}>
                重新加载
              </Button>
              <Button onClick={() => navigate(ROUTES.CHAT)}>返回工作台</Button>
            </div>
          }
        />

        <div className={styles.hint}>
          如果这是开发环境中的首次出现，优先检查终端编译错误；若没有明显错误，请重启 `npm run dev`
          后再重试。
        </div>

        {detail ? <pre className={styles.detail}>{detail}</pre> : null}
      </div>
    </section>
  );
}
