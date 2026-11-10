import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/shorts.ts'
let s = readFileSync(p, 'utf8')
if (!s.includes("openingsZh")) {
  s = s.replace("import { OPENINGS } from './openings'", "import { OPENINGS } from './openings'\nimport { OPENING_ZH } from './openingsZh'")
}
s = s.replace(
  "if (o) return { audioUrl: '/audio/open/' + key + '_30.mp3', durationMs: o.d30, text: o.text30 }",
  "if (o) return { audioUrl: '/audio/open/' + key + '_30.mp3', durationMs: o.d30, text: o.text30, textZh: OPENING_ZH[key]?.zh30 }"
)
writeFileSync(p, s)
console.log(s.includes('OPENING_ZH[key]?.zh30'))
