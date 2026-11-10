import { ALL_MATERIALS as MATERIALS } from '../data/materials'
import type { Material } from '../types'
import { getAudio, putAudio, delAudio } from './idb'

/** 用户为某条素材导入的「真人原声」+ 可选的自定义文本 */
const TEXT_KEY = 'echo:materialText:v1'

export function loadTextOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TEXT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveTextOverride(id: string, text: string): Record<string, string> {
  const all = loadTextOverrides()
  const trimmed = text.trim()
  if (trimmed) all[id] = trimmed
  else delete all[id]
  try {
    localStorage.setItem(TEXT_KEY, JSON.stringify(all))
  } catch {
    /* 存不下就算了，界面会提示 */
  }
  return all
}

/** 合并用户改过的文本，其它字段仍用内置素材 */
export function withOverrides(material: Material): Material {
  const all = loadTextOverrides()
  return all[material.id] ? { ...material, text: all[material.id] } : material
}

export function getMaterial(id: string): Material | undefined {
  const m = MATERIALS.find((x) => x.id === id)
  return m ? withOverrides(m) : undefined
}

export function listMaterials(): Material[] {
  const all = loadTextOverrides()
  return MATERIALS.map((m) => (all[m.id] ? { ...m, text: all[m.id] } : m))
}

/* ---------------- 原声音频（存在 IndexedDB） ---------------- */

const audioKey = (id: string) => `mat_${id}`

export async function saveMaterialAudio(id: string, blob: Blob): Promise<void> {
  await putAudio(audioKey(id), blob)
}

export async function clearMaterialAudio(id: string): Promise<void> {
  await delAudio(audioKey(id))
}

/** 每次调用都新建一个 objectURL，调用方负责在卸载时 revoke */
export async function loadMaterialAudioUrl(id: string): Promise<string | null> {
  const blob = await getAudio(audioKey(id))
  return blob ? URL.createObjectURL(blob) : null
}

export async function hasMaterialAudio(id: string): Promise<boolean> {
  const blob = await getAudio(audioKey(id))
  return !!blob
}
