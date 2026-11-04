import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const OUT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/public/audio'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const TALKS = [
  { id: 12099, key: 'jennifer_cearns', tt: 'AI 陪我们悼念、恋爱、重新连接', speaker: 'Jennifer Cearns', category: '学术', accent: '美音' },
  { id: 12104, key: 'jon_powers', tt: '化石燃料公司怎么让你的电费降不下来', speaker: 'Jon Powers', category: '新闻', accent: '美音' },
  { id: 11816, key: 'mila_rojas', tt: '孩子希望父母懂的那些「好玩」', speaker: 'Mila Rojas', category: '生活', accent: '美音' },
  { id: 12068, key: 'stacey_mclachlan', tt: '怎样让育儿没那么孤单', speaker: 'Stacey McLachlan', category: '生活', accent: '其他口音' },
  { id: 2376, key: 'monica_lewinsky', tt: '羞辱的代价', speaker: 'Monica Lewinsky', category: '双语平行', accent: '美音' },
  { id: 4567, key: 'chris_anderson', tt: 'TED 的公开演讲秘诀', speaker: 'Chris Anderson', category: '演讲', accent: '英音' },
  { id: 1937, key: 'jill_bolte_taylor', tt: '我经历了一次中风', speaker: 'Jill Bolte Taylor', category: '双语平行', accent: '美音' }
]

function parseVtt(text) {
  const cues = []
  const blocks = text.replace(/\r/g, '').split('\n\n')
  for (const b of blocks) {
    const m = b.match(/(\d\d):(\d\d):(\d\d)\.(\d\d\d) --> (\d\d):(\d\d):(\d\d)\.(\d\d\d)/)
    if (!m) continue
    const st = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000
    const en = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / 1000
    const body = b.split('\n').slice(b.split('\n').findIndex((l) => l.includes('-->')) + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (body) cues.push({ st, en, text: body })
  }
  return cues
}

async function fetchCues(id, lang) {
  const base = `https://hls.ted.com/project_masters/${id}/subtitles/`
  const pl = await (await fetch(base + lang + '.m3u8')).text()
  const segs = pl.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
  let all = []
  for (const s of segs) {
    const u = base + s.trim()
    const t = await (await fetch(u)).text()
    all = all.concat(parseVtt(t))
  }
  return all.sort((a, b) => a.st - b.st)
}

function pickWindow(cues) {
  const CUT = 75
  let best = null
  for (let i = 0; i < cues.length; i++) {
    const t0 = cues[i].st
    if (t0 < 10 || t0 > 360) continue
    const inside = cues.filter((c) => c.st >= t0 - 0.2 && c.st < t0 + CUT)
    const chars = inside.reduce((n, c) => n + c.text.length, 0)
    if (inside.length < 5 || chars < 300 || chars > 1500) continue
    const score = Math.abs(chars - 750)
    if (!best || score < best.score) best = { t0, inside, score }
  }
  return best
}

const only = process.argv[2]
const results = []
for (const t of TALKS) {
  if (only && String(t.id) !== only) continue
  console.log('---', t.id, t.title)
  const [en, zh] = await Promise.all([fetchCues(t.id, 'en'), fetchCues(t.id, 'zh-cn').catch(() => [])])
  const w = pickWindow(en)
  if (!w) { console.log('no window'); continue }
  const t0 = w.t0, t1 = t0 + 75
  const enText = w.inside.filter((c) => !/^\(.*\)$/.test(c.text)).map((c) => c.text).join(' ').replace(/\s+/g, ' ')
  const zhText = zh.filter((c) => c.st >= t0 - 0.2 && c.st < t1).map((c) => c.text).join('')
  const out = `${OUT}/${t.key}.mp3`
  const url = `https://hls.ted.com/project_masters/${t.id}/index-f5-a1.m3u8`
  execFileSync(FF, ['-y', '-ss', String(t0), '-i', url, '-t', '75', '-vn', '-ac', '1', '-ar', '22050', '-b:a', '48k', out], { stdio: 'pipe' })
  const size = (await import('node:fs')).statSync(out).size
  console.log('t0', t0.toFixed(1), 'chars', enText.length, 'zh', zhText.length, 'size', (size / 1024).toFixed(0) + 'KB')
  results.push({ ...t, t0, t1, enText, zhText, file: t.key + '.mp3', size })
}
writeFileSync('scripts/ted_result4.json', JSON.stringify(results, null, 1))
console.log('done', results.length)
