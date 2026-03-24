import { STAR_OFFICE_MOCK_BASE } from '@/constants';
import type {
  LocalStarOfficeAgentsResponse,
  LocalStarOfficePushPayload,
  LocalStarOfficeStatusResponse,
} from './adapterStore';

/**
 * 本地 mock 页面查询主状态。
 *
 * 约定：
 * - 404 表示该会话当前尚无状态，不当作服务异常
 * - 其他非 2xx 状态统一视为 adapter 异常
 */
export async function fetchLocalStarOfficeStatus(
  sessionId: string,
  fetcher: typeof fetch = fetch,
): Promise<LocalStarOfficeStatusResponse | null> {
  const response = await fetcher(
    `${STAR_OFFICE_MOCK_BASE}/status?sessionId=${encodeURIComponent(sessionId)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`获取本地执行状态失败: ${response.status}`);
  }

  return (await response.json()) as LocalStarOfficeStatusResponse;
}

/** 查询本地 mock Agent 列表 */
export async function fetchLocalStarOfficeAgents(
  sessionId: string,
  fetcher: typeof fetch = fetch,
): Promise<LocalStarOfficeAgentsResponse | null> {
  const response = await fetcher(
    `${STAR_OFFICE_MOCK_BASE}/agents?sessionId=${encodeURIComponent(sessionId)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`获取本地 Agent 状态失败: ${response.status}`);
  }

  return (await response.json()) as LocalStarOfficeAgentsResponse;
}

/** 主应用向本地 mock adapter 推送某个会话的运行态 */
export async function pushLocalStarOfficeState(
  payload: LocalStarOfficePushPayload,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(`${STAR_OFFICE_MOCK_BASE}/adapter/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`推送本地执行状态失败: ${response.status}`);
  }
}

/** 清空本地 mock adapter 状态 */
export async function resetLocalStarOfficeState(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`${STAR_OFFICE_MOCK_BASE}/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`重置本地执行状态失败: ${response.status}`);
  }
}
