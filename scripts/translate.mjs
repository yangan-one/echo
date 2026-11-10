import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const TOKEN = process.argv[3]
if (!TOKEN) throw new Error('usage: node translate.mjs <in.json> <token> [out.json]')

const inFile = process.argv[2]
const outFile = process.argv[4] || ROOT + '/scripts/openings_zh.json'
const rows = JSON.parse(readFileSync(inFile, 'utf8'))
const done = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}

const SYS = `你是英译中字幕译者。把用户给的英文口语片段译成自然、口语化的中文：
- 保留人名、机构、数字、百分比
- 不要解释、不要加标题、不要分行加序号
- 只输出译文本身`

async function zh(text) {
  const res = await fetch('http://127.0.0.1:8788/api/ai/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 120))
  const j = await res.json()
  return (j.choices?.[0]?.message?.content || '').trim()
}

let n = 0
for (const r of rows) {
  const key = r.key || r.id
  if (done[key]?.zh60) continue
  try {
    const zh60 = await zh(r.text60)
    const zh30 = await zh(r.text30)
    done[key] = { zh60, zh30 }
    writeFileSync(outFile, JSON.stringify(done, null, 1))
    console.log('ok', key, zh60.slice(0, 40))
    n++
  } catch (e) {
    console.log('ERR', key, e.message)
  }
}
console.log('translated', n, 'total', Object.keys(done).length)
