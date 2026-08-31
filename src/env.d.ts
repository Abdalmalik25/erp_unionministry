/// <reference types="vite/client" />

// Vite Environment Type Definitions
interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_NEON_DATABASE_URL: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
