/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_WHATSAPP_DEFAULT_NUMBER?: string
  /** Contraseña del /admin MVP (si no se define, se usa fallback de desarrollo). */
  readonly VITE_ADMIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
