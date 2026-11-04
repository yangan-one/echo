export type TagKey =
  | 'wordgap'
  | 'wrong'
  | 'verbose'
  | 'unnatural'
  | 'tone'
  | 'broken'

export interface TagDef {
  key: TagKey
  label: string
  hint: string
  color: string
}

export const TAGS: TagDef[] = [
  { key: 'wordgap', label: '词穷', hint: '想不起那个词', color: '#c2410c' },
  { key: 'wrong', label: '说错', hint: '说出了错句', color: '#b91c1c' },
  { key: 'verbose', label: '太啰嗦', hint: '意思对，但绕了半天', color: '#a16207' },
  { key: 'unnatural', label: '不地道', hint: '没错，但不像母语者', color: '#7c3aed' },
  { key: 'tone', label: '语气不对', hint: '想更狠 / 更软 / 更委婉', color: '#0f766e' },
  { key: 'broken', label: '接不上', hint: '逻辑断了，不知道下一句说什么', color: '#1d4ed8' },
]

export const TAG_MAP: Record<TagKey, TagDef> = TAGS.reduce((acc, t) => {
  acc[t.key] = t
  return acc
}, {} as Record<TagKey, TagDef>)

export type Category =
  | '双语平行'
  | '演讲'
  | '新闻'
  | '访谈'
  | '生活'
  | '学术'
  | '多口音'
  | '播客'
  | '纪实'
  | '会议'

export interface ShortClip {
  audioUrl: string
  durationMs: number
  text: string
  textZh?: string
}

export interface Material {
  id: string
  title: string
  source: string
  category: Category
  /** 预计朗读秒数（TTS 1.0x 估算） */
  seconds: number
  text: string
  /** 中英对照（双语平行材料才有） */
  textZh?: string
  accent: '美音' | '英音' | '澳音' | '印音' | '尼音' | '其他口音'
  /** 连读弱读密度：低 / 中 / 高 */
  reduction: '低' | '中' | '高'
  /** 话题熟悉度 */
  familiarity: '熟悉' | '一般' | '陌生'
  note?: string
  /** 去哪里能拿到这段的真人原声（演讲页、播客单集、会议录像等） */
  sourceNote?: string
  /** 可选：外部音频地址；缺省时用浏览器 TTS 朗读 */
  audioUrl?: string
}

export interface TranscriptSeg {
  text: string
  startMs: number
  endMs: number
}

export type SuggestionTier = 'must' | 'upgrade' | 'replace'

export interface SuggestionOption {
  text: string
  register: '正式' | '中性' | '口语'
  note?: string
}

export interface Suggestion {
  tier: SuggestionTier
  coreIssue: string
  /** 材料里对应的那一句原文（如果匹配到） */
  original?: string
  /** 原句在说什么（中文），远程模式会给，离线模式通常没有 */
  gist?: string
  options: SuggestionOption[]
  source: 'offline' | 'remote'
  /** intent = 围绕用户中文意图生成（不要提示"材料里没找到原句"） */
  origin?: 'material' | 'intent' | 'tag'
}

export type MarkStatus = 'pending' | 'redone' | 'skipped'

export interface Mark {
  id: string
  sessionId: string
  startMs: number
  endMs: number
  tag: TagKey
  /** 用户用中文补充的“我当时想说什么” */
  intent: string
  /** 当时实际说出的句子（来自转写） */
  heard: string
  suggestion?: Suggestion
  status: MarkStatus
  redoneAudioId?: string
  createdAt: number
}

export interface Metrics {
  words: number
  wpm: number
  pauses: number
  fillers: number
  corrections: number
}

export interface Session {
  id: string
  type: 'summary' | 'impromptu'
  materialId?: string
  topic?: string
  createdAt: number
  durationMs: number
  audioId?: string
  /** 录音时实时采样得到的音量包络（0–1），用于画波形 */
  peaks?: number[]
  transcript: TranscriptSeg[]
  /** 转写来源：浏览器实时识别，或本机转写服务 */
  asrSource?: 'browser' | 'endpoint'
  /** 本机转写失败的原因（失败时退回人工打标） */
  asrError?: string
  metrics: Metrics
  /** 材料主旨参考：3–4 句口语化综述，先给参考再让用户自己打标 */
  gist?: string[]
  gistSource?: 'offline' | 'remote'
  /** 即兴题：AI 复述"你大概想说的是"，口语版 */
  rewrite?: string[]
  /** AI 这一版动了什么（中文短句） */
  rewriteNotes?: string[]
  rewriteSource?: 'offline' | 'remote'
  /** 没有转写时，用户自己写的中文意图 */
  intentZh?: string
  /** 1 = 初版，2 = 同题重说 */
  version: number
  parentId?: string
}

export interface AiConfig {
  mode: 'offline' | 'remote'
  baseUrl: string
  apiKey: string
  model: string
  /** 可选：用户自己的模型 key（只存本机，不上传服务器）。填了就直连服务商，不消耗站点额度 */
  ownKey?: string
  ownBaseUrl?: string
  ownModel?: string
  /** 可选：本机转写服务（OpenAI 兼容 /v1/audio/transcriptions）。留空则用浏览器识别 */
  asrUrl?: string
  asrModel?: string
  asrToken?: string
}

export interface AppState {
  user: string
  ai: AiConfig
  sessions: Session[]
  marks: Mark[]
  redoneMarks: string[]
}
