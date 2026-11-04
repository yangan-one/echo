import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { execFileSync, execFile } from 'node:child_process'

const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const OUT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/public/audio'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const files = readdirSync('scripts').filter((f) => /^ted_result.*\.json$/.test(f))
const byKey = new Map()
for (const f of files) {
  const arr = JSON.parse(readFileSync('scripts/' + f, 'utf8'))
  for (const item of arr) if (!byKey.has(item.key)) byKey.set(item.key, item)
}
console.log('talks:', byKey.size)
// 第一批 6 条（v1.5）没有 ted_result 记录，这里补 talk id；t0 用 0，从第一个句子边界起切
const EXTRA_IDS = {
  ken_robinson: 1253,
  brene_brown: 4478,
  simon_sinek: 9629,
  celeste_headlee: 5842,
  chimamanda: 698,
  susan_cain: 804,
}
for (const [key, id] of Object.entries(EXTRA_IDS)) {
  if (!byKey.has(key)) byKey.set(key, { id, key, t0: 0 })
}

function parseVtt(text) {
  const cues = []
  const blocks = text.replace(/\r/g, '').split('\n\n')
  for (const b of blocks) {
    const m = b.match(/(\d\d):(\d\d):(\d\d)\.(\d\d\d) --> (\d\d):(\d\d):(\d\d)\.(\d\d\d)/)
    if (!m) continue
    const st = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
    const en = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
    const lines = b.split('\n')
    const body = lines
      .slice(lines.findIndex((l) => l.includes('-->')) + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (body) cues.push({ st, en, text: body })
  }
  return cues
}

const cache = new Map()
async function fetchCues(id, lang) {
  const ck = id + lang
  if (cache.has(ck)) return cache.get(ck)
  const base = `https://hls.ted.com/project_masters/${id}/subtitles/`
  let out = []
  try {
    const pl = await (await fetch(base + lang + '.m3u8')).text()
    const segs = pl.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    for (const s of segs) {
      const t = await (await fetch(base + s.trim())).text()
      out = out.concat(parseVtt(t))
    }
    out.sort((a, b) => a.st - b.st)
  } catch (e) {
    out = []
  }
  cache.set(ck, out)
  return out
}

const SENT_END = /[.!?]["')\]]?$/
const pickStart = (cues, t0) => {
  if (t0 <= 0.5 && cues[0]) return cues[0].st + 0.12
  for (let i = 1; i < cues.length; i++) {
    const c = cues[i]
    if (c.st < t0 + 2) continue
    const prev = cues[i - 1]
    if (prev && SENT_END.test(prev.text) && /^[A-Z0-9"']/.test(c.text)) return c.st + 0.12
  }
  return null
}

function dedupeText(s) {
  const parts = (s.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g) || [s]).map((p) => p.trim()).filter(Boolean)
  const out = []
  for (const p of parts) {
    const n = p.replace(/[^a-z0-9 ]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    if (!n) continue
    const prev = out.length ? out[out.length - 1].replace(/[^a-z0-9 ]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : ''
    if (prev && (n === prev || (' ' + prev).endsWith(' ' + n))) continue
    out.push(p)
  }
  let cur = out.join(' ').replace(/\s+([,.!?])/g, '$1').replace(/\s+/g, ' ').trim()
  for (let n = 12; n >= 5; n--) {
    const core = "(?:[\\w']+[ ,]+){" + (n - 1) + "}[\\w']+[ ,]+"
    const re = new RegExp('\\b(' + core + ')\\1', 'gi')
    let prev
    let guard = 0
    do {
      prev = cur
      cur = cur.replace(re, '$1')
    } while (cur !== prev && ++guard < 20)
  }
  return cur.replace(/\s{2,}/g, ' ').trim()
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// 第一批 6 条没有 t0 记录：用素材文本的前几个词在字幕里找回窗口起点
const materialText = new Map()
for (const f of ['realMaterials.ts', 'realMaterialsB.ts', 'realMaterialsC.ts', 'realMaterialsD.ts']) {
  const src = readFileSync('src/data/' + f, 'utf8')
  for (const m of src.matchAll(/audioUrl: '\/audio\/([\w-]+)\.mp3'[\s\S]{0,600}?text: `([^`]*)`/g)) {
    materialText.set(m[1], m[2])
  }
  for (const m of src.matchAll(/text: `([^`]*)`[\s\S]{0,600}?audioUrl: '\/audio\/([\w-]+)\.mp3'/g)) {
    if (!materialText.has(m[2])) materialText.set(m[2], m[1])
  }
}
const findWindow = (cues, key) => {
  const mt = materialText.get(key)
  if (!mt) return null
  const head = norm(mt).split(' ').slice(0, 6).join(' ')
  if (head.split(' ').length < 4) return null
  for (let i = 0; i < cues.length; i++) {
    // 字幕按滚动方式切块，一句话可能跨 2–3 个 cue
    for (const span of [1, 2, 3]) {
      const joined = norm(cues.slice(i, i + span).map((c) => c.text).join(' '))
      if (joined.startsWith(head)) return cues[i].st
    }
  }
  return null
}

const only = process.argv[2]
const results = []
const runFfmpeg = (args) =>
  new Promise((resolve, reject) => {
    execFile(FF, args, { maxBuffer: 1 << 26 }, (err) => (err ? reject(err) : resolve()))
  })

async function runOne(key, t) {
  const en = await fetchCues(t.id, 'en')
  if (!en.length) { console.log('skip no cues', key); return }
  let t0 = t.t0
  if (t0 <= 0.5) {
    const found = findWindow(en, key)
    if (found != null) t0 = Math.max(0, found - 0.5)
  }
  const start = pickStart(en, t0)
  if (start == null) { console.log('skip no boundary', key); return }
  const zh = await fetchCues(t.id, 'zh-cn').catch(() => [])
  const inside = en.filter((c) => c.en > start + 0.2 && c.st < start + 31)
  if (inside.length < 3) { console.log('skip too few cues', key); return }
  // 以最后一个完整句子的结尾为准，避免文本停在半句；太短就往后延到 ≥22 秒
  let cut = inside.length - 1
  while (cut > 1 && !SENT_END.test(inside[cut].text)) cut--
  for (let j = cut; j < inside.length; j++) {
    if (SENT_END.test(inside[j].text) && inside[j].en + 0.25 - start >= 22) { cut = j; break }
  }
  const kept = inside.slice(0, cut + 1)
  const end = Math.min(kept[kept.length - 1].en + 0.25, start + 31.5)
  const dur = +(end - start).toFixed(2)
  const raw = kept.map((c) => c.text).join(' ').replace(/\s+/g, ' ')
  const text = dedupeText(raw)
  const textZh = zh.filter((c) => c.en > start + 0.2 && c.st < end).map((c) => c.text).join('')
  const file = key + '_30.mp3'
  const out = `${OUT}/${file}`
  const url = `https://hls.ted.com/project_masters/${t.id}/index-f5-a1.m3u8`
  if (!(existsSync(out) && statSync(out).size > 1000)) {
    try {
      await runFfmpeg(['-y', '-ss', String(start), '-i', url, '-t', String(dur), '-vn', '-ac', '1', '-ar', '22050', '-b:a', '48k', out])
    } catch (e) {
      console.log('ffmpeg fail', key, String(e.message).slice(0, 80))
      return
    }
  }
  const size = statSync(out).size
  console.log(key, 'start', start.toFixed(1), 'dur', dur, 'words', text.split(' ').length, 'zh', textZh.length, 'size', (size / 1024).toFixed(0) + 'KB')
  results.push({ key, id: t.id, start, dur, text, textZh, file, size })
}

const queue = [...byKey.entries()].filter(([key]) => !only || only === key)
let cursor = 0
async function worker() {
  while (cursor < queue.length) {
    const [key, t] = queue[cursor++]
    try {
      await runOne(key, t)
    } catch (e) {
      console.log('err', key, String(e.message).slice(0, 80))
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()])

const prev = existsSync('scripts/short_result.json') ? JSON.parse(readFileSync('scripts/short_result.json', 'utf8')) : []
const done = new Set(results.map((r) => r.key))
const merged = only ? prev.filter((r) => r.key !== only).concat(results) : prev.filter((r) => !done.has(r.key)).concat(results)
writeFileSync('scripts/short_result.json', JSON.stringify(merged, null, 1))
console.log('done', results.length, 'total', merged.length)
