import { describe, expect, it } from 'vitest';
import {
  appendSessionIdToUrl,
  appendQueryParamsToUrl,
  buildRealStarOfficeFacadeUrl,
  buildLocalStarOfficeMockAppUrl,
  normalizeStarOfficeMockBase,
  resolveStarOfficeIframeUrl,
} from '@/utils/starOffice';

describe('starOffice utils', () => {
  it('normalizeStarOfficeMockBase 会补齐前导斜杠并移除尾部斜杠', () => {
    expect(normalizeStarOfficeMockBase('mock/star-office/')).toBe('/mock/star-office');
  });

  it('appendSessionIdToUrl 为相对地址追加 sessionId', () => {
    expect(appendSessionIdToUrl('/star-office/', 'session_1')).toBe(
      '/star-office/?sessionId=session_1',
    );
  });

  it('appendSessionIdToUrl 为绝对地址追加 sessionId', () => {
    expect(appendSessionIdToUrl('https://example.com/star-office', 'session_2')).toBe(
      'https://example.com/star-office?sessionId=session_2',
    );
  });

  it('appendQueryParamsToUrl 会同时保留已有查询参数与 hash', () => {
    expect(
      appendQueryParamsToUrl('/star-office/?from=visualize#stage', {
        sessionId: 'session_theme',
        themeMode: 'light',
      }),
    ).toBe('/star-office/?from=visualize&sessionId=session_theme&themeMode=light#stage');
  });

  it('buildLocalStarOfficeMockAppUrl 生成本地 mock 页面地址', () => {
    expect(buildLocalStarOfficeMockAppUrl('session_3', '/__mock/star-office')).toBe(
      '/__mock/star-office/app?sessionId=session_3',
    );
  });

  it('buildLocalStarOfficeMockAppUrl 支持透传主题模式', () => {
    expect(buildLocalStarOfficeMockAppUrl('session_light', '/__mock/star-office', 'light')).toBe(
      '/__mock/star-office/app?sessionId=session_light&themeMode=light',
    );
  });

  it('buildRealStarOfficeFacadeUrl 按会话级 facade 生成真实地址', () => {
    expect(buildRealStarOfficeFacadeUrl('session_4', '/star-office')).toBe(
      '/star-office/session/session_4/',
    );
  });

  it('buildRealStarOfficeFacadeUrl 支持透传主题模式', () => {
    expect(buildRealStarOfficeFacadeUrl('session_4', '/star-office', 'light')).toBe(
      '/star-office/session/session_4/?themeMode=light',
    );
  });

  it('resolveStarOfficeIframeUrl 优先使用真实地址', () => {
    expect(
      resolveStarOfficeIframeUrl('session_4', {
        starOfficeUrl: '/star-office',
        realDevEnabled: true,
        realDevBase: '/star-office',
        mockEnabled: true,
        mockBase: '/__mock/star-office',
      }),
    ).toBe('/star-office/session/session_4/');
  });

  it('resolveStarOfficeIframeUrl 在未配置真实地址时优先使用真实联调模式', () => {
    expect(
      resolveStarOfficeIframeUrl('session_real_dev', {
        starOfficeUrl: '',
        realDevEnabled: true,
        realDevBase: '/star-office',
        mockEnabled: true,
        mockBase: '/__mock/star-office',
      }),
    ).toBe('/star-office/session/session_real_dev/');
  });

  it('resolveStarOfficeIframeUrl 在未配置真实地址时回退到本地 mock', () => {
    expect(
      resolveStarOfficeIframeUrl('session_5', {
        starOfficeUrl: '',
        realDevEnabled: false,
        realDevBase: '/star-office',
        mockEnabled: true,
        mockBase: '/__mock/star-office',
      }),
    ).toBe('/__mock/star-office/app?sessionId=session_5');
  });

  it('resolveStarOfficeIframeUrl 会把主题模式透传给最终 iframe 地址', () => {
    expect(
      resolveStarOfficeIframeUrl('session_5', {
        starOfficeUrl: '',
        realDevEnabled: false,
        realDevBase: '/star-office',
        mockEnabled: true,
        mockBase: '/__mock/star-office',
        themeMode: 'light',
      }),
    ).toBe('/__mock/star-office/app?sessionId=session_5&themeMode=light');
  });

  it('resolveStarOfficeIframeUrl 在全部关闭时返回空字符串', () => {
    expect(
      resolveStarOfficeIframeUrl('session_6', {
        starOfficeUrl: '',
        realDevEnabled: false,
        realDevBase: '/star-office',
        mockEnabled: false,
        mockBase: '/__mock/star-office',
      }),
    ).toBe('');
  });
});
