import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { execFile } from 'node:child_process'

const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const OUT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/public/audio'
const FILE = 'src/data/realMaterials.ts'

// v1.5 那批用错了 talk id（音频与文本对不上），这里用 TED 页面解析出的正确 id 重做
const FIX = {
  ken_robinson: 1253,
  brene_brown: 4478,
  simon_sinek: 9629,
  celeste_headlee: 5842,
  chimamanda: 698,
  susan_cain: 804,
}

const ff = (args) => new Promise((res, rej) => execFile(FF, args, { maxBuffer: 1 << 26 }, (e) => (e ? rej(e) : res())))
const CUT = 75

function parseVtt(text) {
  const cues = []
  for (const b of text.replace(/\r/g, '').split('\n\n')) {
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

async function fetchCues(id, lang) {
  const base = `https://hls.ted.com/project_masters/${id}/subtitles/`
  try {
    const pl = await (await fetch(base + lang + '.m3u8')).text()
    const segs = pl.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    let all = []
    for (const s of segs) all = all.concat(parseVtt(await (await fetch(base + s.trim())).text()))
    return all.sort((a, b) => a.st - b.st)
  } catch {
    return []
  }
}

function pickWindow(cues) {
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

const results = {}
for (const [key, id] of Object.entries(FIX)) {
  const [en, zh] = await Promise.all([fetchCues(id, 'en'), fetchCues(id, 'zh-cn')])
  if (!en.length) { console.log('no cues', key, id); continue }
  const w = pickWindow(en)
  if (!w) { console.log('no window', key, id); continue }
  const t0 = w.t0
  const t1 = t0 + CUT
  const enText = w.inside.filter((c) => !/^\(.*\)$/.test(c.text)).map((c) => c.text).join(' ').replace(/\s+/g, ' ')
  const zhText = zh.filter((c) => c.st >= t0 - 0.2 && c.st < t1).map((c) => c.text).join('')
  const url = `https://hls.ted.com/project_masters/${id}/index-f5-a1.m3u8`
  await ff(['-y', '-ss', String(t0), '-i', url, '-t', String(CUT), '-vn', '-ac', '1', '-ar', '22050', '-b:a', '48k', `${OUT}/${key}.mp3`])
  const size = statSync(`${OUT}/${key}.mp3`).size
  console.log(key, 'id', id, 't0', t0.toFixed(1), 'chars', enText.length, 'zh', zhText.length, (size / 1024).toFixed(0) + 'KB')
  results[key] = { id, t0, enText, zhText }
}
writeFileSync('scripts/fix_six.json', JSON.stringify(results, null, 1))

// 回写到 realMaterials.ts：只替换对应条目里的 text / textZh 模板字符串
let src = readFileSync(FILE, 'utf8')
for (const [key, r] of Object.entries(results)) {
  const marker = `audioUrl: '/audio/${key}.mp3'`
  const at = src.indexOf(marker)
  if (at < 0) { console.log('marker missing', key); continue }
  const after = src.slice(at)
  const t = after.match(/text: `([^`]*)`/)
  if (!t) { console.log('text missing', key); continue }
  const newT = 'text: `' + r.enText + '`'
  const tStart = at + t.index
  src = src.slice(0, tStart) + newT + src.slice(tStart + t[0].length)
  const at2 = src.indexOf(marker)
  const after2 = src.slice(at2)
  const z = after2.match(/textZh: `([^`]*)`/)
  if (z && r.zhText) {
    const newZ = 'textZh: `' + r.zhText + '`'
    const zStart = at2 + z.index
    src = src.slice(0, zStart) + newZ + src.slice(zStart + z[0].length)
  }
}
writeFileSync(FILE, src)
console.log('patched', Object.keys(results).length)
