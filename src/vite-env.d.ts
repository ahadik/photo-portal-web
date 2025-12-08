/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  // Note: VITE_MAPBOX_TOKEN is NOT used in client-side code - it's only used server-side in Firebase Functions
  readonly VITE_MEDIA_BUCKET?: string
  readonly VITE_DATA_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
