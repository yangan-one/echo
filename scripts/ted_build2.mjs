import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const OUT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/public/audio'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const TALKS = [
  { id: 12016, key: 'emily_kasriel', tt: '为什么你一听不进不同意见就关耳朵', speaker: 'Emily Kasriel', category: '学术', accent: '英音' },
  { id: 12030, key: 'laura_smythe', tt: '你能看出信息流里的假新闻吗', speaker: 'Laura Smythe', category: '新闻', accent: '美音' },
  { id: 12101, key: 'hadi_al_khatib', tt: '数字侦探：保存战争的真相', speaker: 'Hadi Al Khatib', category: '新闻', accent: '其他' },
  { id: 12085, key: 'sheridan_voysey', tt: '怎样交朋友，并且留住他们', speaker: 'Sheridan Voysey', category: '生活', accent: '澳音' },
  { id: 12083, key: 'cara_hale_alter', tt: '你的肢体语言在跟你作对吗', speaker: 'Cara Hale Alter', category: '生活', accent: '美音' },
  { id: 12075, key: 'jessica_irwin', tt: '我说不出话，但我能让人听我说', speaker: 'Jessica Irwin', category: '演讲', accent: '美音' },
  { id: 12091, key: 'philip_jameson', tt: '想让人改变？问这一个问题', speaker: 'Philip Jameson', category: '生活', accent: '美音' },
  { id: 12078, key: 'noor_siddiqui', tt: '如果能读到未来孩子的 DNA', speaker: 'Noor Siddiqui', category: '学术', accent: '美音' },
  { id: 12106, key: 'harville_hendrix', tt: '一对婚姻治疗师，差点离了婚', speaker: 'Harville Hendrix', category: '生活', accent: '美音' },
  { id: 12056, key: 'anna_rainio', tt: '想象出来的世界，怎么帮孩子学习', speaker: 'Anna Rainio', category: '学术', accent: '其他' },
  { id: 12022, key: 'jen_loving', tt: '在无家可归发生之前就拦住它', speaker: 'Jen Loving', category: '新闻', accent: '美音' },
  { id: 12079, key: 'bill_mckibben_bt', tt: '对谈：石油战争与太阳能革命', speaker: 'Bill McKibben', category: '访谈', accent: '美音' },
  { id: 1733, key: 'sugata_mitra', tt: '在云端建一所学校', speaker: 'Sugata Mitra', category: '学术', accent: '印音' },
  { id: 4115, key: 'jinsop_lee', tt: '为五种感官做设计', speaker: 'Jinsop Lee', category: '多口音', accent: '其他' },
  { id: 2294, key: 'amy_cuddy', tt: '你的肢体语言决定你是谁', speaker: 'Amy Cuddy', category: '演讲', accent: '美音' },
  { id: 925, key: 'dan_gilbert', tt: '幸福的惊人科学', speaker: 'Dan Gilbert', category: '学术', accent: '美音' },
  { id: 872, key: 'angela_duckworth', tt: '坚毅：激情与坚持的力量', speaker: 'Angela Duckworth', category: '学术', accent: '美音' },
  { id: 1206, key: 'rita_pierson', tt: '每个孩子都需要一个支持者', speaker: 'Rita Pierson', category: '演讲', accent: '美音' },
  { id: 11989, key: 'adam_grant', tt: '原创者的惊人习惯', speaker: 'Adam Grant', category: '学术', accent: '美音' }
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
writeFileSync('scripts/ted_result2.json', JSON.stringify(results, null, 1))
console.log('done', results.length)
