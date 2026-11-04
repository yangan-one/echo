import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const OUT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/public/audio'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const TALKS = [
  { id: 12041, key: 'david_dobas', tt: '怎样教机器人跳舞', speaker: 'David Dobas', category: '演讲', accent: '美音' },
  { id: 12100, key: 'felix_hol', tt: '蚊子那种惊人的美', speaker: 'Felix Hol', category: '学术', accent: '其他口音' },
  { id: 12096, key: 'fabiola_reyna', tt: '直觉为什么是音乐的核心', speaker: 'Fabiola Reyna', category: '学术', accent: '美音' },
  { id: 12017, key: 'blake_mycoskie', tt: '救了我一命的三个词', speaker: 'Blake Mycoskie', category: '演讲', accent: '美音' },
  { id: 11886, key: 'james_rojas', tt: '你会怎么设计梦想中的城市', speaker: 'James Rojas', category: '生活', accent: '美音' },
  { id: 12076, key: 'michael_snyder_bt', tt: '对谈：可穿戴设备、AI 代理与医疗的未来', speaker: 'Michael Snyder', category: '访谈', accent: '美音' },
  { id: 12031, key: 'julie_bedard', tt: '领导者的 AI 脑烧是真的', speaker: 'Julie Bedard', category: '学术', accent: '其他口音' },
  { id: 2035, key: 'dan_pink', tt: '动机的谜题', speaker: 'Dan Pink', category: '学术', accent: '美音' },
  { id: 1310, key: 'simon_sinek_safety', tt: '好领导让你感到安全', speaker: 'Simon Sinek', category: '演讲', accent: '英音' },
  { id: 793, key: 'brene_shame', tt: '倾听羞耻', speaker: 'Brené Brown', category: '生活', accent: '美音' },
  { id: 926, key: 'elizabeth_gilbert', tt: '难以捉摸的创造天才', speaker: 'Elizabeth Gilbert', category: '演讲', accent: '美音' },
  { id: 979, key: 'margaret_heffernan', tt: '敢不敢不同意', speaker: 'Margaret Heffernan', category: '演讲', accent: '英音' },
  { id: 1282, key: 'barry_schwartz', tt: '选择的悖论', speaker: 'Barry Schwartz', category: '学术', accent: '美音' },
  { id: 1030, key: 'daniel_kahneman', tt: '经验与记忆的谜题', speaker: 'Daniel Kahneman', category: '学术', accent: '其他口音' },
  { id: 1380, key: 'sherry_turkle', tt: '连在一起，却各自孤独', speaker: 'Sherry Turkle', category: '学术', accent: '美音' },
  { id: 1126, key: 'kelly_mcgonigal', tt: '怎样把压力变成朋友', speaker: 'Kelly McGonigal', category: '生活', accent: '美音' }
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
writeFileSync('scripts/ted_result3.json', JSON.stringify(results, null, 1))
console.log('done', results.length)
