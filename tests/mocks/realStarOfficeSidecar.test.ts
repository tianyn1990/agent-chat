import { describe, expect, it } from 'vitest';
import {
  buildStarOfficeIdleStatusResponse,
  buildStarOfficeSessionFacadeUrl,
  buildStarOfficeUnavailableHtml,
  matchStarOfficeSessionRoute,
  normalizeStarOfficeIncomingState,
  normalizeStarOfficeRealDevBase,
  rewriteStarOfficeIndexHtml,
} from '@/mocks/starOffice/realSidecar';

describe('realStarOfficeSidecar helpers', () => {
  it('normalizeStarOfficeRealDevBase 会补齐前导斜杠并移除尾部斜杠', () => {
    expect(normalizeStarOfficeRealDevBase('star-office/')).toBe('/star-office');
  });

  it('buildStarOfficeSessionFacadeUrl 会为基础路径补齐 session 段', () => {
    expect(buildStarOfficeSessionFacadeUrl('/star-office', 'session_alpha')).toBe(
      '/star-office/session/session_alpha/',
    );
  });

  it('buildStarOfficeSessionFacadeUrl 支持替换显式占位符', () => {
    expect(
      buildStarOfficeSessionFacadeUrl(
        'https://office.example.com/session/{sessionId}/',
        'session beta',
      ),
    ).toBe('https://office.example.com/session/session%20beta/');
  });

  it('matchStarOfficeSessionRoute 能解析会话与资源路径', () => {
    expect(matchStarOfficeSessionRoute('/star-office/session/session_1/static/vendor/phaser.js', '/star-office')).toEqual({
      sessionId: 'session_1',
      assetPath: 'static/vendor/phaser.js',
    });
  });

  it('rewriteStarOfficeIndexHtml 会注入 fetch bridge、缩放完整主舞台并改写静态资源路径', () => {
    const html = `
      <html>
        <head></head>
        <body>
          <div id="main-stage">
            <div id="game-container"></div>
            <div id="bottom-panels"></div>
          </div>
          <script src="/static/vendor/phaser.js"></script>
        </body>
      </html>
    `;

    const rewritten = rewriteStarOfficeIndexHtml(html, '/star-office/session/session_2');
    expect(rewritten).toContain('window.__STAR_OFFICE_SESSION_BASE__');
    expect(rewritten).toContain('/star-office/session/session_2/static/vendor/phaser.js');
    expect(rewritten).toContain('oc-embedded-hidden');
    expect(rewritten).toContain('--oc-embedded-stage-scale');
    expect(rewritten).toContain("window.addEventListener('resize', fitEmbeddedStage)");
    expect(rewritten).toContain('#main-stage.oc-embedded-main-stage');
    expect(rewritten).toContain('#game-container.oc-embedded-game-container');
  });

  it('buildStarOfficeIdleStatusResponse 返回可直接渲染的 idle 结构', () => {
    expect(buildStarOfficeIdleStatusResponse('session_idle')).toMatchObject({
      sessionId: 'session_idle',
      state: 'idle',
      detail: '等待该会话的执行状态',
      progress: 100,
    });
  });

  it('normalizeStarOfficeIncomingState 会兼容上游别名状态', () => {
    expect(normalizeStarOfficeIncomingState('working')).toBe('writing');
    expect(normalizeStarOfficeIncomingState('sync')).toBe('syncing');
  });

  it('buildStarOfficeUnavailableHtml 会输出包含会话 ID 的诊断页', () => {
    const html = buildStarOfficeUnavailableHtml('不可用', '缺少上游目录', 'session_diag');
    expect(html).toContain('session_diag');
    expect(html).toContain('缺少上游目录');
    expect(html).toContain('theme-dark');
  });

  it('buildStarOfficeUnavailableHtml 支持生成 light 主题诊断页', () => {
    const html = buildStarOfficeUnavailableHtml(
      '不可用',
      '缺少上游目录',
      'session_light',
      'light',
    );

    expect(html).toContain('theme-light');
    expect(html).toContain('#f3f6fa');
    expect(html).toContain('oc_theme_mode');
  });
});
