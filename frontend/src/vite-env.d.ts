/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_KAKAO_MAP_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_KAKAO_JS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
