import type { InteractiveCard } from '@/types/card';
import type { ChartMessage } from '@/types/chart';
import type {
  OpenClawAgentEventPayload,
  OpenClawChatEventPayload,
  OpenClawGatewayEvent,
  OpenClawGatewayEventType,
  OpenClawHealthEventPayload,
  OpenClawHistoryItem,
  OpenClawMethodParamsMap,
  OpenClawMethodResultMap,
  OpenClawSessionRecord,
} from '@/types/openclaw';
import { prefixedId } from '@/utils/id';
import type { OpenClawGatewayTransport } from '@/services/openclawTransport';

/** AI 文本流式输出的单字符延迟（毫秒）。 */
export const MOCK_STREAM_DELAY = 30;

/** 首轮普通对话固定返回的引导文案。 */
export const FIRST_GUIDE_REPLY =
  '您好！当前为本地 Mock 对话环境。\n\n为了更高效地验证各类消息渲染能力，请优先输入以下测试指令：\n- 输入 "test card" 测试交互卡片\n- 输入 "test form" 测试表单卡片\n- 输入 "test line" 测试折线图\n- 输入 "test bar" 测试柱状图\n- 输入 "test pie" 测试饼图\n- 输入 "test area" 测试面积图\n- 输入 "test table" 测试数据表格\n- 输入 "test image" 测试图片消息\n- 输入 "test iframe" 测试 iframe 嵌入';

interface PendingRun {
  sessionKey: string;
  messageId: string;
  requestId: string;
  timers: Set<ReturnType<typeof setTimeout>>;
}

/**
 * mock 会话仓储。
 *
 * 设计原因：
 * - 第一阶段虽然还没有真实 OpenClaw session，但必须先把“会话状态”和“协议事件”绑定起来
 * - 将会话记录、历史消息与首轮引导状态收口到这里，能避免 adapter 和 transport 各自维护一套状态
 */
class MockOpenClawSessionStore {
  private sessions = new Map<string, OpenClawSessionRecord>();
  private histories = new Map<string, OpenClawHistoryItem[]>();
  private guidedSessions = new Set<string>();

  ensureSession(sessionKey: string, title = '新对话'): OpenClawSessionRecord {
    const existing = this.sessions.get(sessionKey);
    if (existing) {
      return existing;
    }

    const record: OpenClawSessionRecord = {
      sessionKey,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionKey, record);
    this.histories.set(sessionKey, []);
    return record;
  }

  listSessions(): OpenClawSessionRecord[] {
    return [...this.sessions.values()].sort((left, right) => right.updatedAt - left.updatedAt);
  }

  getHistory(sessionKey: string): OpenClawHistoryItem[] {
    return [...(this.histories.get(sessionKey) ?? [])];
  }

  appendHistory(sessionKey: string, item: OpenClawHistoryItem): void {
    const session = this.ensureSession(sessionKey);
    const nextHistory = [...(this.histories.get(sessionKey) ?? []), item];
    this.histories.set(sessionKey, nextHistory);
    this.sessions.set(sessionKey, {
      ...session,
      updatedAt: item.timestamp,
    });
  }

  /**
   * 更新会话标题。
   *
   * 设计原因：
   * - mock 阶段也要与真实 Gateway 对齐，支持 `sessions.patch`
   * - 这样页面侧的重命名与首条消息自动命名逻辑无需再区分 runtime
   */
  updateSessionTitle(sessionKey: string, title: string | null | undefined): OpenClawSessionRecord {
    const session = this.ensureSession(sessionKey);
    const nextTitle = title?.trim() || session.title;
    const nextRecord = {
      ...session,
      title: nextTitle,
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionKey, nextRecord);
    return nextRecord;
  }

  /**
   * 删除会话及其历史。
   *
   * 设计原因：
   * - mock 要覆盖完整的会话生命周期，避免删除只停留在 UI 内存层
   */
  deleteSession(sessionKey: string): void {
    this.sessions.delete(sessionKey);
    this.histories.delete(sessionKey);
    this.guidedSessions.delete(sessionKey);
  }

  hasGuided(sessionKey: string): boolean {
    return this.guidedSessions.has(sessionKey);
  }

  markGuided(sessionKey: string): void {
    this.guidedSessions.add(sessionKey);
  }

  reset(): void {
    this.sessions.clear();
    this.histories.clear();
    this.guidedSessions.clear();
  }
}

/**
 * OpenClaw-compatible 本地 mock transport。
 *
 * 说明：
 * - 这里模拟的是 OpenClaw 的“协议层级”，不是官方实现的一比一复刻
 * - 第一阶段重点是让页面不再直接绑定旧业务帧，而是经由 transport + adapter 消费统一领域事件
 */
export class MockOpenClawTransport implements OpenClawGatewayTransport {
  private eventHandlers = new Map<
    OpenClawGatewayEventType,
    Set<(event: OpenClawGatewayEvent) => void>
  >();
  private statusHandlers = new Set<(connected: boolean) => void>();
  private readonly sessionStore = new MockOpenClawSessionStore();
  private readonly pendingRuns = new Map<string, PendingRun>();
  private _isConnected = false;

  async connect(): Promise<void> {
    if (this._isConnected) {
      return;
    }

    // 第一阶段只模拟协议握手的层级存在感；真实直连阶段再接入真正的 connect / hello 流程。
    this._isConnected = true;
    this.notifyStatus(true);
    this.emit('health', {
      status: 'ok',
      source: 'mock',
      updatedAt: Date.now(),
    });
  }

  disconnect(): void {
    if (!this._isConnected) {
      return;
    }

    this._isConnected = false;
    this.notifyStatus(false);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 重置本地 mock 运行态。
   *
   * 说明：
   * - 主要供测试环境使用，避免不同用例间的 session 和事件串线
   * - 同时清理未完成 run，确保 fake timers 不会残留悬挂任务
   */
  reset(): void {
    this.pendingRuns.forEach((pendingRun) => {
      pendingRun.timers.forEach((timer) => clearTimeout(timer));
    });
    this.pendingRuns.clear();
    this.sessionStore.reset();
    this.eventHandlers.clear();
    this.statusHandlers.clear();
    this._isConnected = false;
  }

  async request<TMethod extends keyof OpenClawMethodParamsMap>(
    method: TMethod,
    params: OpenClawMethodParamsMap[TMethod],
  ): Promise<OpenClawMethodResultMap[TMethod]> {
    if (!this._isConnected) {
      throw new Error('Mock OpenClaw transport 尚未连接');
    }

    switch (method) {
      case 'sessions.list':
        return { sessions: this.sessionStore.listSessions() } as OpenClawMethodResultMap[TMethod];
      case 'sessions.patch': {
        const patched = this.sessionStore.updateSessionTitle(
          (params as OpenClawMethodParamsMap['sessions.patch']).key,
          (params as OpenClawMethodParamsMap['sessions.patch']).label,
        );
        return {
          ok: true,
          key: patched.sessionKey,
          entry: {
            key: patched.sessionKey,
            label: patched.title,
            createdAtMs: patched.createdAt,
            updatedAtMs: patched.updatedAt,
          },
        } as OpenClawMethodResultMap[TMethod];
      }
      case 'sessions.delete':
        this.sessionStore.deleteSession((params as OpenClawMethodParamsMap['sessions.delete']).key);
        return {
          ok: true,
          deleted: true,
          key: (params as OpenClawMethodParamsMap['sessions.delete']).key,
        } as OpenClawMethodResultMap[TMethod];
      case 'chat.history':
        return {
          sessionKey: (params as OpenClawMethodParamsMap['chat.history']).sessionKey,
          items: this.sessionStore.getHistory(
            (params as OpenClawMethodParamsMap['chat.history']).sessionKey,
          ),
        } as OpenClawMethodResultMap[TMethod];
      case 'chat.send':
        return this.handleChatSend(params as OpenClawMethodParamsMap['chat.send']) as Promise<
          OpenClawMethodResultMap[TMethod]
        >;
      case 'chat.abort':
        return this.handleChatAbort(
          params as OpenClawMethodParamsMap['chat.abort'],
        ) as OpenClawMethodResultMap[TMethod];
      case 'chat.inject':
        return this.handleChatInject(
          params as OpenClawMethodParamsMap['chat.inject'],
        ) as OpenClawMethodResultMap[TMethod];
      default:
        throw new Error(`不支持的 mock 方法: ${String(method)}`);
    }
  }

  on<TEvent extends OpenClawGatewayEventType>(
    event: TEvent,
    handler: (eventFrame: Extract<OpenClawGatewayEvent, { event: TEvent }>) => void,
  ): () => void {
    const handlerSet = this.eventHandlers.get(event) ?? new Set();
    const wrappedHandler = handler as (eventFrame: OpenClawGatewayEvent) => void;
    handlerSet.add(wrappedHandler);
    this.eventHandlers.set(event, handlerSet);

    return () => {
      handlerSet.delete(wrappedHandler);
      if (handlerSet.size === 0) {
        this.eventHandlers.delete(event);
      }
    };
  }

  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * 显式注册一个本地会话。
   *
   * 设计原因：
   * - 浏览器侧“如何创建真实 OpenClaw session”在后续真实接入阶段还需要结合官方运行模式确认
   * - 第一阶段先把创建会话收敛为 adapter 级能力，再让 transport 只负责读取和事件分发
   */
  ensureLocalSession(sessionKey: string, title?: string): OpenClawSessionRecord {
    return this.sessionStore.ensureSession(sessionKey, title);
  }

  private emit<TEvent extends OpenClawGatewayEventType>(
    event: TEvent,
    payload: TEvent extends 'chat'
      ? OpenClawChatEventPayload
      : TEvent extends 'agent'
        ? OpenClawAgentEventPayload
        : OpenClawHealthEventPayload,
  ): void {
    const frame = {
      type: 'event',
      event,
      payload,
    } as Extract<OpenClawGatewayEvent, { event: TEvent }>;

    this.eventHandlers.get(event)?.forEach((handler) => handler(frame));
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  private createPendingRun(
    sessionKey: string,
    requestId: string,
  ): { runId: string; messageId: string } {
    const runId = prefixedId('run');
    const messageId = prefixedId('msg');
    this.pendingRuns.set(runId, {
      sessionKey,
      messageId,
      requestId,
      timers: new Set(),
    });
    return { runId, messageId };
  }

  private scheduleRunStep(runId: string, delay: number, callback: () => void): void {
    const pendingRun = this.pendingRuns.get(runId);
    if (!pendingRun) {
      return;
    }

    const timer = setTimeout(() => {
      pendingRun.timers.delete(timer);
      if (!this.pendingRuns.has(runId)) {
        return;
      }
      callback();
    }, delay);

    pendingRun.timers.add(timer);
  }

  private finishRun(runId: string): void {
    const pendingRun = this.pendingRuns.get(runId);
    if (!pendingRun) {
      return;
    }

    pendingRun.timers.forEach((timer) => clearTimeout(timer));
    this.pendingRuns.delete(runId);
  }

  private emitAgentState(
    sessionKey: string,
    state: OpenClawAgentEventPayload['state'],
    detail: string,
    messageId?: string,
  ): void {
    this.emit('agent', {
      sessionKey,
      state,
      detail,
      updatedAt: Date.now(),
      messageId,
    });
  }

  private async handleChatSend(
    params: OpenClawMethodParamsMap['chat.send'],
  ): Promise<OpenClawMethodResultMap['chat.send']> {
    const session = this.sessionStore.ensureSession(params.sessionKey);
    const { runId, messageId } = this.createPendingRun(params.sessionKey, params.idempotencyKey);
    /**
     * mock 协议同时兼容早期 `text` 与真实风格 `message` 字段。
     *
     * 设计原因：
     * - 当前仓库已经进入 OpenClaw-compatible 过渡阶段
     * - direct adapter 会发送 `message`，而 mock 历史逻辑仍使用 `text`
     * - 这里统一收敛，避免 mock 与 direct 在聊天语义上再次分叉
     */
    const messageText = (params.text ?? params.message ?? '').trim();

    if (messageText) {
      this.sessionStore.appendHistory(params.sessionKey, {
        id: prefixedId('history'),
        role: 'user',
        kind: 'text',
        text: messageText,
        timestamp: Date.now(),
      });
    }

    this.emitAgentState(session.sessionKey, 'researching', '正在分析用户请求', messageId);

    const fullText = messageText;

    if (fullText.includes('test card')) {
      this.scheduleRunStep(runId, 80, () => {
        const card = createOperationCard();
        this.sessionStore.appendHistory(params.sessionKey, {
          id: prefixedId('history'),
          role: 'assistant',
          kind: 'card',
          card,
          timestamp: Date.now(),
        });
        this.emitAgentState(params.sessionKey, 'idle', '已返回交互卡片', messageId);
        this.emit('chat', {
          kind: 'message.card',
          sessionKey: params.sessionKey,
          requestId: params.idempotencyKey,
          messageId,
          card,
        });
        this.finishRun(runId);
      });
      return { accepted: true, runId };
    }

    if (fullText.includes('test form') || fullText.includes('表单')) {
      this.scheduleRunStep(runId, 80, () => {
        const card = createFormCard();
        this.sessionStore.appendHistory(params.sessionKey, {
          id: prefixedId('history'),
          role: 'assistant',
          kind: 'card',
          card,
          timestamp: Date.now(),
        });
        this.emitAgentState(params.sessionKey, 'idle', '已返回表单卡片', messageId);
        this.emit('chat', {
          kind: 'message.card',
          sessionKey: params.sessionKey,
          requestId: params.idempotencyKey,
          messageId,
          card,
        });
        this.finishRun(runId);
      });
      return { accepted: true, runId };
    }

    const keywordChart = resolveChartByKeyword(fullText, messageId);
    if (keywordChart) {
      this.scheduleRunStep(runId, 80, () => {
        this.sessionStore.appendHistory(params.sessionKey, {
          id: prefixedId('history'),
          role: 'assistant',
          kind: 'chart',
          chart: keywordChart,
          timestamp: Date.now(),
        });
        this.emitAgentState(params.sessionKey, 'executing', '正在整理结构化结果', messageId);
      });

      this.scheduleRunStep(runId, 140, () => {
        this.emit('chat', {
          kind: 'message.chart',
          sessionKey: params.sessionKey,
          requestId: params.idempotencyKey,
          messageId,
          chart: keywordChart,
        });
        this.emitAgentState(params.sessionKey, 'idle', '已返回图表结果', messageId);
        this.finishRun(runId);
      });
      return { accepted: true, runId };
    }

    this.emitAgentState(params.sessionKey, 'writing', '正在生成回复内容', messageId);
    this.emitStreamText(
      runId,
      params,
      messageId,
      this.generateReply(params.sessionKey, messageText, params.files?.length ?? 0),
    );
    return { accepted: true, runId };
  }

  private handleChatAbort(
    params: OpenClawMethodParamsMap['chat.abort'],
  ): OpenClawMethodResultMap['chat.abort'] {
    if (!params.runId || !this.pendingRuns.has(params.runId)) {
      return { aborted: false };
    }

    const pendingRun = this.pendingRuns.get(params.runId)!;
    pendingRun.timers.forEach((timer) => clearTimeout(timer));
    this.pendingRuns.delete(params.runId);
    this.emitAgentState(pendingRun.sessionKey, 'idle', '当前回复已中断', pendingRun.messageId);
    return { aborted: true };
  }

  private handleChatInject(
    params: OpenClawMethodParamsMap['chat.inject'],
  ): OpenClawMethodResultMap['chat.inject'] {
    this.sessionStore.ensureSession(params.sessionKey);
    this.sessionStore.appendHistory(params.sessionKey, {
      id: prefixedId('history'),
      role: 'user',
      kind: 'text',
      text: params.text,
      timestamp: Date.now(),
    });

    return {
      injected: true,
    };
  }

  private generateReply(sessionKey: string, text: string, fileCount: number): string {
    if (!this.sessionStore.hasGuided(sessionKey)) {
      this.sessionStore.markGuided(sessionKey);
      return FIRST_GUIDE_REPLY;
    }

    if (!text.trim() && fileCount > 0) {
      return `已收到 ${fileCount} 个附件。您可以继续补充描述，我会基于附件内容给出分析建议。`;
    }

    const replies = [
      `我理解您的问题是关于"${text.slice(0, 20)}"的。作为 AI 助手，我可以帮助您分析数据、生成报告、回答问题等。请告诉我您具体需要什么帮助？`,
      "这是一个 **Mock 测试回复**，支持 Markdown 格式：\n\n1. 列表项一\n2. 列表项二\n\n```javascript\nconsole.log('Hello, OpenClaw!');\n```\n\n> 引用文本示例",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private emitStreamText(
    runId: string,
    params: OpenClawMethodParamsMap['chat.send'],
    messageId: string,
    fullText: string,
  ): void {
    const chars = fullText.split('');
    chars.forEach((char, index) => {
      this.scheduleRunStep(runId, index * MOCK_STREAM_DELAY, () => {
        this.emit('chat', {
          kind: 'message.delta',
          sessionKey: params.sessionKey,
          requestId: params.idempotencyKey,
          messageId,
          delta: char,
        });
      });
    });

    this.scheduleRunStep(runId, chars.length * MOCK_STREAM_DELAY + 10, () => {
      this.sessionStore.appendHistory(params.sessionKey, {
        id: prefixedId('history'),
        role: 'assistant',
        kind: 'text',
        text: fullText,
        timestamp: Date.now(),
      });
      this.emit('chat', {
        kind: 'message.completed',
        sessionKey: params.sessionKey,
        requestId: params.idempotencyKey,
        messageId,
      });
      this.emitAgentState(params.sessionKey, 'idle', '本轮回复已完成', messageId);
      this.finishRun(runId);
    });
  }
}

function createOperationCard(): InteractiveCard {
  return {
    type: 'interactive_card',
    cardId: prefixedId('card'),
    header: { title: '操作确认', template: 'blue' },
    elements: [
      { tag: 'div', text: '请选择您要执行的操作：' },
      { tag: 'hr' },
      {
        tag: 'action',
        layout: 'horizontal',
        actions: [
          { tag: 'button', key: 'confirm', text: '确认', type: 'primary' },
          { tag: 'button', key: 'cancel', text: '取消', type: 'default' },
          {
            tag: 'button',
            key: 'delete',
            text: '删除',
            type: 'danger',
            confirm: { title: '确认删除？', content: '此操作不可撤销' },
          },
        ],
      },
      { tag: 'note', text: '操作完成后卡片将自动失效', type: 'info' },
    ],
  };
}

function createFormCard(): InteractiveCard {
  return {
    type: 'interactive_card',
    cardId: prefixedId('card'),
    header: { title: '请填写信息', template: 'green' },
    elements: [
      {
        tag: 'form',
        submitKey: 'submit_info',
        submitText: '提交',
        fields: [
          { tag: 'input', key: 'name', label: '姓名', placeholder: '请输入姓名', required: true },
          {
            tag: 'select',
            key: 'department',
            label: '部门',
            options: [
              { label: '研发部', value: 'dev' },
              { label: '产品部', value: 'pm' },
              { label: '设计部', value: 'design' },
            ],
            required: true,
          },
          {
            tag: 'radio',
            key: 'type',
            label: '申请类型',
            options: [
              { label: '请假', value: 'leave' },
              { label: '出差', value: 'business' },
            ],
          },
          { tag: 'date', key: 'date', label: '日期', required: true },
        ],
      },
    ],
  };
}

function resolveChartByKeyword(text: string, messageId: string): ChartMessage | null {
  if (text.includes('test line') || text.includes('折线图')) {
    return createLineChart(messageId);
  }

  if (text.includes('test bar') || text.includes('柱状图')) {
    return createBarChart(messageId);
  }

  if (text.includes('test pie') || text.includes('饼图')) {
    return createPieChart(messageId);
  }

  if (text.includes('test area') || text.includes('面积图')) {
    return createAreaChart(messageId);
  }

  if (text.includes('test table') || text.includes('表格')) {
    return createTableChart(messageId);
  }

  if (text.includes('test image') || text.includes('图片')) {
    return createImageChart(messageId);
  }

  if (text.includes('test iframe') || text.includes('iframe')) {
    return createIframeChart(messageId);
  }

  return null;
}

function createLineChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'line',
    payload: {
      spec: {
        type: 'line',
        data: {
          value: [
            { date: '2024-01', value: 120, category: '销售额' },
            { date: '2024-01', value: 80, category: '成本' },
            { date: '2024-02', value: 180, category: '销售额' },
            { date: '2024-02', value: 95, category: '成本' },
            { date: '2024-03', value: 150, category: '销售额' },
            { date: '2024-03', value: 88, category: '成本' },
            { date: '2024-04', value: 220, category: '销售额' },
            { date: '2024-04', value: 110, category: '成本' },
            { date: '2024-05', value: 280, category: '销售额' },
            { date: '2024-05', value: 130, category: '成本' },
            { date: '2024-06', value: 260, category: '销售额' },
            { date: '2024-06', value: 125, category: '成本' },
            { date: '2024-07', value: 310, category: '销售额' },
            { date: '2024-07', value: 145, category: '成本' },
            { date: '2024-08', value: 290, category: '销售额' },
            { date: '2024-08', value: 138, category: '成本' },
            { date: '2024-09', value: 340, category: '销售额' },
            { date: '2024-09', value: 160, category: '成本' },
            { date: '2024-10', value: 380, category: '销售额' },
            { date: '2024-10', value: 172, category: '成本' },
            { date: '2024-11', value: 420, category: '销售额' },
            { date: '2024-11', value: 190, category: '成本' },
            { date: '2024-12', value: 460, category: '销售额' },
            { date: '2024-12', value: 205, category: '成本' },
          ],
        },
        encode: { x: 'date', y: 'value', color: 'category' },
        title: { text: '2024 年度销售额 vs 成本趋势' },
      },
      height: 440,
      exportable: true,
    },
  };
}

function createBarChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'bar',
    payload: {
      spec: {
        type: 'interval',
        data: {
          value: [
            { department: '研发部', quarter: 'Q1', revenue: 320 },
            { department: '研发部', quarter: 'Q2', revenue: 410 },
            { department: '研发部', quarter: 'Q3', revenue: 390 },
            { department: '研发部', quarter: 'Q4', revenue: 480 },
            { department: '产品部', quarter: 'Q1', revenue: 180 },
            { department: '产品部', quarter: 'Q2', revenue: 220 },
            { department: '产品部', quarter: 'Q3', revenue: 210 },
            { department: '产品部', quarter: 'Q4', revenue: 260 },
            { department: '设计部', quarter: 'Q1', revenue: 130 },
            { department: '设计部', quarter: 'Q2', revenue: 160 },
            { department: '设计部', quarter: 'Q3', revenue: 155 },
            { department: '设计部', quarter: 'Q4', revenue: 195 },
            { department: '运营部', quarter: 'Q1', revenue: 240 },
            { department: '运营部', quarter: 'Q2', revenue: 290 },
            { department: '运营部', quarter: 'Q3', revenue: 275 },
            { department: '运营部', quarter: 'Q4', revenue: 340 },
            { department: '市场部', quarter: 'Q1', revenue: 200 },
            { department: '市场部', quarter: 'Q2', revenue: 255 },
            { department: '市场部', quarter: 'Q3', revenue: 240 },
            { department: '市场部', quarter: 'Q4', revenue: 310 },
          ],
        },
        encode: { x: 'department', y: 'revenue', color: 'quarter' },
        transform: [{ type: 'dodgeX' }],
        title: { text: '2024 年各部门季度营收对比（万元）' },
      },
      height: 440,
      exportable: true,
    },
  };
}

function createTableChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'table',
    payload: {
      columns: [
        { key: 'name', title: '姓名' },
        { key: 'department', title: '部门' },
        { key: 'level', title: '级别' },
        { key: 'score', title: '绩效评分', dataType: 'number', sortable: true },
        { key: 'completion', title: '目标完成率', dataType: 'percent', sortable: true },
        { key: 'salary', title: '月薪（元）', dataType: 'number', sortable: true },
        { key: 'date', title: '评估日期', dataType: 'date' },
      ],
      rows: [
        {
          name: '张三',
          department: '研发部',
          level: 'P6',
          score: 95,
          completion: 112,
          salary: 28000,
          date: '2024-01-15',
        },
        {
          name: '李四',
          department: '产品部',
          level: 'P5',
          score: 88,
          completion: 98,
          salary: 22000,
          date: '2024-01-15',
        },
        {
          name: '王五',
          department: '设计部',
          level: 'P5',
          score: 92,
          completion: 105,
          salary: 20000,
          date: '2024-01-16',
        },
        {
          name: '赵六',
          department: '运营部',
          level: 'P4',
          score: 85,
          completion: 91,
          salary: 16000,
          date: '2024-01-16',
        },
        {
          name: '孙七',
          department: '研发部',
          level: 'P7',
          score: 98,
          completion: 120,
          salary: 38000,
          date: '2024-01-17',
        },
        {
          name: '周八',
          department: '市场部',
          level: 'P5',
          score: 90,
          completion: 103,
          salary: 21000,
          date: '2024-01-17',
        },
        {
          name: '吴九',
          department: '研发部',
          level: 'P5',
          score: 87,
          completion: 96,
          salary: 24000,
          date: '2024-01-18',
        },
        {
          name: '郑十',
          department: '产品部',
          level: 'P6',
          score: 93,
          completion: 108,
          salary: 30000,
          date: '2024-01-18',
        },
        {
          name: '钱十一',
          department: '设计部',
          level: 'P4',
          score: 82,
          completion: 89,
          salary: 15000,
          date: '2024-01-19',
        },
        {
          name: '陈十二',
          department: '运营部',
          level: 'P5',
          score: 91,
          completion: 101,
          salary: 19000,
          date: '2024-01-19',
        },
        {
          name: '褚十三',
          department: '研发部',
          level: 'P6',
          score: 96,
          completion: 115,
          salary: 32000,
          date: '2024-01-20',
        },
        {
          name: '卫十四',
          department: '市场部',
          level: 'P4',
          score: 84,
          completion: 93,
          salary: 17000,
          date: '2024-01-20',
        },
        {
          name: '蒋十五',
          department: '产品部',
          level: 'P5',
          score: 89,
          completion: 100,
          salary: 23000,
          date: '2024-01-21',
        },
        {
          name: '沈十六',
          department: '设计部',
          level: 'P6',
          score: 94,
          completion: 110,
          salary: 27000,
          date: '2024-01-21',
        },
        {
          name: '韩十七',
          department: '研发部',
          level: 'P8',
          score: 99,
          completion: 125,
          salary: 50000,
          date: '2024-01-22',
        },
      ],
      options: { pagination: true, pageSize: 8, exportable: true },
    },
  };
}

function createImageChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'image',
    payload: {
      url: 'https://picsum.photos/800/400',
      alt: '示例图片',
      downloadable: true,
    },
  };
}

function createPieChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'pie',
    payload: {
      spec: {
        type: 'interval',
        data: {
          value: [
            { category: '研发部', value: 45 },
            { category: '产品部', value: 20 },
            { category: '设计部', value: 15 },
            { category: '运营部', value: 30 },
            { category: '市场部', value: 22 },
            { category: '财务部', value: 12 },
            { category: '人事部', value: 10 },
            { category: '法务部', value: 6 },
          ],
        },
        encode: { y: 'value', color: 'category' },
        transform: [{ type: 'stackY' }],
        coordinate: { type: 'theta' },
        label: {
          position: 'outside',
          text: (d: { category: string; value: number }) => `${d.category}\n${d.value}人`,
        },
        title: { text: '各部门人员占比' },
      },
      height: 400,
      exportable: true,
    },
  };
}

function createAreaChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'area',
    payload: {
      spec: {
        type: 'area',
        data: {
          value: [
            { date: '2024-01', visits: 32000, category: 'PC端' },
            { date: '2024-01', visits: 18000, category: '移动端' },
            { date: '2024-02', visits: 41000, category: 'PC端' },
            { date: '2024-02', visits: 25000, category: '移动端' },
            { date: '2024-03', visits: 38000, category: 'PC端' },
            { date: '2024-03', visits: 31000, category: '移动端' },
            { date: '2024-04', visits: 52000, category: 'PC端' },
            { date: '2024-04', visits: 40000, category: '移动端' },
            { date: '2024-05', visits: 61000, category: 'PC端' },
            { date: '2024-05', visits: 55000, category: '移动端' },
            { date: '2024-06', visits: 58000, category: 'PC端' },
            { date: '2024-06', visits: 62000, category: '移动端' },
            { date: '2024-07', visits: 67000, category: 'PC端' },
            { date: '2024-07', visits: 71000, category: '移动端' },
            { date: '2024-08', visits: 63000, category: 'PC端' },
            { date: '2024-08', visits: 68000, category: '移动端' },
            { date: '2024-09', visits: 72000, category: 'PC端' },
            { date: '2024-09', visits: 78000, category: '移动端' },
            { date: '2024-10', visits: 80000, category: 'PC端' },
            { date: '2024-10', visits: 85000, category: '移动端' },
            { date: '2024-11', visits: 88000, category: 'PC端' },
            { date: '2024-11', visits: 95000, category: '移动端' },
            { date: '2024-12', visits: 95000, category: 'PC端' },
            { date: '2024-12', visits: 108000, category: '移动端' },
          ],
        },
        encode: { x: 'date', y: 'visits', color: 'category' },
        style: { fillOpacity: 0.6 },
        title: { text: '2024 年 PC 端 vs 移动端月度访问量' },
      },
      height: 440,
      exportable: true,
    },
  };
}

function createIframeChart(messageId: string): ChartMessage {
  return {
    type: 'chart',
    messageId,
    chartType: 'iframe',
    payload: {
      url: 'https://example.com',
      height: 400,
      allowFullscreen: true,
    },
  };
}

/** 默认单例：供本地 mock 模式与测试共同复用。 */
export const mockOpenClawTransport = new MockOpenClawTransport();
