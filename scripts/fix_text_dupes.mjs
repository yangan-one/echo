import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/data/realMaterials.ts',
  'src/data/realMaterialsB.ts',
  'src/data/realMaterialsC.ts',
  'src/data/realMaterialsD.ts',
]

const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

function collapseNgrams(s) {
  let cur = s
  for (let n = 14; n >= 6; n--) {
    const core = "(?:[\\w']+[ ,]+){" + (n - 1) + "}[\\w']+[ ,]+"
    const re = new RegExp('\\b(' + core + ')\\1', 'gi')
    let prev
    let guard = 0
    do {
      prev = cur
      cur = cur.replace(re, '$1')
    } while (cur !== prev && ++guard < 20)
  }
  return cur
}

/** 词级重复片段：跨标点、跨句边界的相邻重复（滚动字幕的典型产物） */
function dedupePhrases(text) {
  let parts = text.match(/[A-Za-z0-9']+[.,!?;:]*\s*|[^A-Za-z0-9'\s]+/g) || []
  const wordIdx = []
  for (let i = 0; i < parts.length; i++) if (/[A-Za-z0-9']/.test(parts[i])) wordIdx.push(i)
  const ws = wordIdx.map((i) => parts[i].replace(/[^A-Za-z0-9']/g, '').toLowerCase())

  let changed = true
  let guard = 0
  while (changed && ++guard < 400) {
    changed = false
    outer: for (let j = 0; j < ws.length; j++) {
      for (let n = 15; n >= 5; n--) {
        if (j + 2 * n > ws.length) continue
        let same = true
        for (let k = 0; k < n; k++) {
          if (!ws[j + k] || ws[j + k] !== ws[j + n + k]) { same = false; break }
        }
        if (!same) continue
        const from = wordIdx[j + n]
        const to = wordIdx[j + 2 * n - 1] + 1
        parts = parts.slice(0, from).concat(parts.slice(to))
        wordIdx.length = 0
        for (let i = 0; i < parts.length; i++) if (/[A-Za-z0-9']/.test(parts[i])) wordIdx.push(i)
        ws.length = 0
        for (const i of wordIdx) ws.push(parts[i].replace(/[^A-Za-z0-9']/g, '').toLowerCase())
        changed = true
        break outer
      }
    }
  }
  return parts.join('').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

export function dedupeEn(text) {
  const parts = (text.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g) || [text]).map((p) => p.trim()).filter(Boolean)
  const out = []
  for (const p of parts) {
    const n = words(p)
    if (!n) continue
    const prev = out.length ? words(out[out.length - 1]) : ''
    if (prev && n === prev) continue
    if (prev && n.split(' ').length >= 4 && (' ' + prev).endsWith(' ' + n)) continue
    out.push(p)
  }
  let s = out.join(' ').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
  s = collapseNgrams(s)
  s = dedupePhrases(s)
  return s.replace(/\s{2,}/g, ' ').trim()
}

export function dedupeZh(text) {
  const parts = (text.match(/[^。！？]+[。！？]?/g) || [text]).map((p) => p.trim()).filter(Boolean)
  const out = []
  for (const p of parts) {
    const n = p.replace(/[\s。！？，、；：""''（）]/g, '')
    if (!n) continue
    const prevN = out.length ? out[out.length - 1].replace(/[\s。！？，、；：""''（）]/g, '') : ''
    if (prevN && n === prevN) continue
    if (prevN && n.length >= 6 && prevN.endsWith(n)) continue
    out.push(p)
  }
  return out.join('').replace(/\s{2,}/g, ' ').trim()
}

let total = 0
for (const f of FILES) {
  let src = readFileSync(f, 'utf8')
  const before = src
  src = src.replace(/text: `([^`]*)`/g, (m, body) => {
    const fixed = dedupeEn(body)
    if (fixed !== body) total++
    return 'text: `' + fixed + '`'
  })
  src = src.replace(/textZh: `([^`]*)`/g, (m, body) => {
    const fixed = dedupeZh(body)
    if (fixed !== body) total++
    return 'textZh: `' + fixed + '`'
  })
  if (src !== before) {
    writeFileSync(f, src)
    console.log('rewrote', f)
  }
}
console.log('changed blocks:', total)
