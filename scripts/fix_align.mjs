import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/'

// 1) biz_build: cut from 0, rate over full duration
let b = readFileSync(R + 'scripts/biz_build.mjs', 'utf8')
b = b.replace('    const start = 6\n    const rate = words.length / Math.max(60, dur - start)', '    const start = 0\n    const rate = words.length / Math.max(60, dur)')
b = b.replace(/const cut = \(t, f\) =>\n      new Promise\(\(res\) =>\n        execFile\(FF, \['-y', '-ss', String\(start\), '-t'/, `const cut = (t, f) =>
      new Promise((res) =>
        execFile(FF, ['-y', '-ss', '0', '-t'`)
writeFileSync(R + 'scripts/biz_build.mjs', b)

// 2) biz_clean: labels/markers only, no intro stripping
writeFileSync(
  R + 'scripts/biz_clean.mjs',
  `import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const rows = JSON.parse(readFileSync(ROOT + '/scripts/biz.json', 'utf8'))
const clean = (t) =>
  t
    .replace(/\\[(MUSIC|APPLAUSE|LAUGHTER|SOUNDBITE[^\\]]*)\\]/gi, ' ')
    .replace(/\\b[A-Z][A-Z .'’-]{1,25}:\\s*/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
for (const r of rows) {
  r.text30 = clean(r.text30)
  r.text60 = clean(r.text60)
}
writeFileSync(ROOT + '/scripts/biz_clean.json', JSON.stringify(rows, null, 1))
for (const r of rows.slice(0, 3)) console.log(r.key, '::', r.text30.slice(0, 80))
`
)

// 3) gen_biz: no trimming at sentence boundary
let g = readFileSync(R + 'scripts/gen_biz.mjs', 'utf8')
g = g.replace('esc(trimEn(r.text60))', 'esc(r.text60)').replace('esc(trimEn(r.text30))', 'esc(r.text30)')
g = g.replace('esc(trimZh(z.zh60))', 'esc((z.zh60 || "").trim())').replace('esc(trimZh(z.zh30))', 'esc((z.zh30 || "").trim())')
writeFileSync(R + 'scripts/gen_biz.mjs', g)
console.log('patched build/clean/gen')
