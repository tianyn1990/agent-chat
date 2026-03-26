/**
 * Node 测试环境初始化。
 *
 * 设计原因：
 * - 大多数纯逻辑测试不需要 DOM，但仍有少量工具/状态模块依赖 `localStorage`
 * - 在 `node` 环境中补一个极轻量 polyfill，比整批切回 `jsdom` 更高效
 */
export function installNodeTestEnvironment(): void {
  if ('localStorage' in globalThis) {
    return;
  }

  let store: Record<string, string> = {};

  const localStorageMock: Storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });
}
