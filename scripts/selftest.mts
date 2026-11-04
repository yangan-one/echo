import assert from 'node:assert/strict'
import { detectMoments } from '../src/lib/moments.ts'
import { computeMetrics, segmentAt } from '../src/lib/metrics.ts'
import { offlineSuggest } from '../src/lib/ai.ts'

const segs = [
  { startMs: 0, endMs: 4200, text: 'This talk is about how we read other people.' },
  { startMs: 6000, endMs: 10500, text: "He says we decide before we know, um, and we don't notice." },
  { startMs: 14200, endMs: 19000, text: 'I mean, the point is we need to slow down.' },
]

// 1) 长停顿能被抓到
const m = detectMoments({ segments: segs, durationMs: 20000 })
assert.equal(m.length >= 1, true, '应当至少给出一个候选卡点')
assert.equal(m.some((x) => x.kind === 'pause'), true, '应当识别出长停顿')

// 改口单独验证（没有长停顿干扰时）
const repairOnly = detectMoments({
  segments: [
    { startMs: 0, endMs: 2000, text: 'I mean, we should stop here.' },
    { startMs: 2200, endMs: 4200, text: 'That is the point I wanted to make.' },
  ],
  durationMs: 5000,
})
assert.equal(repairOnly.some((x) => x.kind === 'repair'), true, '应当识别出改口（i mean）')

// 2) 已经标过的地方不重复推荐
const marked = detectMoments({
  segments: segs,
  durationMs: 20000,
  marks: [
    {
      id: 'x',
      sessionId: 's',
      startMs: 5500,
      endMs: 10800,
      tag: 'broken',
      intent: '',
      heard: '',
      status: 'pending',
      createdAt: 0,
    },
  ],
})
assert.equal(
  marked.every((x) => !(x.startMs < 10800 + 1200 && x.endMs > 5500 - 1200)),
  true,
  '已标记区间不该再次推荐',
)

// 3) 指标与定位
const met = computeMetrics(segs, 20000)
assert.equal(met.words > 0, true)
assert.equal(met.pauses >= 1, true)
const hit = segmentAt(segs, 7000)
assert.equal(hit?.startMs, 6000)

// 4) 离线建议：材料原句定位 / 判断句通道 / 硬伤 / 兜底完整句
const materialText =
  "Tell me about something you got wrong. Most candidates describe a difficult project or a slow team, but they leave themselves out of the sentence."
const fromMaterial = offlineSuggest('broken', 'tell me about something you got wrong', '', materialText)
assert.equal(
  fromMaterial.original,
  'Tell me about something you got wrong.',
  '应当定位到材料里对应的原句',
)
assert.equal(fromMaterial.source, 'offline')

const judge = offlineSuggest('wordgap', 'the answer', '这种言论是不准确的')
assert.equal(
  judge.options.some((o) => o.text === "That claim isn't accurate."),
  true,
  '中文是判断句时应当直接给判断句',
)

const hardError = offlineSuggest('wrong', 'I am agree with you', '')
assert.equal(hardError.tier, 'must', '明确硬伤应当标为必改')

const fallback = offlineSuggest('tone', 'we need to study each others strengths', '')
assert.equal(fallback.options.length >= 2, true, '兜底也至少给两条')
assert.equal(
  fallback.options.every((o) => /[.!?]$/.test(o.text.trim())),
  true,
  '兜底建议必须是完整句、以标点结尾',
)

// 5) 自己的句子升级：不丢通用模板，而是在原句上收紧
const upgraded = offlineSuggest('unnatural', 'I think that this is not very good for the team', '')
assert.equal(upgraded.options.length, 3, '应当给三条')
assert.equal(
  upgraded.options.some((o) => o.text.includes("I'd say")),
  true,
  `I think that 应当收成 I'd say`,
)
assert.equal(
  upgraded.options.some((o) => o.text.includes("isn't")),
  true,
  `is not 应当缩成 isn't`,
)
assert.equal(upgraded.tier, 'upgrade')

console.log('selftest ok:', {
  moments: m.map((x) => x.kind),
  words: met.words,
  wpm: met.wpm,
  segmentAt: hit?.startMs,
})
