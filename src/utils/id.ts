/**
 * 生成唯一 ID（UUID v4 简化版）
 * 用于本地生成 requestId、临时消息 ID 等
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成带前缀的 ID，便于调试时识别来源
 * @example prefixedId('msg') => 'msg_a3f4b2c1'
 */
export function prefixedId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
