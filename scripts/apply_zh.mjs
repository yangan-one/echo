import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/data/realMaterials.ts',
  'src/data/realMaterialsB.ts',
  'src/data/realMaterialsC.ts',
  'src/data/realMaterialsD.ts',
]

const zh = JSON.parse(readFileSync('scripts/zh_extra.json', 'utf8'))

let added = 0
for (const f of FILES) {
  const src = readFileSync(f, 'utf8')
  const chunks = src.split('\n  {')
  const out = chunks.map((chunk, i) => {
    if (i === 0) return chunk
    const head = chunk.replace(/^\s+/, '')
    const idm = head.match(/^id: '(m\d+)'/)
    if (!idm || !zh[idm[1]]) return chunk
    if (/textZh:/.test(chunk)) return chunk
    const m = chunk.match(/(\n    text: `[^`]*`,\n)/)
    if (!m) return chunk
    added++
    const body = zh[idm[1]].replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    return chunk.replace(m[1], m[1] + '    textZh: `' + body + '`,\n')
  })
  const next = out.join('\n  {')
  if (next !== src) {
    writeFileSync(f, next)
    console.log('updated', f)
  }
}
console.log('added translations:', added)
