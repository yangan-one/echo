import { readFileSync, writeFileSync } from 'node:fs'
const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const rows = JSON.parse(readFileSync(ROOT + '/scripts/biz_clean.json', 'utf8'))
const zh = JSON.parse(readFileSync(ROOT + '/scripts/biz_zh.json', 'utf8'))

const TITLES = {
  'nx-s1-6032779': '数据中心、马斯克与中期选举的钱',
  'nx-s1-6032597': '越来越多男性，不在工作里',
  'nx-s1-6029778': 'Anthropic 凭什么值这么多钱',
  'nx-s1-6028029': 'AI 会抢走我的工作吗',
  'nx-s1-6026712': '可调利率房贷，该重新考虑了吗',
  'nx-s1-6022220': '加密货币怎么进了巴基斯坦',
  'nx-s1-6021286': '蒙大拿州想终结「联合公民」',
  'nx-s1-6019698': 'MBA 还有必要读吗',
  'nx-s1-6014541': '机器人正在接管互联网',
  'nx-s1-6012368': 'CoreWeave 的麻烦，和枫糖浆',
}

const trimEn = (t) => {
  const s = t.trim()
  const i = s.lastIndexOf('.')
  return i > s.length * 0.7 ? s.slice(0, i + 1) : s
}
const trimZh = (t) => {
  const s = (t || '').trim()
  const i = s.lastIndexOf('。')
  return i > s.length * 0.6 ? s.slice(0, i + 1) : s
}
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const out = []
out.push('// 自动生成：NPR The Indicator 商业/经济素材（scripts/gen_biz.mjs）')
out.push("import type { Material } from '../types'")
out.push('')
out.push('export const BIZ_MATERIALS: Material[] = [')
rows.forEach((r, i) => {
  const id = 'm' + (101 + i)
  const title = TITLES[r.key] || r.title
  const z = zh[r.key] || {}
  out.push('  {')
  out.push(`    id: '${id}',`)
  out.push(`    title: ${JSON.stringify(title)},`)
  out.push(`    source: 'NPR · The Indicator',`)
  out.push(`    category: '商业',`)
  out.push(`    seconds: 60,`)
  out.push(`    text: \`${esc(r.text60)}\`,`)
  out.push(`    textZh: \`${esc((z.zh60 || "").trim())}\`,`)
  out.push(`    accent: '美音',`)
  out.push(`    reduction: '中',`)
  out.push(`    familiarity: '一般',`)
  out.push(`    audioUrl: '/audio/biz/${r.key}_60.mp3',`)
  out.push(`    note: '商业经济，信息密度高，适合复述。',`)
  out.push('  },')
})
out.push(']')
out.push('')
out.push('export const BIZ_SHORTS: Record<string, { audioUrl: string; durationMs: number; text: string; textZh?: string }> = {')
rows.forEach((r) => {
  const z = zh[r.key] || {}
  out.push(
    `  '${r.key}_60': { audioUrl: '/audio/biz/${r.key}_30.mp3', durationMs: 30000, text: \`${esc(r.text30)}\`, textZh: \`${esc((z.zh30 || "").trim())}\` },`
  )
})
out.push('}')
writeFileSync(ROOT + '/src/data/bizMaterials.ts', out.join('\n'))
console.log('wrote', rows.length)
