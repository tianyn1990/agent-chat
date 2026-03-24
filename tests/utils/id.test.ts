import { describe, it, expect } from 'vitest';
import { generateId, prefixedId } from '@/utils/id';

describe('id 工具函数', () => {
  describe('generateId', () => {
    it('返回 UUID v4 格式字符串', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('每次调用返回不同的值', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('prefixedId', () => {
    it('返回带前缀的 ID', () => {
      const id = prefixedId('msg');
      expect(id.startsWith('msg_')).toBe(true);
    });

    it('相同前缀的两次调用结果不同', () => {
      expect(prefixedId('test')).not.toBe(prefixedId('test'));
    });
  });
});
