import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/App.tsx'
let s = readFileSync(p, 'utf8')
s = s.replace("| { name: 'listen'; materialId: string }", "| { name: 'listen'; materialId: string; from?: 'home' | 'library' }")
s = s.replace(
  "onListen={(id) => setRoute({ name: 'listen', materialId: id })} />",
  "onListen={(id) => setRoute({ name: 'listen', materialId: id, from: 'library' })} />"
)
s = s.replace(
  "onBack={() => setRoute({ name: 'library' })}",
  "onBack={() => setRoute({ name: route.from === 'library' ? 'library' : 'home' })}"
)
s = s.replace(
  "      onListen={(id) => setRoute({ name: 'listen', materialId: id })}\n",
  "      onListen={(id) => setRoute({ name: 'listen', materialId: id, from: 'home' })}\n"
)
writeFileSync(p, s)
console.log('from' in s, s.includes("from: 'home'"), s.includes("from: 'library'"))
