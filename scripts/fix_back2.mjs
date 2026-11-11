import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/App.tsx'
let s = readFileSync(p, 'utf8')
s = s.replace(
  "onBack={() => setRoute({ name: route.from === 'library' ? 'library' : 'home' })}",
  "onBack={() => setRoute(route.from === 'library' ? { name: 'library' } : { name: 'home' })}"
)
writeFileSync(p, s)
console.log(s.includes("route.from === 'library' ? { name: 'library' }"))
