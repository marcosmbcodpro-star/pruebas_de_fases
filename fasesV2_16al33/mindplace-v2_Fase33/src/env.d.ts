/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __MINDPLACE_SYNC_API__?: string;
  __mindplaceSyncStore?: unknown;
}
