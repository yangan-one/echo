import type { Metrics, TranscriptSeg } from '../types'

const FILLERS = /\b(um+|uh+|err?|ah+|hmm+|you know|i mean|sort of|kind of|like i said|anyway)\b/gi
const CORRECTIONS = /\b(i mean|sorry|no wait|what i meant|let me rephrase|actually no|hold on)\b/gi

export const EMPTY_METRICS: Metrics = { words: 0, wpm: 0, pauses: 0, fillers: 0, corrections: 0 }

export function computeMetrics(segments: TranscriptSeg[], durationMs: number): Metrics {
  const text = segments.map((s) => s.text).join(' ').trim()
  const words = (text.match(/[A-Za-z0-9']+/g) ?? []).length
  const minutes = Math.max(durationMs, 2000) / 60000

  let pauses = 0
  for (let i = 1; i < segments.length; i += 1) {
    if (segments[i].startMs - segments[i - 1].endMs > 1200) pauses += 1
  }
  if (segments.length > 0 && segments[0].startMs > 1800) pauses += 1

  return {
    words,
    wpm: Math.round(words / minutes),
    pauses,
    fillers: (text.match(FILLERS) ?? []).length,
    corrections: (text.match(CORRECTIONS) ?? []).length,
  }
}

/** 找到 atMs 落在（或最接近）的转写片段 */
export function segmentAt(segments: TranscriptSeg[], atMs: number): TranscriptSeg | null {
  if (segments.length === 0) return null
  for (const seg of segments) {
    if (atMs >= seg.startMs - 300 && atMs <= seg.endMs + 300) return seg
  }
  let best = segments[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (const seg of segments) {
    const dist = Math.min(Math.abs(atMs - seg.startMs), Math.abs(atMs - seg.endMs))
    if (dist < bestDist) {
      bestDist = dist
      best = seg
    }
  }
  return bestDist <= 4000 ? best : null
}

/** 一句话里挑出最能代表"我想说什么"的部分，用来做 AI 的上下文 */
export function shortExcerpt(seg: TranscriptSeg | null, max = 160): string {
  if (!seg) return ''
  const t = seg.text.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}
