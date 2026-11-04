import type { AppState } from '../types'
import { allAudio, clearAudio, putAudio } from './idb'

/** 整包导出：状态 + 所有音频（录音、重录、导入的材料原声），换电脑也不会丢 */
export interface EchoPack {
  kind: 'echo-backup'
  v: 1
  exportedAt: number
  state: AppState
  audio: { id: string; type: string; base64: string }[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const s = String(fr.result || '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: type || 'audio/webm' })
}

export async function buildPack(state: AppState): Promise<EchoPack> {
  const files = await allAudio()
  const audio: EchoPack['audio'] = []
  for (const f of files) {
    audio.push({ id: f.id, type: f.blob.type || 'audio/webm', base64: await blobToBase64(f.blob) })
  }
  return { kind: 'echo-backup', v: 1, exportedAt: Date.now(), state, audio }
}

export async function downloadPack(state: AppState): Promise<string> {
  const pack = await buildPack(state)
  const blob = new Blob([JSON.stringify(pack)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  a.href = url
  a.download = `echo-backup-${stamp}.json`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  return `${pack.audio.length} 段音频，${(blob.size / 1024 / 1024).toFixed(1)}MB`
}

export function parsePack(text: string): EchoPack {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('这个文件不是 JSON，可能选错了。')
  }
  if (data?.kind !== 'echo-backup' || !data.state) {
    throw new Error('不是 Echo 的备份文件（缺 kind/state）。')
  }
  if (!Array.isArray(data.state.sessions) || !Array.isArray(data.state.marks)) {
    throw new Error('备份里的记录结构不对。')
  }
  if (data.v !== 1) throw new Error(`备份版本 v${data.v} 太新，这个版本的应用读不了。`)
  return data as EchoPack
}

/** 覆盖式恢复：先清空音频库，再写回，避免留下孤儿数据 */
export async function restorePack(pack: EchoPack): Promise<number> {
  await clearAudio()
  for (const a of pack.audio || []) {
    await putAudio(a.id, base64ToBlob(a.base64, a.type))
  }
  return (pack.audio || []).length
}
