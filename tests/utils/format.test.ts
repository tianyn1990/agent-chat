import { describe, it, expect } from 'vitest';
import { formatFileSize, truncate } from '@/utils/format';

describe('format 工具函数', () => {
  describe('formatFileSize', () => {
    it('小于 1KB 显示 B', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('大于等于 1KB 显示 KB', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('大于等于 1MB 显示 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('大于等于 1GB 显示 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('truncate', () => {
    it('不超过 maxLength 时原样返回', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('超过 maxLength 时截断加省略号', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });

    it('默认 maxLength 为 50', () => {
      const long = 'a'.repeat(60);
      const result = truncate(long);
      expect(result).toHaveLength(53); // 50 + '...'
    });
  });
});
