import { execFile } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const OUT = ROOT + '/public/audio/biz'
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })

const FEED = 'https://feeds.npr.org/510325/podcast.xml' // The Indicator
const UA = 'Mozilla/5.0 EchoBuilder/1.0'
const get = async (u) => {
  const r = await fetch(u, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(u + ' ' + r.status)
  return r.text()
}

const clean = (h) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

function transcriptFrom(html) {
  const a = html.search(/This is (The Indicator|Planet Money)/i)
  const b = html.search(/Copyright ©|Copyright &copy;|Accuracy and availability/i)
  const body = html.slice(a >= 0 ? a : 0, b > 0 ? b : undefined)
  let text = clean(body)
  text = text
    .replace(/\[(MUSIC|APPLAUSE|LAUGHTER|SOUNDBITE[^\]]*|COIN[^\]]*)\]/gi, " ")
    .replace(/SPEAKER:\s*NPR\.?/gi, " ")
    .replace(/\b[A-Z][A-Z .'’\-]{2,25}:\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
  const k = text.search(/This is (The Indicator|Planet Money)/i)
  if (k > 0) text = text.slice(k)
  return text
}

const feed = await get(FEED)
const items = [...feed.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0])
console.log('items', items.length)

const rows = []
for (const it of items) {
  if (rows.length >= 10) break
  const title = clean((it.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1])
  const link = (it.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1].trim()
  const enc = ((it.match(/<enclosure[^>]+url="([^"]+)"/) || [, ''])[1]).replace(/&amp;/g, '&')
  const dur = Number((it.match(/<itunes:duration>(\d+)<\/itunes:duration>/) || [, 0])[1])
  const m = /\/(\d{4}\/\d\d\/\d\d)\/([a-z0-9-]+)/.exec(link)
  if (!m || !enc || !dur) continue
  const id = m[2]
  try {
    const html = await get('https://www.npr.org/transcripts/' + id)
    const text = transcriptFrom(html)
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length < 120 || /^(function|var |window\.|\/\/)/.test(text)) {
      console.log('skip (no transcript)', id)
      continue
    }
    const start = 6
    const rate = words.length / Math.max(60, dur - start)
    const take = (sec) => words.slice(0, Math.min(words.length, Math.round(sec * rate))).join(' ')
    const f30 = `${OUT}/${id}_30.mp3`
    const f60 = `${OUT}/${id}_60.mp3`
    const cut = (t, f) =>
      new Promise((res) =>
        execFile(FF, ['-y', '-ss', String(start), '-t', String(t), '-i', enc, '-vn', '-ac', '1', '-ar', '22050', '-b:a', '48k', f], { maxBuffer: 1 << 22 }, () => res(existsSync(f)))
      )
    const ok30 = await cut(30, f30)
    const ok60 = await cut(60, f60)
    rows.push({
      key: id,
      title,
      d30: 30,
      d60: 60,
      text30: take(30),
      text60: take(60),
      url: 'https://www.npr.org/transcripts/' + id,
      ok30,
      ok60,
    })
    console.log(`${ok30 && ok60 ? 'ok' : 'partial'} ${id} :: ${title.slice(0, 60)} :: ${take(30).slice(0, 60)}`)
  } catch (e) {
    console.log('ERR', id, e.message)
  }
}

writeFileSync(ROOT + '/scripts/biz.json', JSON.stringify(rows, null, 1))
console.log('done', rows.length)
