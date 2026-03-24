import '@testing-library/jest-dom';

// 模拟 localStorage
const localStorageMock: Storage = (() => {
  let store: Record<string, string> = {};

  return {
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
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// 模拟 window.matchMedia（Ant Design 需要）
// 使用 eslint-disable 注释标注空函数是故意为之的 stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    /* eslint-disable @typescript-eslint/no-empty-function */
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    /* eslint-enable @typescript-eslint/no-empty-function */
    dispatchEvent: () => false,
  }),
});

/**
 * JSDOM 尚未实现带 pseudo element 参数的 getComputedStyle。
 * Ant Design / rc-* 组件在测试环境中会以 `::before` / `::after` 形式调用，
 * 这里统一忽略第二个参数，避免输出大批无意义报错噪音。
 */
const originalGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element) => originalGetComputedStyle(element)) as typeof window.getComputedStyle;

// 抑制 Ant Design 测试环境中的 console.error
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // 过滤掉 React 测试中的已知警告
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// 每个测试后清除 localStorage
afterEach(() => {
  localStorage.clear();
});
