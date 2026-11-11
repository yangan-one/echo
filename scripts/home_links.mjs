import { readFileSync, writeFileSync } from 'node:fs'
const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/components/Home.tsx'
let s = readFileSync(p, 'utf8')
const old = `        <button className="btn ghost wide" onClick={onMarks}>
          打开卡点库 →
        </button>`
const modern = `        <div className="row-2">
          <button className="btn ghost" onClick={onMarks}>
            卡点库
          </button>
          <button className="btn ghost" onClick={onProgress}>
            进度
          </button>
        </div>`
if (s.includes(old)) {
  s = s.replace(old, modern)
  writeFileSync(p, s)
  console.log('replaced')
} else {
  console.log('pattern not found')
}
