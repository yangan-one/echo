import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/components/Home.tsx'
let s = readFileSync(p, 'utf8')
if (!s.includes('  onProgress,\n')) s = s.replace('  onSettings,\n}', '  onProgress,\n  onSettings,\n}')
if (!s.includes('onProgress: () => void')) s = s.replace('  onSettings: () => void', '  onProgress: () => void\n  onSettings: () => void')
writeFileSync(p, s)
console.log('ok', s.includes('onProgress,'), s.includes('onProgress: () => void'))
