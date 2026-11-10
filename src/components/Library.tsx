import { useMemo, useState } from 'react'
import { CATEGORIES, MATERIALS } from '../data/materials'
import { shortOf } from '../data/shorts'
import type { Category } from '../types'

export function Library({
  onListen,
  onBack,
}: {
  onListen: (id: string) => void
  onBack: () => void
}) {
  const [filter, setFilter] = useState<Category | '全部'>('全部')

  const list = useMemo(
    () => (filter === '全部' ? MATERIALS : MATERIALS.filter((m) => m.category === filter)),
    [filter],
  )

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">素材库 · {MATERIALS.length} 条</div>
        <h1>先选一条，听完再讲</h1>
        <p className="fineprint">四维难度：语速 × 口音 × 熟悉度 × 音变。点进去可以导入真人原声。</p>
      </div>

      <div className="filter-row">
        {(['全部', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip-btn ${filter === c ? 'is-on' : ''}`} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="list">
        {list.map((m) => (
          <button key={m.id} className="list-item" onClick={() => onListen(m.id)}>
            <div className="list-main">
              <div className="list-title">{m.title}</div>
              <div className="list-meta">
                {m.accent} · {shortOf(m.audioUrl) ? '30s / 60s' : `约 ${m.seconds}s`} · 音变{m.reduction} · 话题{m.familiarity}
              </div>
            </div>
            <span className="chev">→</span>
          </button>
        ))}
      </div>
      <div className="spacer" />
    </div>
  )
}
