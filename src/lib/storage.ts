import type { AiConfig, AppState } from '../types'

const KEY = 'echo:state:v1'

export const DEFAULT_AI: AiConfig = {
  mode: 'offline',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export function emptyState(): AppState {
  return {
    user: '',
    ai: { ...DEFAULT_AI },
    sessions: [],
    marks: [],
    redoneMarks: [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...emptyState(),
      ...parsed,
      ai: { ...DEFAULT_AI, ...(parsed.ai ?? {}) },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      marks: Array.isArray(parsed.marks) ? parsed.marks : [],
      redoneMarks: Array.isArray(parsed.redoneMarks) ? parsed.redoneMarks : [],
    }
  } catch (err) {
    console.warn('[echo] 读取本地数据失败，已重置', err)
    return emptyState()
  }
}

let saveTimer: number | undefined

export function saveState(state: AppState): void {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('[echo] 保存失败（可能超出 localStorage 配额）', err)
    }
  }, 120)
}

export function saveStateNow(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('[echo] 保存失败', err)
  }
}

export function clearState(): void {
  localStorage.removeItem(KEY)
}

let seq = 0

export function uid(prefix = 'id'): string {
  seq = (seq + 1) % 1000
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}
