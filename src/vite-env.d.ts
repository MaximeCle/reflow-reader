/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Left unset, sync is simply unavailable: the app stays fully local. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
