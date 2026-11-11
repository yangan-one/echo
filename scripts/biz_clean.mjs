import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const rows = JSON.parse(readFileSync(ROOT + '/scripts/biz.json', 'utf8'))
const clean = (t) =>
  t
    .replace(/\[(MUSIC|APPLAUSE|LAUGHTER|SOUNDBITE[^\]]*)\]/gi, ' ')
    .replace(/\b[A-Z][A-Z .'’-]{1,25}:\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
for (const r of rows) {
  r.text30 = clean(r.text30)
  r.text60 = clean(r.text60)
}
writeFileSync(ROOT + '/scripts/biz_clean.json', JSON.stringify(rows, null, 1))
for (const r of rows.slice(0, 3)) console.log(r.key, '::', r.text30.slice(0, 80))
