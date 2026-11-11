import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/tsconfig.json'
const s = readFileSync(p, 'utf8')
const t = s.replace('    "moduleResolution": "bundler",\n    "allowImportingTsExtensions": true,\n', '    "moduleResolution": "bundler",\n')
writeFileSync(p, t)
console.log((t.match(/allowImportingTsExtensions/g) || []).length)
