import { readFileSync, writeFileSync } from 'node:fs'

const AI = 'src/lib/ai.ts'
let src = readFileSync(AI, 'utf8')

function cut(startMark, endMark, name) {
  const a = src.indexOf(startMark)
  if (a < 0) throw new Error('missing start ' + name)
  const b = src.indexOf(endMark, a)
  if (b < 0) throw new Error('missing end ' + name)
  const body = src.slice(a, b).trimEnd()
  src = src.slice(0, a) + src.slice(b)
  return body
}

const errors = cut('const ERRORS', '\nconst STOP = new Set(', 'ERRORS')
const cnHints = cut('const CN_HINTS', '\nfunction splitSentences', 'CN_HINTS')
const judgements = cut('const JUDGEMENTS', '\nfunction matchJudgement', 'JUDGEMENTS')
const systemPrompt = cut('const SYSTEM_PROMPT = `', '\nfunction extractJson', 'SYSTEM_PROMPT')
const gistPrompt = cut('const GIST_PROMPT = `', '\nfunction offlineGist', 'GIST_PROMPT')
const rewritePrompt = cut('const REWRITE_PROMPT = `', '\nfunction stripFillers', 'REWRITE_PROMPT')

writeFileSync(
  'src/data/patterns.ts',
  `// 离线建议用到的硬伤规则与中英提示词（从 lib/ai.ts 拆出来，只放数据）\n\n` +
    `/** 高频硬伤：离线也能抓到的错误 */\n` +
    errors +
    `\n\n/** 中文意图 -> 英文词干提示（用于在材料原文里定位对应句） */\n` +
    cnHints +
    `\n`,
)

writeFileSync(
  'src/data/judgements.ts',
  `import type { SuggestionOption } from '../types'\n\n` +
    `// 中文意图是「判断/评价」时，直接给完整判断句，而不是绕词策略\n` +
    judgements +
    `\n`,
)

writeFileSync(
  'src/lib/prompts.ts',
  `// 远程模型用的三段 prompt（从 lib/ai.ts 拆出来，改措辞时只动这里）\n\n` +
    systemPrompt +
    `\n\n` +
    gistPrompt +
    `\n\n` +
    rewritePrompt +
    `\n`,
)

src = src.replace(
  `import { gistOf } from '../data/gists'`,
  `import { gistOf } from '../data/gists'\nimport { ERRORS, CN_HINTS } from '../data/patterns'\nimport { JUDGEMENTS } from '../data/judgements'\nimport { SYSTEM_PROMPT, GIST_PROMPT, REWRITE_PROMPT } from './prompts'`,
)

writeFileSync(AI, src)
console.log('ok')
