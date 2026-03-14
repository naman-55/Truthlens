/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_API_ID?: string;
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const process: {
  env: {
    GEMINI_API_KEY?: string;
    GOOGLE_API_KEY?: string;
    API_KEY?: string;
    API_ID?: string;
    GEMINI_MODEL?: string;
  };
};