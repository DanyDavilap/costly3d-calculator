/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WAITLIST_ENDPOINT?: string;
  readonly VITE_OPEN_ACCESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
