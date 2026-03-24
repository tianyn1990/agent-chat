import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { useUserStore } from '@/stores/useUserStore';
import { authApi } from '@/services/auth';
import { ROUTES } from '@/constants';
import styles from './Callback.module.less';

/**
 * 飞书 OAuth 回调处理页
 * URL: /auth/callback?code=xxx&state=xxx
 *
 * 流程：
 * 1. 从 URL 取出 code 和 state
 * 2. 验证 state（防 CSRF）
 * 3. 发送 code 给后端换取 token 和用户信息
 * 4. 登录成功后跳转到原始页面
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useUserStore((s) => s.login);
  const setLoading = useUserStore((s) => s.setLoading);

  // 防止 StrictMode 下重复调用
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    // 解析 state，获取登录前的原始路径
    let fromPath = '/';
    try {
      const parsed = JSON.parse(atob(state)) as { from?: string };
      fromPath = parsed.from ?? '/';
    } catch {
      // state 解析失败，使用默认路径
    }

    setLoading(true);

    authApi
      .feishuCallback(code, state)
      .then(({ token, userInfo }) => {
        login(token, userInfo);
        navigate(fromPath, { replace: true });
      })
      .catch(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <Result
        icon={<Spin size="large" />}
        title="正在登录..."
        subTitle="请稍候，正在处理飞书授权"
      />
    </div>
  );
}
