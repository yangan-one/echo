import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/'
const rd = (p) => readFileSync(R + p, 'utf8')
const wr = (p, s) => writeFileSync(R + p, s)

let t = rd('src/types.ts')
if (!t.includes("'商业'")) t = t.replace("  | '新闻'\n", "  | '新闻'\n  | '商业'\n")
wr('src/types.ts', t)

for (const f of ['src/components/Library.tsx', 'src/components/Home.tsx']) {
  let s = rd(f)
  s = s.replace("import { CATEGORIES, MATERIALS } from '../data/materials'", "import { CATEGORIES, ALL_MATERIALS as MATERIALS } from '../data/materials'")
  s = s.replace("import { MATERIALS } from '../data/materials'", "import { ALL_MATERIALS as MATERIALS } from '../data/materials'")
  wr(f, s)
}

let m = rd('src/data/materials.ts')
m = m.replace("export const CATEGORIES: Material['category'][] = [", "export const CATEGORIES: Material['category'][] = [\n  '商业',")
wr('src/data/materials.ts', m)
console.log('ok')
