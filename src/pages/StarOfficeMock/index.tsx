import { useEffect, useState } from 'react';
import { Result, Tag, Card, Progress, Space, Typography, Spin } from 'antd';
import { DeploymentUnitOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { STAR_OFFICE_MOCK_ENABLED } from '@/constants';
import type { VisualizeRuntimeState } from '@/types/visualize';
import { VISUALIZE_STATE_LABELS } from '@/types/visualize';
import { fetchLocalStarOfficeAgents, fetchLocalStarOfficeStatus } from '@/mocks/starOffice/client';
import type {
  LocalStarOfficeAgentState,
  LocalStarOfficeStatusResponse,
} from '@/mocks/starOffice/adapterStore';
import styles from './StarOfficeMock.module.less';

type PageState = 'loading' | 'ready' | 'empty' | 'error';

/** 轮询间隔：开发期保持较短，便于观察状态变化 */
const POLL_INTERVAL = 1200;

interface OfficeZone {
  key: VisualizeRuntimeState;
  title: string;
  subtitle: string;
}

/** 本地 mock 办公室分区定义，用于模拟 Star-Office-UI 的状态空间。 */
const OFFICE_ZONES: OfficeZone[] = [
  { key: 'idle', title: '休息区', subtitle: '待命与收尾' },
  { key: 'researching', title: '情报台', subtitle: '检索与分析' },
  { key: 'writing', title: '写作桌', subtitle: '组织回复内容' },
  { key: 'executing', title: '执行站', subtitle: '命令与工具运行' },
  { key: 'syncing', title: '同步台', subtitle: '结果整理与同步' },
  { key: 'error', title: '告警区', subtitle: '异常与恢复' },
];

/** 根据状态获取当前 Agent 所在分区。 */
function getActiveZone(state: VisualizeRuntimeState): OfficeZone {
  return OFFICE_ZONES.find((zone) => zone.key === state) ?? OFFICE_ZONES[0];
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
  });
}

/**
 * 本地 Star-Office mock 页面。
 *
 * 作用：
 * 1. 为 iframe 提供独立页面承接能力
 * 2. 按 `sessionId` 轮询本地 mock adapter
 * 3. 在不依赖真实 Star-Office 服务的前提下验证会话级执行状态展示
 */
export default function StarOfficeMockPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId')?.trim() ?? '';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [status, setStatus] = useState<LocalStarOfficeStatusResponse | null>(null);
  const [agents, setAgents] = useState<LocalStarOfficeAgentState[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!STAR_OFFICE_MOCK_ENABLED) {
      setPageState('error');
      setErrorMessage('本地 Star-Office mock 未启用。');
      return;
    }

    if (!sessionId) {
      setPageState('error');
      setErrorMessage('缺少会话 ID，无法加载本地执行状态页面。');
      return;
    }

    let isDisposed = false;
    let timer: number | null = null;

    // 轮询本地 adapter，模拟真实 Star-Office 通过接口读取状态的方式。
    const pollRuntime = async () => {
      try {
        const [nextStatus, nextAgents] = await Promise.all([
          fetchLocalStarOfficeStatus(sessionId),
          fetchLocalStarOfficeAgents(sessionId),
        ]);

        if (isDisposed) return;

        if (!nextStatus) {
          setStatus(null);
          setAgents([]);
          setPageState('empty');
        } else {
          setStatus(nextStatus);
          setAgents(nextAgents?.agents ?? []);
          setPageState('ready');
        }

        setErrorMessage('');
      } catch (error) {
        if (isDisposed) return;
        setPageState('error');
        setErrorMessage(error instanceof Error ? error.message : '本地执行状态服务暂时不可用。');
      } finally {
        if (!isDisposed) {
          timer = window.setTimeout(pollRuntime, POLL_INTERVAL);
        }
      }
    };

    void pollRuntime();

    return () => {
      isDisposed = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [sessionId]);

  if (!STAR_OFFICE_MOCK_ENABLED) {
    return (
      <Result
        icon={<DeploymentUnitOutlined className={styles.resultIcon} />}
        title="本地执行状态 Mock 未启用"
        subTitle="请开启 VITE_STAR_OFFICE_MOCK_ENABLED 后重试。"
      />
    );
  }

  if (!sessionId) {
    return (
      <Result status="error" title="缺少会话 ID" subTitle="请从具体会话中打开执行状态面板。" />
    );
  }

  if (pageState === 'loading') {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="large" />
        <Typography.Text type="secondary">正在连接本地执行状态服务...</Typography.Text>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <Result
        status="warning"
        title="本地执行状态服务不可用"
        subTitle={errorMessage || '请检查本地 mock adapter 是否已启用。'}
      />
    );
  }

  if (pageState === 'empty' || !status) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Star-Office-UI Local Mock</p>
          <h1 className={styles.title}>执行状态本地预览</h1>
          <Tag className={styles.sessionTag}>会话：{sessionId}</Tag>
        </header>

        <Result
          icon={<DeploymentUnitOutlined className={styles.resultIcon} />}
          title="等待该会话的执行状态"
          subTitle="当前会话尚未产生可同步到本地 mock adapter 的运行态。"
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Star-Office-UI Local Mock</p>
          <h1 className={styles.title}>执行状态本地预览</h1>
        </div>

        <Space wrap>
          <Tag className={styles.sessionTag}>会话：{sessionId}</Tag>
          <Tag
            className={
              status.state === 'error' ? styles.statusTagError : styles.statusTagProcessing
            }
          >
            {VISUALIZE_STATE_LABELS[status.state]}
          </Tag>
        </Space>
      </header>

      <section className={styles.officeStage} aria-label="Star Office Mock Stage">
        <div className={styles.officeBackdrop} />

        {OFFICE_ZONES.map((zone) => {
          const isActiveZone = zone.key === status.state;

          return (
            <article
              key={zone.key}
              className={`${styles.zoneCard} ${isActiveZone ? styles.zoneCardActive : ''}`}
              data-state-zone={zone.key}
            >
              <div className={styles.zoneHeader}>
                <strong>{zone.title}</strong>
                <span>{zone.subtitle}</span>
              </div>

              {isActiveZone ? (
                <div className={styles.agentDock}>
                  <div className={styles.agentBubble}>{status.detail}</div>
                  <div
                    className={`${styles.pixelAgent} ${
                      status.state === 'error' ? styles.pixelAgentError : ''
                    }`}
                  >
                    <span className={styles.pixelAgentFace} />
                    <span className={styles.pixelAgentBadge}>主</span>
                  </div>
                </div>
              ) : (
                <div className={styles.zonePlaceholder}>
                  <span>空闲分区</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <Card className={styles.summaryCard} variant="borderless">
        <Typography.Paragraph className={styles.detail}>{status.detail}</Typography.Paragraph>

        <div className={styles.metaRow}>
          <span>更新时间：{formatUpdatedAt(status.updatedAt)}</span>
          <span>进度：{status.progress}%</span>
        </div>

        <Progress
          percent={status.progress}
          status={
            status.state === 'error' ? 'exception' : status.state === 'idle' ? 'success' : 'active'
          }
        />
      </Card>

      <section className={styles.agentSection}>
        <h2 className={styles.sectionTitle}>Agent 状态</h2>
        <p className={styles.sectionHint}>
          当前主 Agent 位于「{getActiveZone(status.state).title}」，用于模拟 Star-Office-UI
          中随状态迁移的办公室效果。
        </p>

        <div className={styles.agentGrid}>
          {agents.map((agent) => (
            <Card key={agent.agentId} className={styles.agentCard}>
              <div className={styles.agentHeader}>
                <strong>{agent.name}</strong>
                <Tag
                  className={
                    agent.state === 'error' ? styles.statusTagError : styles.statusTagProcessing
                  }
                >
                  {VISUALIZE_STATE_LABELS[agent.state]}
                </Tag>
              </div>

              <p className={styles.agentDetail}>{agent.detail}</p>
              <div className={styles.agentMeta}>
                <span>ID：{agent.agentId}</span>
                <span>{agent.progress}%</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
