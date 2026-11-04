import type { TranscriptSeg } from '../types'

export interface AsrEndpoint {
  /** 例：http://127.0.0.1:8000/v1/audio/transcriptions */
  url: string
  model?: string
  token?: string
}

interface RawSeg {
  start?: number
  end?: number
  text?: string
}

/**
 * 把录音发给本机（或局域网）的转写服务。
 * 兼容 OpenAI /v1/audio/transcriptions 的 verbose_json 返回：
 *   { text, segments: [{ start, end, text }] }  // 秒
 * faster-whisper 的 server、whisper.cpp 的 server 都这套形状。
 */
export async function transcribeWithEndpoint(blob: Blob, cfg: AsrEndpoint): Promise<TranscriptSeg[]> {
  if (!cfg.url) throw new Error('没有填写转写服务地址')
  const form = new FormData()
  form.append('file', blob, 'speech.webm')
  form.append('model', cfg.model || 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')
  form.append('language', 'en')

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 90000)
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      body: form,
      headers: cfg.token
        ? {
            Authorization:
              cfg.token === 'server' && typeof localStorage !== 'undefined'
                ? 'Bearer ' + (localStorage.getItem('echo:token') || '')
                : 'Bearer ' + cfg.token,
          }
        : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`转写服务返回 ${res.status}`)
    const data: any = await res.json()
    const raw: RawSeg[] = Array.isArray(data?.segments) ? data.segments : []
    if (raw.length) {
      return raw
        .filter((s) => (s.text || '').trim())
        .map((s) => ({
          startMs: Math.round((s.start ?? 0) * 1000),
          endMs: Math.round((s.end ?? (s.start ?? 0) + 1) * 1000),
          text: String(s.text).trim(),
        }))
    }
    const text = String(data?.text || '').trim()
    if (!text) return []
    // 服务只回了整段文字：按标点切成段，时间轴留空（定位会退化到「整段」）
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .map((t, i) => ({ startMs: i * 4000, endMs: (i + 1) * 4000, text: t }))
  } finally {
    window.clearTimeout(timer)
  }
}
