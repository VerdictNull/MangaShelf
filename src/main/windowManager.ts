import { BrowserWindow, screen } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { AppPaths } from './appPaths'

interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
  isFullscreen: boolean
}

function stateFile(): string {
  return join(AppPaths.userData, 'window-state.json')
}

const DEFAULT_STATE: WindowState = {
  x: 0, y: 0, width: 1280, height: 800, isMaximized: false, isFullscreen: false
}

export function getWindowState(): WindowState {
  try {
    if (existsSync(stateFile())) {
      return JSON.parse(readFileSync(stateFile(), 'utf-8'))
    }
  } catch { /* ignore parse errors */ }
  return DEFAULT_STATE
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    // Never persist fullscreen — it's reader-only and the titlebar disappears in
    // fullscreen (frameless window), so there's no OS-level way to exit on relaunch.
    const state: WindowState = win.isMinimized() || win.isMaximized()
      ? { ...getWindowState(), isMaximized: win.isMaximized(), isFullscreen: false }
      : { ...win.getBounds(), isMaximized: false, isFullscreen: false }
    writeFileSync(stateFile(), JSON.stringify(state))
  } catch { /* ignore */ }
}

export function isValidWindowState(state: WindowState): boolean {
  const displays = screen.getAllDisplays()
  return displays.some((display) => {
    const { bounds } = display
    return (
      state.x >= bounds.x &&
      state.y >= bounds.y &&
      state.x + state.width <= bounds.x + bounds.width &&
      state.y + state.height <= bounds.y + bounds.height
    )
  })
}
