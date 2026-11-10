import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/tifaa/Documents/deepseek-harness/default-workspace/echo-app/src/data/shorts.ts'
let s = readFileSync(p, 'utf8')

if (!s.includes("from './openings'")) {
  s = s.replace("import type { ShortClip } from '../types'", "import type { ShortClip } from '../types'\nimport { OPENINGS } from './openings'")
}

const oldFn = `export function shortOf(audioUrl?: string): ShortClip | undefined {
  if (!audioUrl) return undefined
  const key = audioUrl.split('/').pop()?.replace(/\\.mp3$/, '')
  return key ? SHORTS[key] : undefined
}`

const newFn = `/** 优先用「开场 30 秒」；没有开场版才退回旧的 30 秒切片 */
export function shortOf(audioUrl?: string): ShortClip | undefined {
  if (!audioUrl) return undefined
  const file = audioUrl.split('/').pop() ?? ''
  const key = file.replace(/\\.mp3$/i, '').replace(/_60$/i, '')
  const o = OPENINGS[key]
  if (o) return { audioUrl: '/audio/open/' + key + '_30.mp3', durationMs: o.d30, text: o.text30 }
  return file.replace(/\\.mp3$/i, '') in SHORTS ? SHORTS[file.replace(/\\.mp3$/i, '')] : undefined
}`

if (!s.includes(oldFn)) throw new Error('shortOf not found')
s = s.replace(oldFn, newFn)
writeFileSync(p, s)
console.log('shorts.ts patched')
