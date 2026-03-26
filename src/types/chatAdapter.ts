import type { InteractiveCard } from './card';
import type { ChartMessage } from './chart';
import type { Session } from './session';
import type { SessionVisualizeRuntime } from './visualize';

/** 发送消息时的附件输入。 */
export interface ChatAdapterAttachmentInput {
  fileId: string;
  fileName: string;
  fileType: string;
}

/** 卡片交互载荷。 */
export interface ChatAdapterCardActionInput {
  tag: 'button' | 'select' | 'form';
  key: string;
  value: unknown;
}

/** Chat adapter 对 UI 暴露的领域事件。 */
export type ChatAdapterEvent =
  | {
      type: 'message.delta';
      sessionId: string;
      messageId: string;
      delta: string;
    }
  | {
      type: 'message.completed';
      sessionId: string;
      messageId: string;
    }
  | {
      type: 'message.card';
      sessionId: string;
      messageId: string;
      card: InteractiveCard;
    }
  | {
      type: 'message.chart';
      sessionId: string;
      messageId: string;
      chart: ChartMessage;
    }
  | {
      type: 'runtime.changed';
      sessionId: string;
      runtime: SessionVisualizeRuntime;
    }
  | {
      type: 'error';
      sessionId?: string;
      code: string;
      message: string;
    };

/** chat adapter 对页面层暴露的统一能力。 */
export interface ChatAdapter {
  connect(): Promise<void> | void;
  onStatus(handler: (connected: boolean) => void): () => void;
  onEvent(handler: (event: ChatAdapterEvent) => void): () => void;
  createSession(title?: string): Promise<Session>;
  listSessions(): Promise<Session[]>;
  sendMessage(
    sessionId: string,
    input: {
      text: string;
      files?: ChatAdapterAttachmentInput[];
      requestId: string;
    },
  ): Promise<void>;
  sendCardAction(
    sessionId: string,
    cardId: string,
    action: ChatAdapterCardActionInput,
  ): Promise<void>;
}
