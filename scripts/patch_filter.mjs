import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/materials.ts'
let s = readFileSync(p, 'utf8')

const anchor = `export const MATERIALS: Material[] = [
  ...REAL_MATERIALS,
  ...REAL_MATERIALS_B,
  ...REAL_MATERIALS_C,
  ...REAL_MATERIALS_D,
].map(withOpening)`

const next = `/** 开场 30 秒里就有笑声/掌声的，直接不收（用户明确说过不要观众笑声） */
const NOISY = new Set(['amy_cuddy', 'laura_smythe', 'harville_hendrix', 'rita_pierson', 'dan_pink'])

const cleanLaugh = (t: string) =>
  t
    .replace(/\\s*\\((Laughter|Applause|Audience|Music)\\)/gi, '')
    .replace(/\\s*\\[(Laughter|Applause|Music)\\]/gi, '')
    .replace(/\\s{2,}/g, ' ')
    .trim()

export const MATERIALS: Material[] = [
  ...REAL_MATERIALS,
  ...REAL_MATERIALS_B,
  ...REAL_MATERIALS_C,
  ...REAL_MATERIALS_D,
]
  .filter((m) => !NOISY.has(keyOfAudio(m.audioUrl)))
  .map(withOpening)
  .map((m) => ({ ...m, text: cleanLaugh(m.text) }))`

if (!s.includes(anchor)) throw new Error('anchor missing')
s = s.replace(anchor, next)
writeFileSync(p, s)
console.log('filtered 5 noisy talks')
