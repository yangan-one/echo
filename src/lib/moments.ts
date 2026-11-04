import type { Mark, Metrics, TranscriptSeg } from '../types'

export type MomentKind = 'pause' | 'filler' | 'repair' | 'slowdown' | 'volume'

export interface Moment {
  startMs: number
  endMs: number
  kind: MomentKind
  /** 给用户看的一句话，例如「这里停了 1.9 秒」 */
  label: string
  /** 为什么算可疑，1 句话 */
  why: string
  /** 越大越可疑，用于排序 */
  score: number
}

const FILLER_RE = /\b(um+|uh+|er+|ah+|you know|i mean|sort of|kind of|like,? you know)\b/gi
const REPAIR_RE = /\b(i mean|sorry|no wait|let me rephrase|wait,? no)\b/gi

const wordsOf = (s: string) => (s.match(/[A-Za-z0-9']+/g) || []).length

/** 把词均匀铺在段落里，粗略得到「每个词大概什么时候说的」 */
function wordTimeline(segments: TranscriptSeg[]) {
  const out: { at: number; word: string }[] = []
  for (const seg of segments) {
    const ws = seg.text.match(/[A-Za-z0-9']+/g) || []
    if (!ws.length) continue
    const span = Math.max(1, seg.endMs - seg.startMs)
    ws.forEach((w, i) => out.push({ at: seg.startMs + (span * (i + 0.5)) / ws.length, word: w }))
  }
  return out
}

/**
 * 从录音的包络与转写里找「可能卡住」的位置。
 * 目的是把「你要自己意识到哪句不对」变成「系统先指几处，你确认或否掉」。
 */
export function detectMoments(opts: {
  peaks?: number[]
  segments: TranscriptSeg[]
  durationMs: number
  metrics?: Metrics
  marks?: Mark[]
  limit?: number
}): Moment[] {
  const { peaks, segments, durationMs, marks = [], limit = 3 } = opts
  const found: Moment[] = []
  const span = Math.max(1, durationMs)

  // 1) 长停顿：相邻转写段之间的空档，或者一段里明显拖住
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].startMs - segments[i - 1].endMs
    if (gap >= 1500) {
      found.push({
        startMs: segments[i - 1].endMs,
        endMs: segments[i].startMs,
        kind: 'pause',
        label: `这里停了 ${(gap / 1000).toFixed(1)} 秒`,
        why: '停得太久，通常是没想好下一句怎么说',
        score: 60 + Math.min(20, gap / 200),
      })
    }
  }

  // 2) 口头语成串
  const bySeg = segments.map((s) => ({ seg: s, fillers: (s.text.match(FILLER_RE) || []).length }))
  for (let i = 0; i < bySeg.length; i++) {
    let count = 0
    let end = i
    while (end < bySeg.length && bySeg[end].seg.startMs - bySeg[i].seg.startMs <= 8000) {
      count += bySeg[end].fillers
      end++
    }
    if (count >= 2) {
      found.push({
        startMs: bySeg[i].seg.startMs,
        endMs: bySeg[Math.max(i, end - 1)].seg.endMs,
        kind: 'filler',
        label: `这 8 秒里有 ${count} 个口头语`,
        why: '口头语成串，通常是在边想边说',
        score: 45 + count * 6,
      })
      i = end - 1
    }
  }

  // 3) 改口 / 自我纠正
  for (const s of segments) {
    const hits = s.text.match(REPAIR_RE)
    if (hits) {
      found.push({
        startMs: s.startMs,
        endMs: s.endMs,
        kind: 'repair',
        label: `这里你改口了（${hits[0]}）`,
        why: '说到一半推翻自己，说明这句没想清楚',
        score: 92,
      })
    }
  }

  // 4) 语速骤降：6 秒窗口的词数与中位数相比
  const tl = wordTimeline(segments)
  if (tl.length >= 12) {
    const win = 6000
    const counts: { at: number; n: number }[] = []
    for (let t = 0; t + win <= span; t += 1500) {
      counts.push({ at: t, n: tl.filter((w) => w.at >= t && w.at < t + win).length })
    }
    const sorted = counts.map((c) => c.n).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] || 0
    const slow = counts.filter((c) => median >= 6 && c.n <= median * 0.45 && c.n >= 2)
    if (slow.length) {
      const c = slow[0]
      found.push({
        startMs: c.at,
        endMs: Math.min(span, c.at + win),
        kind: 'slowdown',
        label: '这 6 秒明显放慢了',
        why: '语速掉下来，往往是词不够用或句子没组织好',
        score: 50 + (median - c.n) * 2,
      })
    }
  }

  // 5) 音量掉下去（只有拿到包络才判断）
  if (peaks && peaks.length > 20) {
    const bucket = Math.max(1, Math.floor(peaks.length / 60))
    const smooth: number[] = []
    for (let i = 0; i < peaks.length; i += bucket) {
      const slice = peaks.slice(i, i + bucket)
      smooth.push(slice.reduce((a, b) => a + b, 0) / slice.length)
    }
    const med = [...smooth].sort((a, b) => a - b)[Math.floor(smooth.length / 2)] || 0
    if (med > 0.08) {
      let run = 0
      for (let i = 0; i < smooth.length; i++) {
        run = smooth[i] < med * 0.28 ? run + 1 : 0
        const ms = (run * bucket * span) / peaks.length
        if (ms >= 1200) {
          const endMs = ((i + 1) * span) / smooth.length
          found.push({
            startMs: Math.max(0, endMs - ms - 400),
            endMs,
            kind: 'volume',
            label: '这里声音掉下去了',
            why: '音量突然变小，是「没底气」最直接的信号',
            score: 40,
          })
          break
        }
      }
    }
  }

  // 去掉和已有标记重叠的、以及互相重叠的（留分数高的）
  const near = (a: Moment, b: Mark) =>
    a.startMs < b.endMs + 1200 && a.endMs > b.startMs - 1200
  const pool = found
    .filter((m) => m.endMs - m.startMs >= 400)
    .filter((m) => !marks.some((mk) => near(m, mk)))
    .sort((a, b) => b.score - a.score)

  const picked: Moment[] = []
  for (const m of pool) {
    if (picked.some((p) => m.startMs < p.endMs + 1500 && m.endMs > p.startMs - 1500)) continue
    picked.push(m)
    if (picked.length >= limit) break
  }
  return picked.sort((a, b) => a.startMs - b.startMs)
}
