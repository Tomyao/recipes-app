/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the deployed server, e.g. "https://recipes-app-server.vercel.app". Unset = same-origin relative /api/* (local dev, or a same-origin deployment). */
  readonly VITE_API_BASE_URL?: string;
}
