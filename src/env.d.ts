/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_WHATSAPP_DEFAULT_NUMBER?: string
  /** Contraseña del /admin MVP (si no se define, se usa fallback de desarrollo). */
  readonly VITE_ADMIN_PASSWORD?: string
  /**
   * Base URL opcional desde donde se baja el catálogo en runtime.
   * El app intentará GET `{base}/{slug}/assets/catalog.json` y cae al JSON
   * empaquetado si falla. Vacío = usa solo el JSON local.
   * Ej: https://klugsystem-public-storage.s3.us-east-1.amazonaws.com
   */
  readonly VITE_CATALOG_REMOTE_BASE?: string
  /**
   * ID del Google Sheet que contiene el catálogo (pestañas `products` y `categories`).
   * El sheet debe estar compartido como "Cualquiera con el enlace: Lector".
   * Se extrae de la URL del sheet:
   *   https://docs.google.com/spreadsheets/d/<ESTE_ES_EL_ID>/edit#gid=0
   */
  readonly VITE_CATALOG_SHEETS_ID?: string
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
