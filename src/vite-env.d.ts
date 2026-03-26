/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_CHAT_RUNTIME: string;
  readonly VITE_FEISHU_APP_ID: string;
  readonly VITE_FEISHU_REDIRECT_URI: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_OPENCLAW_GATEWAY_URL: string;
  readonly VITE_OPENCLAW_GATEWAY_TOKEN: string;
  readonly VITE_OPENCLAW_GATEWAY_PASSWORD: string;
  readonly VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN: string;
  readonly VITE_OPENCLAW_GATEWAY_ROLE: string;
  readonly VITE_OPENCLAW_GATEWAY_SCOPES: string;
  readonly VITE_OPENCLAW_CLIENT_INSTANCE_ID: string;
  readonly VITE_OPENCLAW_PROXY_URL: string;
  readonly VITE_OPENCLAW_PROXY_DEV_TARGET: string;
  readonly VITE_STAR_OFFICE_URL: string;
  readonly VITE_STAR_OFFICE_REAL_DEV_ENABLED: string;
  readonly VITE_STAR_OFFICE_REAL_DEV_BASE: string;
  readonly VITE_STAR_OFFICE_UPSTREAM_DIR: string;
  readonly VITE_MOCK_ENABLED: string;
  readonly VITE_STAR_OFFICE_MOCK_ENABLED: string;
  readonly VITE_STAR_OFFICE_MOCK_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
