import { useRef, useState } from 'react'
import type { AiConfig, Mark, SuggestionTier } from '../types'
import { TAG_MAP } from '../types'
import { getSuggestion } from '../lib/ai'
import { TagChip } from './ui'
import { usePlayer } from '../lib/player'
import { useTts } from '../lib/tts'
import { useVoiceCapture, type CaptureResult } from '../lib/capture'
import { putAudio } from '../lib/idb'
import { fmtPrecise } from '../lib/format'

const TIER: Record<SuggestionTier, { label: string; color: string }> = {
  must: { label: '必改', color: '#b91c1c' },
  upgrade: { label: '可升级', color: '#7c3aed' },
  replace: { label: '换个说法', color: '#0f766e' },
}

const STATUS_LABEL: Record<Mark['status'], string> = {
  pending: '待重录',
  redone: '已重录',
  skipped: '暂不修',
}

export function MarkCard({
  mark,
  ai,
  material,
  sessionAudioId,
  onUpdate,
}: {
  mark: Mark
  ai?: AiConfig
  material?: { title?: string; text?: string }
  sessionAudioId?: string
  onUpdate: (patch: Partial<Mark>) => void
}) {
  const tts = useTts()
  const orig = usePlayer(sessionAudioId)
  const redoPlayer = usePlayer(mark.redoneAudioId)
  const cap = useVoiceCapture()

  const [redoOpen, setRedoOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const finishing = useRef(false)

  const tag = TAG_MAP[mark.tag]

  const persist = async (r: CaptureResult) => {
    if (finishing.current) return
    finishing.current = true
    setBusy(true)
    try {
      if (!r.blob || r.blob.size === 0) {
        setLocalErr('没有录到声音，检查一下麦克风。')
        return
      }
      const id = `redo_${mark.id}_${Date.now().toString(36)}`
      await putAudio(id, r.blob)
      onUpdate({ redoneAudioId: id, status: 'redone' })
      setRedoOpen(false)
    } finally {
      setBusy(false)
      finishing.current = false
    }
  }

  const startRedo = async () => {
    setLocalErr(null)
    setRedoOpen(true)
    await cap.start({ asr: true })
  }

  const finishRedo = async () => {
    const r = await cap.stop()
    await persist(r)
  }

  const cancelRedo = async () => {
    finishing.current = true
    await cap.stop()
    finishing.current = false
    setRedoOpen(false)
  }

  const sug = mark.suggestion

  const [genBusy, setGenBusy] = useState(false)
  const [variant, setVariant] = useState(0)
  const [flash, setFlash] = useState('')

  const generate = async () => {
    if (!ai) return
    setGenBusy(true)
    setFlash('')
    try {
      const next = variant + 1
      setVariant(next)
      const s = await getSuggestion({
        cfg: ai,
        tag: mark.tag,
        tagLabel: tag.label,
        heard: mark.heard,
        intent: mark.intent,
        material,
        variant: next,
      })
      onUpdate({ suggestion: s })
      setFlash(s.source === 'offline' ? '已重算。离线库说法有限，配远程模型能换出更多。' : '已换一条。')
      window.setTimeout(() => setFlash(''), 5000)
    } finally {
      setGenBusy(false)
    }
  }

  return (
    <article className={`mark-card ${mark.status}`}>
      <div className="mark-head">
        <TagChip color={tag.color} label={tag.label} />
        <span className="mark-time">
          {fmtPrecise(mark.startMs)} – {fmtPrecise(mark.endMs)}
        </span>
        <span className="mark-status">{STATUS_LABEL[mark.status]}</span>
      </div>

      {mark.heard ? <blockquote className="heard">“{mark.heard}”</blockquote> : null}
      {mark.intent ? <div className="intent">想说的：{mark.intent}</div> : null}

      {sug ? (
        <div className="suggestion">
          <div className="suggestion-head">
            <span className="tier" style={{ color: TIER[sug.tier].color, borderColor: `${TIER[sug.tier].color}55` }}>
              {TIER[sug.tier].label}
            </span>
            <span className="suggestion-source">
              {sug.source === 'remote'
                ? ai?.baseUrl?.startsWith('/api')
                  ? '远程模型 · 站点额度'
                  : '远程模型 · 你的 key'
                : sug.origin === 'tag'
                  ? '离线规则'
                  : '离线生成'}
            </span>
          </div>
          {sug.original ? (
            <div className="original">
              <div className="original-label">材料原句</div>
              <p className="original-text">{sug.original}</p>
              {sug.gist ? <p className="original-gist">{sug.gist}</p> : null}
            </div>
          ) : null}
          <p className="core-issue">{sug.coreIssue}</p>
          <ol className="options">
            {sug.options.map((o, i) => (
              <li key={`${o.text}-${i}`}>
                <div className="option-row">
                  <span className="option-text">{o.text}</span>
                  <button
                    className="icon-btn"
                    title={tts.supported ? '朗读' : '复制这句话'}
                    onClick={() => {
                      if (tts.supported) {
                        tts.speak(o.text, { rate: 0.9 })
                        return
                      }
                      void navigator.clipboard?.writeText(o.text).then(() => {
                        setCopied(o.text)
                        window.setTimeout(() => setCopied(null), 1400)
                      })
                    }}
                  >
                    {copied === o.text ? '✓' : tts.supported ? '▶' : '⧉'}
                  </button>
                </div>
                <div className="option-meta">
                  <span className="reg">{o.register}</span>
                  {o.note ? <span>{o.note}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="redo-box">
          <div className="redo-line">这条标记还没有建议。现在生成一条？</div>
          <button className="btn sm" onClick={() => void generate()} disabled={genBusy || !ai}>
            {genBusy ? '生成中…' : ai ? '生成建议' : '先到设置里配置建议来源'}
          </button>
        </div>
      )}

      <div className="mark-actions">
        <button className="btn ghost sm" onClick={() => orig.play(mark.startMs, mark.endMs)}>
          听原声
        </button>
        {!redoOpen ? (
          <button className="btn sm" onClick={() => void startRedo()}>
            {mark.redoneAudioId ? '再录一次' : '重录这段'}
          </button>
        ) : null}
        {mark.status === 'skipped' ? (
          <button className="btn ghost sm" onClick={() => onUpdate({ status: 'pending' })}>
            放回待修
          </button>
        ) : (
          <button className="btn ghost sm" onClick={() => onUpdate({ status: 'skipped' })}>
            暂不修
          </button>
        )}
        {mark.suggestion ? (
          <button className="btn ghost sm" onClick={() => void generate()} disabled={genBusy || !ai}>
            {genBusy ? '生成中…' : '换一条建议'}
          </button>
        ) : null}
      </div>

      {flash ? <div className="flash-line">{flash}</div> : null}

      {redoOpen ? (
        <div className="redo-box">
          <div className="redo-line">
            <span className="rec-dot" />
            <span className="mono">{fmtPrecise(cap.elapsedMs)}</span>
            <span className="muted">说完了就点停止</span>
          </div>
          {cap.interim ? <div className="redo-live">{cap.interim}</div> : null}
          {cap.segments.length ? (
            <div className="redo-live">{cap.segments.map((s) => s.text).join(' ')}</div>
          ) : null}
          <div className="meter">
            <div className="meter-fill" style={{ width: `${Math.round(cap.level * 100)}%` }} />
          </div>
          {cap.error || localErr ? <div className="warn">{cap.error ?? localErr}</div> : null}
          <div className="redo-actions">
            <button className="btn primary sm" onClick={() => void finishRedo()} disabled={busy}>
              {busy ? '保存中…' : '停止并保存'}
            </button>
            <button className="btn ghost sm" onClick={() => void cancelRedo()} disabled={busy}>
              取消
            </button>
          </div>
          <p className="fineprint">说到你自己满意为止，再点停止。不用卡在 2–4 秒，说整句更好。</p>
        </div>
      ) : null}

      {mark.redoneAudioId ? (
        <div className="ab">
          <span className="ab-label">新旧对比</span>
          <button className="btn ghost sm" onClick={() => orig.play(mark.startMs, mark.endMs)}>
            ▶ 原声
          </button>
          <button className="btn ghost sm" onClick={() => redoPlayer.toggle()}>
            {redoPlayer.playing ? '❙❙ 暂停' : '▶ 新录'}
          </button>
        </div>
      ) : null}
    </article>
  )
}
