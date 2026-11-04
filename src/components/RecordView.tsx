import { useState } from 'react'
import type { CaptureResult } from '../lib/capture'
import { useVoiceCapture } from '../lib/capture'
import { fmtClock } from '../lib/format'

export function RecordView({
  kicker,
  title,
  prompt,
  limitMs,
  onBack,
  onFinish,
}: {
  kicker: string
  title: string
  prompt: string
  limitMs: number
  onBack: () => void
  onFinish: (r: CaptureResult) => void
}) {
  const cap = useVoiceCapture()
  const [phase, setPhase] = useState<'idle' | 'warmup' | 'recording' | 'saving'>('idle')
  const [tooShort, setTooShort] = useState(false)

  const begin = async () => {
    setTooShort(false)
    setPhase('warmup')
    await cap.start({
      maxMs: limitMs,
      onLimit: (r) => {
        setPhase('saving')
        onFinish(r)
      },
    })
    setPhase('recording')
  }

  const stopAndSave = async () => {
    setPhase('saving')
    const r = await cap.stop()
    if (r.durationMs < 1500 || r.blob.size === 0) {
      setPhase('idle')
      setTooShort(true)
      return
    }
    onFinish(r)
  }

  const discard = async () => {
    await cap.stop()
    setPhase('idle')
    onBack()
  }

  const remaining = Math.max(0, limitMs - cap.elapsedMs)

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={() => (phase === 'recording' ? void stopRecordless() : onBack())}>
          ← 返回
        </button>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
        <p className="prompt">{prompt}</p>
      </div>

      <div className={`record-stage ${phase === 'recording' ? 'is-live' : ''}`}>
        <div className="timer">{phase === 'warmup' ? '• • •' : fmtClock(cap.elapsedMs)}</div>
        <div className="timer-sub">
          {phase === 'warmup'
            ? '麦克风准备中，等计时开始再说话'
            : phase === 'recording'
              ? `还剩 ${fmtClock(remaining)}，说满自动停止`
              : phase === 'saving'
                ? '处理中…'
                : `上限 ${fmtClock(limitMs)}`}
        </div>

        {phase === 'recording' ? (
          <>
            <div className="meter big">
              <div className="meter-fill" style={{ width: `${Math.round(cap.level * 100)}%` }} />
            </div>
            <div className="live-transcript">
              {cap.segments.map((s, i) => (
                <span key={i} className="live-final">
                  {s.text}{' '}
                </span>
              ))}
              {cap.interim ? <span className="live-interim">{cap.interim}</span> : null}
              {cap.segments.length === 0 && !cap.interim ? (
                <span className="muted">开始说英文，这里会出现实时转写（可能不准，仅供定位）</span>
              ) : null}
            </div>
          </>
        ) : (
          <p className="stage-hint">
            不是考试。说错、卡住、绕圈子都可以，那些正是待会儿要打标的地方。
          </p>
        )}

        {cap.error ? <div className="warn">{cap.error}</div> : null}
        {tooShort ? <div className="warn">只录到很短一点，再说一次吧。</div> : null}

        <div className="record-actions">
          {phase === 'warmup' ? (
            <button className="btn wide" disabled>
              正在打开麦克风…
            </button>
          ) : null}
          {phase === 'idle' ? (
            <button className="btn primary wide" onClick={() => void begin()}>
              开始录音
            </button>
          ) : null}
          {phase === 'recording' ? (
            <>
              <button className="btn primary wide" onClick={() => void stopAndSave()}>
                说完了 · 停止
              </button>
              <button className="btn ghost wide" onClick={() => void discard()}>
                放弃这次
              </button>
            </>
          ) : null}
          {phase === 'saving' ? <div className="muted">正在保存录音…</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="card-label">提示</div>
        <ul className="tips">
          <li>先给结论，再补理由。不要从"首先、其次"开始。</li>
          <li>想不到词就绕过去，用一句话解释它——这比停下来强。</li>
          <li>卡住的地方不用当场修，录完回听时再打标。</li>
        </ul>
      </div>
      <div className="spacer" />
    </div>
  )

  async function stopRecordless() {
    await cap.stop()
    setPhase('idle')
    onBack()
  }
}
