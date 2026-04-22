/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_ANONYMOUS_AUTH: string;
  readonly VITE_STRICT_TENANT_CLAIMS: string;
  readonly VITE_ENABLE_AUTO_SEED: string;
  readonly VITE_ENABLE_DEV_PANEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
