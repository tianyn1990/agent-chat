import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useUserStore } from '@/stores/useUserStore';
import { isTokenValid } from '@/utils/token';
import {
  APP_NAME,
  FEISHU_APP_ID,
  FEISHU_REDIRECT_URI,
  FEISHU_OAUTH_URL,
  IS_MOCK_ENABLED,
} from '@/constants';
import { mockLogin } from '@/mocks/auth';
import styles from './index.module.less';

/**
 * 飞书 OAuth 登录页
 * - 已登录用户自动跳回原页面
 * - 未登录用户点击按钮跳转飞书授权页
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useUserStore((s) => s.token);
  const login = useUserStore((s) => s.login);
  const isLoading = useUserStore((s) => s.isLoading);

  // 来自路由守卫保存的原始路径
  const fromPath = (location.state as { from?: string } | null)?.from ?? '/';

  // 已登录则直接跳转
  useEffect(() => {
    if (token && isTokenValid(token)) {
      navigate(fromPath, { replace: true });
    }
  }, [token, navigate, fromPath]);

  /**
   * 构建飞书 OAuth 授权 URL
   * state 参数用于防 CSRF，同时携带 fromPath 以便回调后跳回
   */
  const handleFeishuLogin = () => {
    if (IS_MOCK_ENABLED) {
      // Mock 模式：直接使用模拟数据登录
      const { token: mockToken, userInfo } = mockLogin();
      login(mockToken, userInfo);
      navigate(fromPath, { replace: true });
      return;
    }

    const state = btoa(
      JSON.stringify({ from: fromPath, nonce: Math.random().toString(36).slice(2) }),
    );
    const params = new URLSearchParams({
      client_id: FEISHU_APP_ID,
      redirect_uri: FEISHU_REDIRECT_URI,
      response_type: 'code',
      state,
    });
    window.location.href = `${FEISHU_OAUTH_URL}?${params.toString()}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Paper Ops Workspace</p>
          <h1 className={styles.heroTitle}>把对话、技能与执行状态放进同一张工作台。</h1>
          <p className={styles.heroSubtitle}>
            {APP_NAME}{' '}
            为内部协作提供多会话对话、技能管理与执行状态可视化能力，帮助团队把复杂任务拆解成可持续推进的工作流。
          </p>

          <ul className={styles.featureList}>
            <li>统一承接问答、图表、卡片与文件协作</li>
            <li>支持技能市场扩展和沉浸式执行状态查看</li>
            <li>与 OpenClaw / Star-Office-UI 联动，形成完整工作闭环</li>
          </ul>
        </section>

        <div className={styles.card}>
          {/* 登录卡片承担主 CTA，品牌图标保持轻量，不与登录动作争夺注意力。 */}
          <div className={styles.logo}>
            <span className={styles.logoIcon}>
              <RobotOutlined />
            </span>
            <h2 className={styles.logoText}>{APP_NAME}</h2>
          </div>

          <p className={styles.subtitle}>智能工作台入口</p>

          {/* 登录区域 */}
          <div className={styles.loginArea}>
            <p className={styles.hint}>请使用飞书账号登录</p>
            <Button
              type="primary"
              size="large"
              block
              loading={isLoading}
              onClick={handleFeishuLogin}
              className={styles.loginBtn}
            >
              {IS_MOCK_ENABLED ? '开发模式登录' : '使用飞书登录'}
            </Button>
          </div>

          <p className={styles.footer}>仅限公司内部使用 · {APP_NAME} v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
