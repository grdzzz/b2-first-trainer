/// <reference types="vite/client" />
import type { BridgeApi } from '@shared/api'

declare global {
  interface Window {
    api: BridgeApi
  }
}

declare module '*?raw' {
  const content: string
  export default content
}
