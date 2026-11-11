import { ALL_MATERIALS as MATERIALS } from '../data/materials'
import type { AppState } from '../types'

function dayIndex(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

export function Home({
  state,
  onListen,
  onImpromptu,
  onLibrary,
  onMarks,
  onProgress,
  onSettings,
}: {
  state: AppState
  onListen: (id: string) => void
  onImpromptu: () => void
  onLibrary: () => void
  onMarks: () => void
  onProgress: () => void
  onSettings: () => void
}) {
  const rec = MATERIALS[dayIndex() % MATERIALS.length]
  const marks = state.marks
  const redone = marks.filter((m) => m.status === 'redone').length
  const pending = marks.filter((m) => m.status === 'pending').length

  return (
    <div className="view">
      <div className="topbar">
        <div className="brand">回响 Echo</div>
        <button className="link" onClick={onSettings}>
          {state.user || '设置'}
        </button>
      </div>

      <div className="hero">
        <div className="kicker">今日一练</div>
        <div className="hero-cta">
          <button className="btn primary" onClick={() => onListen(rec.id)}>
            开始今日训练
          </button>
          <span className="hero-meta">
            {rec.title} · {rec.accent}
          </span>
        </div>
      </div>

      <div className="grid-2">
        <button className="path-card" onClick={onImpromptu}>
          <div className="path-title">即兴开口</div>
        </button>
        <button className="path-card" onClick={onLibrary}>
          <div className="path-kicker">{MATERIALS.length} 条素材</div>
          <div className="path-title">素材库</div>
        </button>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{state.sessions.length}</div>
            <div className="stat-label">训练次数</div>
          </div>
          <div className="stat">
            <div className="stat-num">{marks.length}</div>
            <div className="stat-label">卡点</div>
          </div>
          <div className="stat">
            <div className="stat-num">{redone}</div>
            <div className="stat-label">已重录</div>
          </div>
          <div className="stat">
            <div className="stat-num">{pending}</div>
            <div className="stat-label">待修</div>
          </div>
        </div>
        <div className="row-2">
          <button className="btn ghost" onClick={onMarks}>
            卡点库
          </button>
          <button className="btn ghost" onClick={onProgress}>
            进度
          </button>
        </div>
      </div>
    </div>
  )
}
