import { readFileSync, writeFileSync } from 'node:fs'

const res = JSON.parse(readFileSync('scripts/ted_clean.json', 'utf8'))

const meta = {
  ken_robinson: { id: 'm33', zh: '演讲：学校是不是把创造力教没了', accent: '英音', fam: '一般', red: '中', note: 'TED 官方字幕，笑声多、插话多，适合练"抓主句、跳过插科打诨"。' },
  brene_brown: { id: 'm34', zh: '演讲：脆弱的力量', accent: '美音', fam: '一般', red: '中', note: '叙事型演讲，适合练"复述一个故事"。' },
  simon_sinek: { id: 'm35', zh: '演讲：伟大领袖如何激励行动', accent: '英音', fam: '熟悉', red: '低', note: '结构清晰的"黄金圈"论证，适合练逻辑复述。' },
  celeste_headlee: { id: 'm36', zh: '演讲：让对话更好的十个方法', accent: '美音', fam: '熟悉', red: '高', note: '语速快、口语连接多，练"听语气、抓建议"。' },
  chimamanda: { id: 'm37', zh: '演讲：单一故事的危险', accent: '尼音', fam: '陌生', red: '中', note: '尼日利亚口音，适合练"换口音也能听懂"。' },
  susan_cain: { id: 'm38', zh: '演讲：内向者的力量', accent: '美音', fam: '一般', red: '低', note: '语速稳、观点明确，适合做主旨综述。' },
}

const items = res
  .map((r) => {
    const m = meta[r.key]
    const text = (r.enClean || r.enText).replace(/\s+/g, ' ').trim().replace(/^([a-z])/, (c) => c.toUpperCase())
    const zh = r.zhText.replace(/\s+/g, '')
    return `  {
    id: '${m.id}',
    title: '${m.zh}',
    source: 'TED 原声 · ${r.speaker} · CC BY-NC-ND',
    category: '演讲',
    seconds: 75,
    accent: '${m.accent}',
    reduction: '${m.red}',
    familiarity: '${m.fam}',
    audioUrl: '/audio/${r.file}',
    sourceNote: '音频为 TED 官方视频的 75 秒截取，原文与中文字幕来自 TED 官方字幕，CC BY-NC-ND 4.0，仅供个人学习，请勿再分发。',
    text: \`${text}\`,
    textZh: \`${zh}\`,
    note: '${m.note}',
  },`
  })
  .join('\n')

const file = `import type { Material } from '../types'

/**
 * 真人原声素材：TED 官方视频截取的 75 秒片段 + 官方字幕
 * 许可证 CC BY-NC-ND 4.0 —— 仅限个人学习，勿再分发。
 * 重新生成：scripts/ted_build.mjs（下载/切音频）→ scripts/gen_real.mjs（生成本文件）
 */
export const REAL_MATERIALS: Material[] = [
${items}
]
`

writeFileSync('C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/realMaterials.ts', file)
console.log('wrote', res.length, 'materials')
