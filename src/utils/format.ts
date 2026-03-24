import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

/**
 * 格式化消息时间戳
 * - 今天内：显示 HH:mm
 * - 昨天：昨天 HH:mm
 * - 今年内：MM月DD日 HH:mm
 * - 跨年：YYYY年MM月DD日
 */
export function formatMessageTime(timestamp: number): string {
  const d = dayjs(timestamp);
  const now = dayjs();

  if (d.isSame(now, 'day')) {
    return d.format('HH:mm');
  } else if (d.isSame(now.subtract(1, 'day'), 'day')) {
    return `昨天 ${d.format('HH:mm')}`;
  } else if (d.isSame(now, 'year')) {
    return d.format('MM月DD日 HH:mm');
  } else {
    return d.format('YYYY年MM月DD日');
  }
}

/**
 * 相对时间（如：3分钟前、1小时前）
 */
export function fromNow(timestamp: number): string {
  return dayjs(timestamp).fromNow();
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * 截断文本，超过指定长度显示省略号
 */
export function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
