import type {
  WsServerMessage,
  WsSessionCreated,
  WsMessageChunk,
  WsCardMessage,
  WsChartMessage,
} from '@/types/message';
import type { InteractiveCard } from '@/types/card';
import type { ChartMessage } from '@/types/chart';
import { prefixedId } from '@/utils/id';

/** AI 回复流式文本的延迟（毫秒/字符） */
const STREAM_DELAY = 30;
/** 首轮普通对话固定返回的引导文案。 */
const FIRST_GUIDE_REPLY =
  '您好！当前为本地 Mock 对话环境。\n\n为了更高效地验证各类消息渲染能力，请优先输入以下测试指令：\n- 输入 "test card" 测试交互卡片\n- 输入 "test form" 测试表单卡片\n- 输入 "test line" 测试折线图\n- 输入 "test bar" 测试柱状图\n- 输入 "test pie" 测试饼图\n- 输入 "test area" 测试面积图\n- 输入 "test table" 测试数据表格\n- 输入 "test image" 测试图片消息\n- 输入 "test iframe" 测试 iframe 嵌入';

type MockMessageHandler = (message: WsServerMessage) => void;

/**
 * Mock WebSocket 服务
 * 在开发阶段替代真实的 WebSocket 连接
 */
class MockWebSocketService {
  private handlers: MockMessageHandler[] = [];
  private _isConnected = false;
  private statusHandlers: Array<(connected: boolean) => void> = [];
  /** 记录已经发送过首轮引导的会话，确保每个会话首次普通对话返回固定提示。 */
  private guidedSessions = new Set<string>();

  connect(): void {
    this._isConnected = true;
    this.notifyStatus(true);
    console.log('[MockWS] 已连接（Mock 模式）');
  }

  disconnect(): void {
    this._isConnected = false;
    this.notifyStatus(false);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 重置 mock 运行态。
   * 仅供测试环境与开发调试使用，避免不同用例之间共享会话状态。
   */
  reset(): void {
    this.handlers = [];
    this.statusHandlers = [];
    this.guidedSessions.clear();
    this._isConnected = false;
  }

  send(message: { type: string; [key: string]: unknown }): boolean {
    if (!this._isConnected) return false;

    setTimeout(() => {
      this.handleClientMessage(message);
    }, 50);

    return true;
  }

  on(type: string, handler: MockMessageHandler): () => void {
    const wrappedHandler: MockMessageHandler = (msg) => {
      if (msg.type === type) handler(msg);
    };
    this.handlers.push(wrappedHandler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== wrappedHandler);
    };
  }

  onAll(handler: MockMessageHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  private emit(message: WsServerMessage): void {
    this.handlers.forEach((handler) => handler(message));
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((h) => h(connected));
  }

  private handleClientMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'create_session':
        this.handleCreateSession(message as { type: string; requestId: string; title?: string });
        break;
      case 'user_message':
        this.handleUserMessage(
          message as {
            type: string;
            sessionId: string;
            requestId: string;
            content: { text: string };
          },
        );
        break;
    }
  }

  private handleCreateSession(msg: { requestId: string; title?: string }): void {
    const sessionCreated: WsSessionCreated = {
      type: 'session_created',
      requestId: msg.requestId,
      session: {
        id: prefixedId('session'),
        title: msg.title ?? '新对话',
        createdAt: Date.now(),
      },
    };
    this.emit(sessionCreated);
  }

  private handleUserMessage(msg: {
    sessionId: string;
    requestId: string;
    content: { text: string };
  }): void {
    const text = msg.content.text;
    const messageId = prefixedId('msg');

    // 根据用户输入返回不同的 Mock 消息
    if (text.includes('test card')) {
      this.emitCard(msg.sessionId, messageId);
    } else if (text.includes('test line') || text.includes('折线图')) {
      this.emitLineChart(msg.sessionId, messageId);
    } else if (text.includes('test bar') || text.includes('柱状图')) {
      this.emitBarChart(msg.sessionId, messageId);
    } else if (text.includes('test pie') || text.includes('饼图')) {
      this.emitPieChart(msg.sessionId, messageId);
    } else if (text.includes('test area') || text.includes('面积图')) {
      this.emitAreaChart(msg.sessionId, messageId);
    } else if (text.includes('test table') || text.includes('表格')) {
      this.emitTableChart(msg.sessionId, messageId);
    } else if (text.includes('test image') || text.includes('图片')) {
      this.emitImageChart(msg.sessionId, messageId);
    } else if (text.includes('test iframe') || text.includes('iframe')) {
      this.emitIframeChart(msg.sessionId, messageId);
    } else if (text.includes('test form') || text.includes('表单')) {
      this.emitFormCard(msg.sessionId, messageId);
    } else {
      // 默认：普通文本回复。每个会话首次返回固定引导，后续再进入随机回复。
      this.emitStreamText(
        msg.sessionId,
        messageId,
        msg.requestId,
        this.generateReply(msg.sessionId, text),
      );
    }
  }

  private generateReply(sessionId: string, text: string): string {
    if (!this.guidedSessions.has(sessionId)) {
      this.guidedSessions.add(sessionId);
      return FIRST_GUIDE_REPLY;
    }

    const replies = [
      `我理解您的问题是关于"${text.slice(0, 20)}"的。作为 AI 助手，我可以帮助您分析数据、生成报告、回答问题等。请告诉我您具体需要什么帮助？`,
      `这是一个 **Mock 测试回复**，支持 Markdown 格式：\n\n1. 列表项一\n2. 列表项二\n\n\`\`\`javascript\nconsole.log('Hello, OpenClaw!');\n\`\`\`\n\n> 引用文本示例`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private emitStreamText(
    sessionId: string,
    messageId: string,
    requestId: string,
    fullText: string,
  ): void {
    const chars = fullText.split('');
    let index = 0;

    const sendNext = () => {
      if (index >= chars.length) {
        // 发送完成标志
        const done: WsMessageChunk = {
          type: 'message_chunk',
          sessionId,
          messageId,
          requestId,
          delta: '',
          done: true,
        };
        this.emit(done);
        return;
      }

      const chunk: WsMessageChunk = {
        type: 'message_chunk',
        sessionId,
        messageId,
        requestId,
        delta: chars[index],
        done: false,
      };
      this.emit(chunk);
      index++;
      setTimeout(sendNext, STREAM_DELAY);
    };

    sendNext();
  }

  private emitCard(sessionId: string, messageId: string): void {
    const card: InteractiveCard = {
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

    const cardMsg: WsCardMessage = {
      type: 'card',
      sessionId,
      messageId,
      card,
    };
    this.emit(cardMsg);
  }

  private emitFormCard(sessionId: string, messageId: string): void {
    const card: InteractiveCard = {
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

    const cardMsg: WsCardMessage = {
      type: 'card',
      sessionId,
      messageId,
      card,
    };
    this.emit(cardMsg);
  }

  private emitLineChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
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
        // 本地 mock 需要更接近真实可读图表尺寸，避免在聊天轨道中显得过小。
        height: 440,
        exportable: true,
      },
    };

    const chartMsg: WsChartMessage = {
      type: 'chart',
      sessionId,
      messageId,
      chart,
    };
    this.emit(chartMsg);
  }

  private emitBarChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
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
        // 柱状图类目较多，提升高度后标签与图例更易读。
        height: 440,
        exportable: true,
      },
    };

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }

  private emitTableChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
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

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }

  private emitImageChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
      type: 'chart',
      messageId,
      chartType: 'image',
      payload: {
        url: 'https://picsum.photos/800/400',
        alt: '示例图片',
        downloadable: true,
      },
    };

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }

  /** 饼图 Mock 数据 */
  private emitPieChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
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

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }

  /** 面积图 Mock 数据 */
  private emitAreaChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
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
        // 面积图包含双序列，使用更高的默认尺寸避免曲线与坐标轴过度拥挤。
        height: 440,
        exportable: true,
      },
    };

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }

  /** iframe 嵌入 Mock 数据 */
  private emitIframeChart(sessionId: string, messageId: string): void {
    const chart: ChartMessage = {
      type: 'chart',
      messageId,
      chartType: 'iframe',
      payload: {
        // 使用 example.com 作为安全的测试 URL
        url: 'https://example.com',
        height: 400,
        allowFullscreen: true,
      },
    };

    const chartMsg: WsChartMessage = { type: 'chart', sessionId, messageId, chart };
    this.emit(chartMsg);
  }
}

export const mockWsService = new MockWebSocketService();
