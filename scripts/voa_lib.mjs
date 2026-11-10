import { gunzipSync } from 'node:zlib'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EchoBuilder/1.0'

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(url + ' -> ' + res.status)
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text()
}

export async function sitemapUrls(limit = 60) {
  const buf = await get('https://learningenglish.voanews.com/sitemap_428_1.xml.gz', true)
  const xml = gunzipSync(buf).toString('utf8')
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  return urls.slice(0, limit)
}

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseArticle(html) {
  const title = cleanText((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1])
  const mp3s = [...html.matchAll(/https?:\/\/[^"' ]+\.mp3/g)].map((m) => m[0])
  const mp3 = mp3s.find((u) => !/_hq\.mp3$/.test(u)) || mp3s[0] || ''

  // transcript lives inside <div class="wsw"> ... </div>
  const start = html.search(/<div[^>]+class="[^"]*\bwsw\b[^"]*"/i)
  let body = ''
  if (start >= 0) {
    body = html.slice(start, start + 40000)
    const stop = body.search(/Words in This Story|Words in the News|Learning English is Voice of America/i)
    if (stop > 0) body = body.slice(0, stop)
  }
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => cleanText(m[1]))
    .filter((t) => t.length > 40)

  // drop the standard boilerplate opening
  const cut = paras.findIndex(
    (p) => !/^(From VOA Learning English|This is VOA|I'm [A-Z][a-z]+ [A-Z]|And I'm )/i.test(p)
  )
  const kept = cut > 0 ? paras.slice(cut) : paras

  const text = kept.join('\n\n')
  const words = text.split(/\s+/).filter(Boolean).length
  const first = kept[0] || ''
  return { title, mp3, text, words, paras: kept, first }
}

export async function duration(url) {
  const { execFile } = await import('node:child_process')
  return new Promise((resolve) => {
    execFile(FF, ['-i', url], { maxBuffer: 1 << 22 }, (err, stdout, stderr) => {
      const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr || '')
      resolve(m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0)
    })
  })
}

export const FF = 'C:/Users/tifaa/AppData/Local/Temp/ffx/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'

if (process.argv[2] === 'probe') {
  const urls = await sitemapUrls(20)
  const out = []
  for (const u of urls) {
    try {
      const a = parseArticle(await get(u))
      out.push({ u, title: a.title, words: a.words, mp3: !!a.mp3, first: a.first.slice(0, 90) })
      console.log(`${a.words.toString().padStart(4)}w  mp3=${a.mp3 ? 'Y' : 'N'}  ${a.title.slice(0, 60)}  ::  ${a.first.slice(0, 70)}`)
    } catch (e) {
      console.log('ERR', u, e.message)
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  console.log(JSON.stringify(out.slice(0, 3), null, 1).slice(0, 400))
}
