import { readFileSync, writeFileSync } from 'node:fs'

const res = JSON.parse(readFileSync('scripts/ted_clean4.json', 'utf8'))

const cut = (s) => s.replace(/\s+/g, ' ').trim().replace(/^([a-z])/, (c) => c.toUpperCase())
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

let i = 69
const items = res
  .map((r) => {
    const id = 'm' + i++
    const text = esc(cut(r.enClean || r.enText))
    const zh = (r.zhText || '').replace(/\s+/g, '')
    const speechRate = r.enText.length / 75
    const reduction = speechRate > 16 ? '高' : speechRate > 12 ? '中' : '低'
    return `  {
    id: '${id}',
    title: '${r.tt}',
    source: 'TED 原声 · ${r.speaker} · CC BY-NC-ND',
    category: '${r.category}',
    seconds: 75,
    accent: '${r.accent}',
    reduction: '${reduction}',
    familiarity: '一般',
    audioUrl: '/audio/${r.file}',
    sourceNote: '音频为 TED 官方视频的 75 秒截取，原文来自 TED 官方英文字幕，CC BY-NC-ND 4.0，仅供个人学习，请勿再分发。',
    text: \`${text}\`,${zh ? `\n    textZh: \`${esc(zh)}\`,` : ''}
  },`
  })
  .join('\n')

const file = `import type { Material } from '../types'

/**
 * 真人原声素材（第四批）：TED 官方视频截取的 75 秒片段 + 官方英文字幕
 * 许可证 CC BY-NC-ND 4.0 —— 仅限个人学习，勿再分发。
 * 重新生成：scripts/ted_build4.mjs（另含 ted_build5）→ scripts/dedupe4.mjs → scripts/gen_real4.mjs
 */
export const REAL_MATERIALS_D: Material[] = [
${items}
]
`

writeFileSync('src/data/realMaterialsD.ts', file)
console.log('wrote', res.length, 'materials')
