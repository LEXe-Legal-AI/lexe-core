/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ORCHESTRATOR_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_TENANT_ID: string;
  readonly VITE_GUEST_AUTH_ENABLED: string;
  readonly VITE_STREAMING_ENABLED: string;
  readonly VITE_MEMORY_ENABLED: string;
  readonly VITE_TOOLS_ENABLED: string;
  readonly VITE_ATTACHMENTS_ENABLED: string;
  readonly VITE_DEBUG: string;
  readonly VITE_DEMO_MODE: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_PRIMARY_COLOR: string;
  readonly VITE_LOGO_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
