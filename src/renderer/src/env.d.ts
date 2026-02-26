/// <reference types="vite/client" />

import type { MangaApi } from '../../preload/index'

declare global {
  interface Window {
    mangaApi: MangaApi
  }
}
