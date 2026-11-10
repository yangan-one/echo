import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/lib/materialMedia.ts'
let s = readFileSync(p, 'utf8')
s = s.replace("import { MATERIALS } from '../data/materials'", "import { ALL_MATERIALS as MATERIALS } from '../data/materials'")
writeFileSync(p, s)
console.log(s.split('\n')[0])
