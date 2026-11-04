import { useMemo } from 'react'
import type { AppState } from '../types'
import { TAGS, TAG_MAP } from '../types'
import { Empty } from './ui'
import { fmtClock, fmtDay } from '../lib/format'

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 280
  const h = 64
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - 6 - ((v - min) / span) * (h - 16)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#c2410c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w
        const y = h - 6 - ((v - min) / span) * (h - 16)
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#c2410c" />
      })}
    </svg>
  )
}

export function ProgressView({
  state,
  onBack,
  onOpenSession,
}: {
  state: AppState
  onBack: () => void
  onOpenSession: (id: string) => void
}) {
  const sessions = useMemo(() => [...state.sessions].sort((a, b) => a.createdAt - b.createdAt), [state.sessions])

  const totals = useMemo(() => {
    const count = sessions.length
    const minutes = sessions.reduce((s, x) => s + x.durationMs, 0) / 60000
    const withSpeech = sessions.filter((s) => s.metrics.words > 0)
    const avgWpm = withSpeech.length
      ? Math.round(withSpeech.reduce((s, x) => s + x.metrics.wpm, 0) / withSpeech.length)
      : 0
    const marks = state.marks.length
    const redone = state.marks.filter((m) => m.status === 'redone').length
    return { count, minutes, avgWpm, marks, redone }
  }, [sessions, state.marks])

  const wpmSeries = sessions.filter((s) => s.metrics.words > 0).slice(-12).map((s) => s.metrics.wpm)

  const tagCounts = useMemo(() => {
    const map = Object.fromEntries(TAGS.map((t) => [t.key, 0])) as Record<string, number>
    for (const m of state.marks) map[m.tag] = (map[m.tag] ?? 0) + 1
    return map
  }, [state.marks])
  const maxTag = Math.max(1, ...Object.values(tagCounts))

  /** 同类卡点跨训练重复出现 = 复发；只出现一次的类型不算 */
  const recurrence = useMemo(() => {
    const byTag = new Map<string, Set<string>>()
    for (const m of state.marks) {
      const set = byTag.get(m.tag) ?? new Set<string>()
      set.add(m.sessionId)
      byTag.set(m.tag, set)
    }
    return [...byTag.entries()]
      .map(([tag, set]) => ({
        tag,
        sessions: set.size,
        marks: state.marks.filter((m) => m.tag === tag).length,
      }))
      .filter((r) => r.sessions >= 2)
      .sort((a, b) => b.sessions - a.sessions)
  }, [state.marks])

  const pairs = useMemo(() => {
    const byTopic = new Map<string, typeof sessions>()
    for (const s of sessions) {
      if (s.type !== 'impromptu' || !s.topic) continue
      const arr = byTopic.get(s.topic) ?? []
      arr.push(s)
      byTopic.set(s.topic, arr)
    }
    return [...byTopic.entries()].filter(([, arr]) => arr.length >= 2)
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <div className="view">
        <div className="view-head">
          <button className="back" onClick={onBack}>
            ← 返回
          </button>
          <div className="kicker">进度</div>
          <h1>还没有数据</h1>
        </div>
        <Empty title="做一次训练，这里就会长出来" hint="WPM、停顿、填充词、已修卡点数，都从你的录音里算。" />
      </div>
    )
  }

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">进度</div>
        <h1>只跟自己比</h1>
        <p className="fineprint">不排名，不打卡。只看两件事：说得更快了吗，改掉的多了吗。</p>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{totals.count}</div>
            <div className="stat-label">训练次数</div>
          </div>
          <div className="stat">
            <div className="stat-num">{totals.minutes.toFixed(0)}</div>
            <div className="stat-label">总分钟</div>
          </div>
          <div className="stat">
            <div className="stat-num">{totals.avgWpm}</div>
            <div className="stat-label">平均 WPM</div>
          </div>
          <div className="stat">
            <div className="stat-num">
              {totals.redone}/{totals.marks}
            </div>
            <div className="stat-label">已修卡点</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-label">语速趋势（最近 12 次，wpm）</div>
        {wpmSeries.length >= 2 ? <Spark values={wpmSeries} /> : <p className="muted">再练一次就能连成线。</p>}
        <p className="fineprint">语速不是越高越好。它只是"更顺"的一个侧面指标。</p>
      </div>

      <div className="card">
        <div className="card-label">卡点分布</div>
        <ul className="dist">
          {TAGS.map((t) => (
            <li key={t.key}>
              <span className="dist-label">{t.label}</span>
              <span className="dist-bar">
                <span style={{ width: `${((tagCounts[t.key] ?? 0) / maxTag) * 100}%`, background: t.color }} />
              </span>
              <span className="dist-num">{tagCounts[t.key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="card-label">反复卡住的类型</div>
        {recurrence.length ? (
          <>
            <ul className="dist">
              {recurrence.map((r) => {
                const t = TAG_MAP[r.tag as keyof typeof TAG_MAP]
                return (
                  <li key={r.tag}>
                    <span className="dist-label">{t.label}</span>
                    <span className="dist-bar">
                      <span
                        style={{
                          width: `${(r.sessions / Math.max(...recurrence.map((x) => x.sessions))) * 100}%`,
                          background: t.color,
                        }}
                      />
                    </span>
                    <span className="dist-num">{r.sessions} 次</span>
                  </li>
                )
              })}
            </ul>
            <p className="fineprint">
              同一个类型在不同训练里重复出现，说明它没被真正改掉。已修过的卡点再出现，也算复发。
            </p>
          </>
        ) : (
          <p className="muted">还没有在两次以上训练里重复出现的类型。</p>
        )}
      </div>

      {pairs.length > 0 ? (
        <div className="card">
          <div className="card-label">同题两版</div>
          {pairs.slice(0, 3).map(([topic, arr]) => {
            const [a, b] = [arr[arr.length - 2], arr[arr.length - 1]]
            return (
              <div key={topic} className="pair">
                <div className="pair-topic">{topic}</div>
                <div className="pair-grid">
                  <div className="pair-col">
                    <div className="pair-tag">初版</div>
                    <div className="pair-num">{a.metrics.wpm} wpm</div>
                    <div className="pair-sub">
                      填充 {a.metrics.fillers} · 停顿 {a.metrics.pauses}
                    </div>
                  </div>
                  <div className="pair-col">
                    <div className="pair-tag">重说</div>
                    <div className="pair-num">{b.metrics.wpm} wpm</div>
                    <div className="pair-sub">
                      填充 {b.metrics.fillers} · 停顿 {b.metrics.pauses}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="card">
        <div className="card-label">训练记录</div>
        <ul className="session-list">
          {[...sessions].reverse().slice(0, 12).map((s) => {
            const markCount = state.marks.filter((m) => m.sessionId === s.id).length
            return (
              <li key={s.id}>
                <button className="session-item" onClick={() => onOpenSession(s.id)}>
                  <span className="session-day">{fmtDay(s.createdAt)}</span>
                  <span className="session-title">
                    {s.type === 'summary' ? '听力综述' : `即兴 · ${s.topic ?? ''}`}
                  </span>
                  <span className="session-meta">
                    {fmtClock(s.durationMs)} · {s.metrics.wpm}wpm · {markCount} 标
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="spacer" />
    </div>
  )
}
