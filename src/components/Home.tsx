import { ALL_MATERIALS as MATERIALS } from '../data/materials'
import type { AppState } from '../types'
import { TAG_MAP } from '../types'
import { fmtDate } from '../lib/format'

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
  const recent = [...marks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)

  return (
    <div className="view">
      <div className="topbar">
        <div>
          <div className="brand">回响 Echo</div>
          <div className="brand-sub">不教新词，只修你已有的漏洞</div>
        </div>
        <div className="topbar-actions">
          <button className="link" onClick={onLibrary}>
            素材
          </button>
          <button className="link" onClick={onMarks}>
            卡点
          </button>
          <button className="link" onClick={onProgress}>
            进度
          </button>
          <button className="link" onClick={onSettings}>
            {state.user || '设置'}
          </button>
        </div>
      </div>

      <div className="hero">
        <div className="kicker">今日一练</div>
        <h1>听完，用自己的英文讲一遍。</h1>
        <p className="hero-note">
          今天推给你《{rec.title}》。不用听懂每个词，先抓住它想说什么；讲完回听，标出卡住的那几秒。
        </p>
        <div className="hero-cta">
          <button className="btn primary" onClick={() => onListen(rec.id)}>
            开始今日训练
          </button>
          <span className="hero-meta">
            {rec.category} · {rec.seconds} 秒 · {rec.accent} · 音变{rec.reduction}
          </span>
        </div>
      </div>

      <div className="grid-2">
        <button className="path-card" onClick={onImpromptu}>
          <div className="path-kicker">没有素材也能练</div>
          <div className="path-title">即兴开口</div>
          <p className="path-desc">随机一题，限时说完，只给一条建议。</p>
        </button>
        <button className="path-card" onClick={onLibrary}>
          <div className="path-kicker">{MATERIALS.length} 条内置素材</div>
          <div className="path-title">素材库</div>
          <p className="path-desc">六类题材，30 秒到 2 分钟。</p>
        </button>
      </div>

      <div className="card">
        <div className="card-label">你的记录</div>
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
        <button className="btn ghost wide" onClick={onMarks}>
          打开卡点库 →
        </button>
      </div>

      {recent.length > 0 ? (
        <div className="card">
          <div className="card-label">最近标记</div>
          <ul className="recent-list">
            {recent.map((m) => {
              const t = TAG_MAP[m.tag]
              return (
                <li key={m.id} className="recent-item">
                  <span className="dot" style={{ background: t.color }} />
                  <div className="recent-main">
                    <div className="recent-heard">{m.heard || m.intent || '（没有转写）'}</div>
                    <div className="recent-meta">
                      {t.label} · {fmtDate(m.createdAt)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="fineprint">
          第一次用？先做一次「今日训练」，你会明白这个产品在干什么。
        </p>
      )}
    </div>
  )
}
