import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app'
const rows = JSON.parse(readFileSync(ROOT + '/scripts/openings.json', 'utf8'))

const esc = (s) => JSON.stringify(s)
const body = rows
  .map(
    (r) => `  ${r.key}: {
    d30: ${Math.round(r.d30 * 1000)},
    d60: ${Math.round(r.d60 * 1000)},
    text30: ${esc(r.text30)},
    text60: ${esc(r.text60)},
  },`
  )
  .join('\n')

const out = `import type { ShortClip } from '../types'

/** 每段素材开场 30s / 60s 的文本（scripts/ted_openings.mjs 生成） */
export type Opening = { d30: number; d60: number; text30: string; text60: string }

export const OPENINGS: Record<string, Opening> = {
${body}
}

export function openingOf(audioUrl?: string): Opening | undefined {
  if (!audioUrl) return undefined
  const m = /\\/audio\\/(?:open\\/)?([\\w-]+?)(?:_60|_30)?\\.mp3$/.exec(audioUrl)
  return m ? OPENINGS[m[1]] : undefined
}

export function shortOfOpening(key: string): ShortClip | undefined {
  const o = OPENINGS[key]
  if (!o) return undefined
  return { audioUrl: \`/audio/open/\${key}_30.mp3\`, durationMs: o.d30, text: o.text30 }
}
`

writeFileSync(ROOT + '/src/data/openings.ts', out)
console.log('wrote openings.ts rows=' + rows.length)
