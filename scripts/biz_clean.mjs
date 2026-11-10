import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const rows = JSON.parse(readFileSync(ROOT + '/scripts/biz.json', 'utf8'))

function strip(t) {
  let s = t.replace(/\s+/g, ' ').trim()
  s = s.replace(/^This is (The Indicator from Planet Money|Planet Money)[^.]*\.\s*/i, '')
  for (let i = 0; i < 3; i++) {
    const next = s
      .replace(/^(And\s+)?I['’]?m [^.?!]{1,60}[.?!]\s*/, '')
      .replace(/^(And\s+)?(Wailin|Adrian|Ricky|Darian|Kenny|Sally|Greg|Cardiff|Mary)[^.]{0,60}\.\s*/, '')
    if (next === s) break
    s = next
  }
  return s.replace(/\s{2,}/g, ' ').trim()
}

for (const r of rows) {
  r.text30 = strip(r.text30)
  r.text60 = strip(r.text60)
}
writeFileSync(ROOT + '/scripts/biz_clean.json', JSON.stringify(rows, null, 1))
for (const r of rows.slice(0, 4)) console.log(r.key, '::', r.text30.slice(0, 90))
