import { readFileSync, writeFileSync } from 'node:fs'

const base = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/components/'

function patch(file, pairs) {
  const p = base + file
  let s = readFileSync(p, 'utf8')
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(`${file}: missing ${a}`)
    s = s.split(a).join(b)
  }
  writeFileSync(p, s)
  console.log('patched', file)
}

patch('Library.tsx', [["'30s / 75s'", "'30s / 60s'"]])

patch('ListenView.tsx', [
  ["' · 75 秒完整片段'", "' · 60 秒完整片段'"],
  ['完整 75 秒', '完整 60 秒'],
  ["'TED 官方视频的 75 秒截取 + 官方字幕，CC BY-NC-ND，仅限个人学习。'", "'TED 官方视频的开场 60 秒 + 官方字幕（从第一句开始，主题句就在开头），CC BY-NC-ND，仅限个人学习。'"],
])
