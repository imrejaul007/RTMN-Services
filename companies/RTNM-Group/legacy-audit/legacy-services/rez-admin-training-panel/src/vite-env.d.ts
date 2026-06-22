/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_COPILOT_URL: string;
  readonly VITE_KNOWLEDGE_BASE_URL: string;
  readonly VITE_TRAINING_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
