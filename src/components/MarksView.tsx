import { useMemo, useState } from 'react'
import type { AiConfig, AppState, Mark } from '../types'
import { MarkCard } from './MarkCard'
import { Empty } from './ui'
import { fmtDate } from '../lib/format'
import { getMaterial } from '../lib/materialMedia'

type Filter = 'all' | Mark['status']

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待重录' },
  { key: 'redone', label: '已重录' },
  { key: 'skipped', label: '暂不修' },
]

export function MarksView({
  state,
  ai,
  onUpdateMark,
  onBack,
}: {
  state: AppState
  ai: AiConfig
  onUpdateMark: (id: string, patch: Partial<Mark>) => void
  onBack: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const audioBySession = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    for (const s of state.sessions) map[s.id] = s.audioId
    return map
  }, [state.sessions])

  const materialBySession = useMemo(() => {
    const map: Record<string, { title?: string; text?: string } | undefined> = {}
    for (const s of state.sessions) {
      const m = s.materialId ? getMaterial(s.materialId) : undefined
      map[s.id] = m ? { title: m.title, text: m.text } : undefined
    }
    return map
  }, [state.sessions])

  const list = useMemo(() => {
    const all = filter === 'all' ? state.marks : state.marks.filter((m) => m.status === filter)
    return [...all].sort((a, b) => b.createdAt - a.createdAt)
  }, [state.marks, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, Mark[]>()
    for (const m of list) {
      const key = fmtDate(m.createdAt).split(' ')[0]
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [list])

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">卡点库</div>
        <h1>标记过的每一处</h1>
        <p className="fineprint">状态变成「已重录」，才算改过一次。</p>
      </div>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip-btn ${filter === f.key ? 'is-on' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
            <span className="chip-count">
              {f.key === 'all' ? state.marks.length : state.marks.filter((m) => m.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty title="这里还是空的" hint="做一次训练，回听录音，在你说错的地方打个标。" />
      ) : (
        grouped.map(([day, marks]) => (
          <section key={day} className="mark-group">
            <div className="section-label">{day}</div>
            <div className="mark-list">
              {marks.map((m) => (
                <MarkCard
                  key={m.id}
                  mark={m}
                  ai={ai}
                  material={materialBySession[m.sessionId]}
                  sessionAudioId={audioBySession[m.sessionId]}
                  onUpdate={(patch) => onUpdateMark(m.id, patch)}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <div className="spacer" />
    </div>
  )
}
