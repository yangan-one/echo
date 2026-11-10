import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/materials.ts'
let s = readFileSync(p, 'utf8')

s = s.replace(
  `const withOpening = (m: Material): Material => {
  const key = keyOfAudio(m.audioUrl)
  const o = OPENINGS[key]
  if (!o) return m`,
  `const withOpening = (m: Material): Material | null => {
  const key = keyOfAudio(m.audioUrl)
  const o = OPENINGS[key]
  if (!o) return null`
)

s = s.replace(
  `  .filter((m) => !NOISY.has(keyOfAudio(m.audioUrl)))
  .map(withOpening)
  .map((m) => ({ ...m, text: cleanLaugh(m.text) }))`,
  `  .filter((m) => !NOISY.has(keyOfAudio(m.audioUrl)))
  .map(withOpening)
  .filter((m): m is Material => m !== null)
  .map((m) => ({ ...m, text: cleanLaugh(m.text) }))`
)

writeFileSync(p, s)
console.log('only opening-backed materials kept')
