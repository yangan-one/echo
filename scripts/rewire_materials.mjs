import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/'
const p = R + 'src/data/materials.ts'
let s = readFileSync(p, 'utf8')

if (!s.includes("from './openingsZh'")) {
  s = s.replace("import { OPENINGS } from './openings'", "import { OPENINGS } from './openings'\nimport { OPENING_ZH } from './openingsZh'\nimport { BIZ_MATERIALS } from './bizMaterials'")
} else if (!s.includes('BIZ_MATERIALS')) {
  s = s.replace("import { OPENING_ZH } from './openingsZh'", "import { OPENING_ZH } from './openingsZh'\nimport { BIZ_MATERIALS } from './bizMaterials'")
}
s = s.replace('    textZh: undefined,', '    textZh: OPENING_ZH[key]?.zh60,')
if (!s.includes('ALL_MATERIALS')) {
  s = s.replace(/\.map\(\(m\) => \(\{ \.\.\.m, text: cleanLaugh\(m\.text\) \}\)\)\n/, '.map((m) => ({ ...m, text: cleanLaugh(m.text) }))\n\nexport const ALL_MATERIALS: Material[] = [...MATERIALS, ...BIZ_MATERIALS]\n')
}
if (!s.includes("'商业',")) {
  s = s.replace("export const CATEGORIES: Material['category'][] = [", "export const CATEGORIES: Material['category'][] = [\n  '商业',")
}
writeFileSync(p, s)
console.log('material ok', s.includes('ALL_MATERIALS'), s.includes('OPENING_ZH[key]'), s.includes("'商业'"))
