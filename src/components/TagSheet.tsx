import { useEffect, useState } from 'react'
import type { TagKey } from '../types'
import { TAGS } from '../types'
import { Sheet } from './ui'
import { fmtPrecise } from '../lib/format'

export function TagSheet({
  open,
  atMs,
  heard,
  onClose,
  onConfirm,
}: {
  open: boolean
  atMs: number
  heard: string
  onClose: () => void
  onConfirm: (tag: TagKey, intent: string, heardText: string) => void
}) {
  const [tag, setTag] = useState<TagKey | null>(null)
  const [intent, setIntent] = useState('')
  const [heardText, setHeardText] = useState('')

  useEffect(() => {
    if (open) {
      setTag(null)
      setIntent('')
      setHeardText(heard)
    }
  }, [open, heard])

  return (
    <Sheet open={open} title="这里卡在哪？" subtitle={`时间点 ${fmtPrecise(atMs)}`} onClose={onClose}>
      <div className="tag-grid">
        {TAGS.map((t) => (
          <button
            key={t.key}
            className={`tag-option ${tag === t.key ? 'is-on' : ''}`}
            style={tag === t.key ? { borderColor: t.color, color: t.color } : undefined}
            onClick={() => setTag(t.key)}
          >
            <span className="tag-option-label">{t.label}</span>
            <span className="tag-option-hint">{t.hint}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">你当时说的那句（可修改）</span>
        <textarea
          className="textarea"
          rows={2}
          value={heardText}
          placeholder="没有转写也没关系，可以手动输入，或留空"
          onChange={(e) => setHeardText(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">你当时想说什么？（用中文，可留空）</span>
        <textarea
          className="textarea"
          rows={2}
          value={intent}
          placeholder="例：我们需要各取所长"
          onChange={(e) => setIntent(e.target.value)}
        />
      </label>

      <button
        className="btn primary wide"
        disabled={!tag}
        onClick={() => {
          if (!tag) return
          onConfirm(tag, intent.trim(), heardText.trim())
        }}
      >
        生成建议
      </button>
      <p className="fineprint">一次只改一处，生成后可以立刻重录。</p>
    </Sheet>
  )
}
