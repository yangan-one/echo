import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/materials.ts'
let s = readFileSync(p, 'utf8')

if (!s.includes("from './openings'")) {
  s = s.replace("import { REAL_MATERIALS_D } from './realMaterialsD'", "import { REAL_MATERIALS_D } from './realMaterialsD'\nimport { OPENINGS } from './openings'")
}

const oldBlock = `export const MATERIALS: Material[] = [
  ...REAL_MATERIALS,
  ...REAL_MATERIALS_B,
  ...REAL_MATERIALS_C,
  ...REAL_MATERIALS_D,
]`

const newBlock = `const keyOfAudio = (url?: string): string => {
  const file = url?.split('/').pop() ?? ''
  return file.replace(/\\.mp3$/i, '')
}

/** 把每段 TED 素材换成「开场 60 秒」，标题、分类、口音沿用；30 秒短版见 shorts.ts */
const withOpening = (m: Material): Material => {
  const key = keyOfAudio(m.audioUrl)
  const o = OPENINGS[key]
  if (!o) return m
  return {
    ...m,
    audioUrl: '/audio/open/' + key + '_60.mp3',
    text: o.text60,
    textZh: undefined,
    seconds: Math.round(o.d60 / 1000),
  }
}

export const MATERIALS: Material[] = [
  ...REAL_MATERIALS,
  ...REAL_MATERIALS_B,
  ...REAL_MATERIALS_C,
  ...REAL_MATERIALS_D,
].map(withOpening)`

if (!s.includes(oldBlock)) throw new Error('MATERIALS block not found')
s = s.replace(oldBlock, newBlock)
writeFileSync(p, s)
console.log('materials.ts patched')
