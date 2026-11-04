const TOKEN_KEY = 'echo:token'

export interface ServerUser {
  id: string
  email: string
  name: string
  createdAt: number
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const headers = new Headers(init.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `请求失败 ${res.status}`)
    ;(err as any).status = res.status
    throw err
  }
  return data as T
}

export const api = {
  health: () => request<{ ok: boolean; ai: boolean; model: string | null; asr: boolean }>('/api/health'),

  async register(email: string, password: string, name: string) {
    const out = await request<{ token: string; user: ServerUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    tokenStore.set(out.token)
    return out.user
  },

  async login(email: string, password: string) {
    const out = await request<{ token: string; user: ServerUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    tokenStore.set(out.token)
    return out.user
  },

  me: () => request<{ user: ServerUser }>('/api/auth/me'),

  getState: () => request<{ state: any }>('/api/state'),

  putState: (state: any) => request<{ ok: boolean }>('/api/state', { method: 'PUT', body: JSON.stringify({ state }) }),

  uploadAudio: (id: string, blob: Blob, type: string) =>
    new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => {
        const base64 = String(reader.result || '').split(',')[1] || ''
        request(`/api/audio/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({ base64, type }),
        })
          .then(() => resolve())
          .catch(reject)
      }
      reader.readAsDataURL(blob)
    }),

  async downloadAudio(id: string): Promise<Blob | null> {
    const token = tokenStore.get()
    const res = await fetch(`/api/audio/${encodeURIComponent(id)}`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) return null
    return res.blob()
  },
}
