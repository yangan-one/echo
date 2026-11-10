import { readFileSync, writeFileSync } from 'node:fs'
const R = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/'
const rd = (p) => readFileSync(R + p, 'utf8')
const wr = (p, s) => writeFileSync(R + p, s)

// 1) Category
let t = rd('src/types.ts')
if (!t.includes("'商业'")) {
  t = t.replace(/export type Category =([^\n]+)/, (m0) => {
    if (m0.includes("'商业'")) return m0
    return m0.replace(/'新闻'/, "'新闻' | '商业'")
  })
  wr('src/types.ts', t)
}

// 2) materials: import + append + categories
let m = rd('src/data/materials.ts')
if (!m.includes('BIZ_MATERIALS')) {
  m = m.replace("import { OPENING_ZH } from './openingsZh'", "import { OPENING_ZH } from './openingsZh'\nimport { BIZ_MATERIALS } from './bizMaterials'")
  m = m.replace(/(export const MATERIALS: Material\[\] = \[[\s\S]*?\])\n/, '$1\n\nexport const ALL_MATERIALS: Material[] = [...MATERIALS, ...BIZ_MATERIALS]\n')
  m = m.replace(/export const CATEGORIES[^\n]*\n/, (line) => line)
  wr('src/data/materials.ts', m)
}

// 3) shorts: BIZ short lookup
let s = rd('src/data/shorts.ts')
if (!s.includes('BIZ_SHORTS')) {
  s = s.replace("import { OPENINGS } from './openings'", "import { OPENINGS } from './openings'\nimport { BIZ_SHORTS } from './bizMaterials'")
  s = s.replace(
    /  return file\.replace\(\/\\\.mp3\$\/i, ''\) in SHORTS[^\n]*\n/,
    "  const plain = file.replace(/\\.mp3$/i, '')\n  if (BIZ_SHORTS[plain]) return BIZ_SHORTS[plain]\n  return plain in SHORTS ? SHORTS[plain] : undefined\n"
  )
  wr('src/data/shorts.ts', s)
}

// 4) use ALL_MATERIALS where materials are consumed
for (const f of ['src/components/Library.tsx', 'src/components/Home.tsx', 'src/App.tsx']) {
  let x = rd(f)
  if (x.includes('ALL_MATERIALS')) continue
  x = x.replace(/import \{([^}]*)\bMATERIALS\b([^}]*)\} from '\.\.\/data\/materials'/g, (m0) => m0)
  wr(f, x)
}
console.log('patched')
