import { readFileSync, writeFileSync } from 'node:fs'

const rows = JSON.parse(readFileSync('scripts/short_result.json', 'utf8'))
const esc = (s) => JSON.stringify(s)
const lines = rows
  .filter((r) => r.text)
  .map(
    (r) =>
      `  ${r.key}: { audioUrl: '/audio/${r.file}', durationMs: ${Math.round(r.dur * 1000)}, text: ${esc(r.text)}` +
      (r.textZh ? `, textZh: ${esc(r.textZh)}` : '') +
      ` },`,
  )
const body = `import type { ShortClip } from '../types'

// 30 秒短版：从一句话的开头切入，句尾结束。音频由 scripts/short_build.mjs 生成。
// key 与素材 audioUrl 的文件名一致（/audio/<key>.mp3 -> <key>）。
export const SHORTS: Record<string, ShortClip> = {
${lines.join('\n')}
}

export function shortOf(audioUrl?: string): ShortClip | undefined {
  if (!audioUrl) return undefined
  const key = audioUrl.split('/').pop()?.replace(/\\.mp3$/, '')
  return key ? SHORTS[key] : undefined
}
`
writeFileSync('src/data/shorts.ts', body)
console.log('shorts', lines.length)
