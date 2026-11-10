import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const OUT = ROOT + '/public/audio/open'
const CACHE_DIR = ROOT + '/scripts/.cue_cache'
mkdirSync(OUT, { recursive: true })
mkdirSync(CACHE_DIR, { recursive: true })

const UA = 'Mozilla/5.0 EchoBuilder/1.0'
async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(url + ' ' + r.status)
  return r.text()
}

function parseVtt(text) {
  const out = []
  for (const b of text.split(/\r?\n\r?\n/)) {
    const m = b.match(/(\d\d):(\d\d):(\d\d)\.(\d\d\d) --> (\d\d):(\d\d):(\d\d)\.(\d\d\d)/)
    if (!m) continue
    const st = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
    const en = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
    const body = b
      .split('\n')
      .filter((l) => !/-->/.test(l) && !/^\d+$/.test(l.trim()) && !/^WEBVTT/.test(l))
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (body) out.push({ st, en, text: body })
  }
  return out.sort((a, b) => a.st - b.st)
}

const cache = new Map()
async function cues(id) {
  if (cache.has(id)) return cache.get(id)
  const cf = CACHE_DIR + '/' + id + '.json'
  if (existsSync(cf)) {
    const c = JSON.parse(readFileSync(cf, 'utf8'))
    cache.set(id, c)
    return c
  }
  const base = `https://hls.ted.com/project_masters/${id}/subtitles/`
  const list = await get(base + 'en.m3u8')
  const shards = list.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const all = []
  for (const s of shards) {
    try {
      all.push(...parseVtt(await get(new URL(s, base).href)))
    } catch {}
  }
  all.sort((a, b) => a.st - b.st)
  cache.set(id, all)
  writeFileSync(cf, JSON.stringify(all))
  return all
}

function cutAudio(id, start, dur, file) {
  return new Promise((resolve) => {
    if (existsSync(file) && process.env.FORCE !== '1') return resolve(true)
    const url = `https://hls.ted.com/project_masters/${id}/index-f5-a1.m3u8`
    execFile(
      FF,
      ['-y', '-ss', String(start), '-t', String(dur), '-i', url, '-vn', '-ac', '1', '-ar', '22050', '-b:a', '48k', file],
      { maxBuffer: 1 << 22 },
      (err) => resolve(!err && existsSync(file))
    )
  })
}

function buildWindow(cs, start, target, minDur) {
  const picked = []
  let end = start
  for (const c of cs) {
    if (c.st + 0.2 < start) continue
    if (c.st > start + target + 12) break
    if (end > start && c.en - start > target + 6) break
    picked.push(c)
    end = c.en
    if (end - start >= target && /[.!?]["”']?$/.test(c.text)) break
  }
  if (end - start < minDur && picked.length) end = picked[picked.length - 1].en
  return { start, end, picked }
}

const files = readdirSync(ROOT + '/scripts').filter((f) => /^ted_result.*\.json$/.test(f))
const seen = new Set()
const talks = []
for (const f of files) {
  try {
    for (const t of JSON.parse(readFileSync(ROOT + '/scripts/' + f, 'utf8'))) {
      if (!t.id || seen.has(t.key)) continue
      seen.add(t.key)
      talks.push(t)
    }
  } catch {}
}

const only = process.argv[2] ? process.argv[2].split(',') : null
const results = []
for (const t of talks) {
  if (only && !only.includes(t.key)) continue
  try {
    const cs = await cues(t.id)
    if (!cs.length) {
      console.log('skip', t.key, 'no cues')
      continue
    }
    const start = cs[0].st
    const w30 = buildWindow(cs, start, 30, 24)
    const w60 = buildWindow(cs, start, 60, 48)
    const f30 = `${OUT}/${t.key}_30.mp3`
    const f60 = `${OUT}/${t.key}_60.mp3`
    const ok30 = await cutAudio(t.id, w30.start + 0.25, Math.round((w30.end - w30.start) * 10) / 10, f30)
    const ok60 = await cutAudio(t.id, w60.start + 0.25, Math.round((w60.end - w60.start) * 10) / 10, f60)
    results.push({
      key: t.key,
      id: t.id,
      title: t.tt,
      category: t.category,
      accent: t.accent,
      d30: +(w30.end - w30.start).toFixed(1),
      d60: +(w60.end - w60.start).toFixed(1),
      text30: w30.picked.map((p) => p.text).join(' '),
      text60: w60.picked.map((p) => p.text).join(' '),
    })
    console.log(`${t.key} ${ok30 ? '30✓' : '30✗'} ${ok60 ? '60✓' : '60✗'} ${(w30.end - w30.start).toFixed(0)}s/${(w60.end - w60.start).toFixed(0)}s :: ${w30.picked.map((p) => p.text).join(' ').slice(0, 60)}`)
  } catch (e) {
    console.log('ERR', t.key, e.message)
  }
}

const jf = ROOT + '/scripts/openings.json'
const prev = existsSync(jf) ? JSON.parse(readFileSync(jf, 'utf8')) : []
const merged = new Map(prev.map((r) => [r.key, r]))
for (const r of results) merged.set(r.key, r)
writeFileSync(jf, JSON.stringify([...merged.values()], null, 1))
console.log('wrote', merged.size, 'rows (this run', results.length + ')')
