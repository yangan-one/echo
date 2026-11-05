import { useEffect, useMemo, useState } from 'react'
import type { AiConfig, Mark, Session, TagKey } from '../types'
import { TAG_MAP, TAGS } from '../types'
import { Waveform } from './Waveform'
import { TagSheet } from './TagSheet'
import { MarkCard } from './MarkCard'
import { Empty } from './ui'
import { usePlayer } from '../lib/player'
import { segmentAt } from '../lib/metrics'
import { fmtClock, fmtDate, fmtPrecise } from '../lib/format'
import { getSuggestion, rewriteSpoken, summarizeMaterial } from '../lib/ai'
import { detectMoments } from '../lib/moments'
import { getMaterial } from '../lib/materialMedia'
import { uid } from '../lib/storage'

export function ReviewView({
  session,
  marks,
  ai,
  onAddMark,
  onUpdateMark,
  onUpdateSession,
  onDone,
  onRetry,
  sessions,
}: {
  session: Session
  marks: Mark[]
  ai: AiConfig
  onAddMark: (m: Mark) => void
  onUpdateMark: (id: string, patch: Partial<Mark>) => void
  onUpdateSession: (id: string, patch: Partial<Session>) => void
  onDone: () => void
  onRetry?: () => void
  sessions?: Session[]
}) {
  const player = usePlayer(session.audioId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [atMs, setAtMs] = useState(0)
  const [gistBusy, setGistBusy] = useState(false)
  const [gistFlash, setGistFlash] = useState('')
  const [rewriteBusy, setRewriteBusy] = useState(false)
  const [rewriteFlash, setRewriteFlash] = useState('')
  const [hintDraft, setHintDraft] = useState(session.intentZh ?? '')

  const transcriptText = useMemo(
    () => session.transcript.map((s) => s.text).join(' ').trim(),
    [session.transcript],
  )

  const makeRewrite = async (force = false) => {
    if (rewriteBusy) return
    if (!force && session.rewrite?.length) return
    const hint = hintDraft.trim()
    if (!transcriptText && !hint) {
      setRewriteFlash('写一句中文，我才能知道你想说什么。')
      return
    }
    // 没有转写时，用户也可能直接用英文写了一句——那就当作转写用
    const hintIsEnglish = /[A-Za-z]{3,}/.test(hint) && !/[\u4e00-\u9fff]/.test(hint)
    const transcriptArg = transcriptText || (hintIsEnglish ? hint : '')
    const hintArg = hintIsEnglish ? undefined : hint || undefined
    setRewriteBusy(true)
    setRewriteFlash('')
    try {
      const r = await rewriteSpoken({
        cfg: ai,
        topic: session.topic,
        transcript: transcriptArg,
        hint: hintArg,
      })
      onUpdateSession(session.id, {
        rewrite: r.lines,
        rewriteNotes: r.notes,
        rewriteSource: r.source,
        intentZh: hint || undefined,
      })
      if (!r.lines.length && r.source === 'offline') {
        setRewriteFlash(
          '离线模式写不出英文。到设置里配上远程模型（DeepSeek），或者直接用英文写一句，我来整理。',
        )
        return
      }
      if (force) {
        setRewriteFlash(
          r.source === 'offline'
            ? '离线版只做了去口头语；配上远程模型，才会先猜你想说什么再重写。'
            : '已重新写一版。',
        )
        window.setTimeout(() => setRewriteFlash(''), 6000)
      }
    } finally {
      setRewriteBusy(false)
    }
  }

  const makeGist = async (force = false) => {
    if (!material || gistBusy) return
    if (!force && session.gist?.length) return
    setGistBusy(true)
    setGistFlash('')
    try {
      const r = await summarizeMaterial({
        cfg: ai,
        material: { id: material.id, title: material.title, text: material.text },
      })
      onUpdateSession(session.id, { gist: r.lines, gistSource: r.source })
      if (force) {
        setGistFlash(
          r.source === 'offline'
            ? '离线参考是固定的三条，重算不会变。切到远程模型才会按原文重新生成。'
            : '已按原文重新生成。',
        )
        window.setTimeout(() => setGistFlash(''), 6000)
      }
    } finally {
      setGistBusy(false)
    }
  }

  useEffect(() => {
    if (session.type === 'summary' && material && !session.gist?.length) {
      void makeGist()
    }
    // 只在进入这次回听时生成一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  useEffect(() => {
    if (session.type === 'impromptu' && !session.rewrite?.length && transcriptText) {
      void makeRewrite()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const sessionMarks = useMemo(
    () => marks.filter((m) => m.sessionId === session.id).sort((a, b) => a.startMs - b.startMs),
    [marks, session.id],
  )

  const material = useMemo(
    () => (session.materialId ? getMaterial(session.materialId) : undefined),
    [session.materialId],
  )

  const durationMs = player.durationMs || session.durationMs
  const markOverlays = sessionMarks.map((m) => ({
    startMs: m.startMs,
    endMs: m.endMs,
    color: TAG_MAP[m.tag].color,
  }))

  /** 系统先猜几处可能卡住的地方，用户只负责确认或否掉 */
  const moments = useMemo(
    () =>
      detectMoments({
        peaks: session.peaks,
        segments: session.transcript,
        durationMs,
        marks: sessionMarks,
      }),
    [session.peaks, session.transcript, durationMs, sessionMarks],
  )

  const baseline = useMemo(() => {
    const prev = (sessions ?? []).filter((s) => s.id !== session.id)
    if (!prev.length) return null
    const avg = (f: (s: Session) => number) => prev.reduce((a, s) => a + f(s), 0) / prev.length
    return {
      wpm: Math.round(avg((s) => s.metrics.wpm)),
      pauses: avg((s) => s.metrics.pauses),
      fillers: avg((s) => s.metrics.fillers),
    }
  }, [sessions, session.id])

  const openSheet = () => {
    player.pause()
    setAtMs(Math.round(player.currentMs))
    setSheetOpen(true)
  }

  /** 空格播放、M 打标、左右键 ±2 秒——反复听 + 打标时不用来回摸鼠标 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        player.toggle()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        openSheet()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        player.seek(Math.max(0, player.currentMs - 2000))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        player.seek(Math.min(durationMs, player.currentMs + 2000))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, durationMs])

  const confirmMark = (tag: TagKey, intent: string, heardText: string) => {
    const seg = segmentAt(session.transcript, atMs)
    const start = Math.max(0, seg ? Math.max(seg.startMs, atMs - 4000) : atMs - 1500)
    const rawEnd = seg ? Math.min(seg.endMs, atMs + 4000) : atMs + 1500
    const end = Math.max(start + 600, Math.min(durationMs || rawEnd, rawEnd))

    const mark: Mark = {
      id: uid('mk'),
      sessionId: session.id,
      startMs: start,
      endMs: end,
      tag,
      intent,
      heard: heardText || seg?.text || '',
      status: 'pending',
      createdAt: Date.now(),
    }
    onAddMark(mark)
    setSheetOpen(false)

    void getSuggestion({
      cfg: ai,
      tag,
      tagLabel: TAG_MAP[tag].label,
      heard: mark.heard,
      intent,
      material: material ? { title: material.title, text: material.text } : undefined,
    }).then((s) => onUpdateMark(mark.id, { suggestion: s }))
  }

  const pending = sessionMarks.filter((m) => m.status === 'pending').length
  const redone = sessionMarks.filter((m) => m.status === 'redone').length

  return (
    <div className="view">
      <div className="view-head">
        <div className="kicker">回听 · 打标</div>
        <h1>{session.type === 'summary' ? '这段材料，你讲了什么' : '这道题，你怎么答的'}</h1>
        <div className="meta-line">
          {fmtDate(session.createdAt)} · {fmtClock(session.durationMs)} · {session.metrics.words} 词 ·{' '}
          {session.metrics.wpm} wpm
        </div>
      </div>

      {session.type === 'impromptu' ? (
        <div className="card gist-card">
          <div className="gist-head">
            <div className="card-label">你大概想说的是</div>
            <span className="gist-src">
              {session.rewriteSource === 'remote' ? '远程模型' : session.rewrite?.length ? '离线整理' : ''}
            </span>
          </div>
          {rewriteBusy ? (
            <p className="fineprint">在听你说的内容，重写一版…</p>
          ) : session.rewrite?.length ? (
            <>
              <ol className="gist-lines">
                {session.rewrite.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <p className="rewrite-stat">
                {session.rewrite.join(' ').trim().split(' ').filter(Boolean).length} 词 · 正常语速约{' '}
                {Math.round(session.rewrite.join(' ').trim().split(' ').filter(Boolean).length / 2.4)} 秒
              </p>
              {session.rewriteNotes?.length ? (
                <ul className="rewrite-notes">
                  {session.rewriteNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : null}
              <p className="fineprint">意思还是你的，只是换成能一口气说出口的说法。</p>
              <button className="btn ghost sm" onClick={() => void makeRewrite(true)} disabled={rewriteBusy}>
                {rewriteBusy ? '重写中…' : '重新写一版'}
              </button>
              {rewriteFlash ? <div className="flash-line">{rewriteFlash}</div> : null}
            </>
          ) : (
            <>
              <p className="fineprint">
                {transcriptText
                  ? '这一版没整理出来。'
                  : '这次没有转写，我不知道你说了什么。用中文写一句你想表达的意思，我把它写成口语版。'}
              </p>
              <textarea
                className="textarea"
                rows={2}
                placeholder="例：我认为这个问题被夸大了，因为大多数团队其实没有那么依赖它。"
                value={hintDraft}
                onChange={(e) => setHintDraft(e.target.value)}
              />
              <button className="btn primary sm" onClick={() => void makeRewrite(true)} disabled={rewriteBusy}>
                {rewriteBusy ? '写中…' : '让 AI 写一版'}
              </button>
              {rewriteFlash ? <div className="flash-line">{rewriteFlash}</div> : null}
            </>
          )}
        </div>
      ) : null}

      {session.type === 'summary' && material ? (
        <div className="card gist-card">
          <div className="gist-head">
            <div className="card-label">材料主旨 · 参考</div>
            <span className="gist-src">
              {session.gistSource === 'remote' ? '远程模型' : session.gist?.length ? '参考版' : ''}
            </span>
          </div>
          {gistBusy && !session.gist?.length ? (
            <p className="fineprint">正在读原文，提炼主旨…</p>
          ) : session.gist?.length ? (
            <>
              <ol className="gist-lines">
                {session.gist.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
              <p className="fineprint">
                {session.gistSource === 'remote'
                  ? '口语版：先说主旨，再补一两个细节，最后收一句。照着这个顺序说，别背句子。'
                  : '参考版：一条素材对应一段口语综述。照着逻辑说，换你自己的词。'}
              </p>
              <button className="btn ghost sm" onClick={() => void makeGist(true)} disabled={gistBusy}>
                {gistBusy ? '重新生成中…' : '重新生成'}
              </button>
              {gistFlash ? <div className="flash-line">{gistFlash}</div> : null}
            </>
          ) : (
            <button className="btn ghost sm" onClick={() => void makeGist(true)}>
              生成主旨
            </button>
          )}
        </div>
      ) : null}

      <div className="card">
        <Waveform
          peaks={session.peaks}
          durationMs={durationMs}
          currentMs={player.currentMs}
          marks={markOverlays}
          onSeek={(ms) => player.seek(ms)}
        />
        <div className="transport">
          <button className="play-btn" onClick={() => player.toggle()} aria-label="播放/暂停">
            {player.playing ? '❙❙' : '▶'}
          </button>
          <span className="mono time">
            {fmtPrecise(player.currentMs)} / {fmtPrecise(durationMs)}
          </span>
          <div className="rates">
            {[0.75, 1, 1.25].map((r) => (
              <button key={r} className={`rate ${player.rate === r ? 'is-on' : ''}`} onClick={() => player.setRate(r)}>
                {r}×
              </button>
            ))}
          </div>
        </div>
        {moments.length ? (
          <div className="moments">
            <div className="moments-head">系统猜的卡点 · 点一下听那里</div>
            <div className="moment-list">
              {moments.map((m) => (
                <button
                  key={`${m.kind}-${m.startMs}`}
                  className={`moment kind-${m.kind}`}
                  title={m.why}
                  onClick={() => {
                    player.pause()
                    player.seek(m.startMs)
                    setAtMs(m.startMs)
                    setSheetOpen(true)
                  }}
                >
                  <span className="moment-time mono">{fmtPrecise(m.startMs)}</span>
                  <span className="moment-label">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="fineprint">这些是音量、停顿、语速和改口推出来的，不一定准。点一下会跳到那里并打开打标。</p>
          </div>
        ) : null}
        <button className="btn primary wide" onClick={openSheet}>
          在这里打标 · {fmtPrecise(player.currentMs)}
        </button>
        <p className="fineprint">
          听到卡住的地方先暂停，再打标。一次标一个点。快捷键：空格播放/暂停，M 打标，← → 前后 2 秒。
        </p>
      </div>

      <div className="card">
        <div className="card-label">
          转写（{session.asrSource === 'endpoint' ? '本机转写' : '浏览器识别'}，可能有错）
        </div>
        {session.transcript.length === 0 ? (
          <>
            <p className="muted">
              {session.asrError
                ? `本机转写没成功（${session.asrError}）。录音是好的，你可以拖到任意位置打标，在弹窗里手动输入当时那句话。`
                : '这次没有拿到转写（浏览器自带的识别依赖在线服务，国内网络常连不上）。录音是好的，你可以拖动进度条到任意位置打标，在弹窗里手动输入当时那句话。'}
            </p>
            <button className="btn ghost sm" onClick={openSheet}>
              手动补一句
            </button>
          </>
        ) : (
          <div className="seg-list">
            {session.transcript.map((seg, i) => {
              const on = player.currentMs >= seg.startMs && player.currentMs <= seg.endMs
              return (
                <button
                  key={i}
                  className={`seg ${on ? 'is-on' : ''}`}
                  onClick={() => player.play(seg.startMs, seg.endMs)}
                >
                  <span className="seg-time">{fmtPrecise(seg.startMs)}</span>
                  <span className="seg-text">{seg.text}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="section-head">
        <span className="section-label">本次卡点</span>
        <span className="count">
          {sessionMarks.length} 个 · 待重录 {pending} · 已重录 {redone}
        </span>
      </div>

      {sessionMarks.length === 0 ? (
        <Empty
          title="还没有打标"
          hint="回放自己的录音，听到「这里说得不对」的瞬间，按上面的按钮。"
        />
      ) : (
        <div className="mark-list">
          {sessionMarks.map((m) => (
            <MarkCard
              key={m.id}
              mark={m}
              ai={ai}
              material={material ? { title: material.title, text: material.text } : undefined}
              sessionAudioId={session.audioId}
              onUpdate={(patch) => onUpdateMark(m.id, patch)}
            />
          ))}
        </div>
      )}

      <div className="card summary-card">
        <div className="card-label">本次小结</div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{sessionMarks.length}</div>
            <div className="stat-label">标记</div>
          </div>
          <div className="stat">
            <div className="stat-num">{redone}</div>
            <div className="stat-label">已重录</div>
          </div>
          <div className="stat">
            <div className="stat-num">{session.metrics.fillers}</div>
            <div className="stat-label">填充词</div>
          </div>
          <div className="stat">
            <div className="stat-num">{session.metrics.pauses}</div>
            <div className="stat-label">长停顿</div>
          </div>
        </div>
        {baseline ? (
          <p className="fineprint baseline-line">
            和你以往比：语速 {session.metrics.wpm} wpm（均值 {baseline.wpm}）· 长停顿{' '}
            {session.metrics.pauses}（均值 {baseline.pauses.toFixed(1)}）· 填充词{' '}
            {session.metrics.fillers}（均值 {baseline.fillers.toFixed(1)}）
          </p>
        ) : null}
        <div className="tag-legend">
          {TAGS.map((t) => (
            <span key={t.key} className="legend-item">
              <i style={{ background: t.color }} />
              {t.label}
            </span>
          ))}
        </div>
        {onRetry && session.type === 'impromptu' ? (
          <button className="btn ghost wide" onClick={onRetry}>
            同题再说一遍（带着刚才的建议）
          </button>
        ) : null}
        <button className="btn wide finish-btn" onClick={onDone}>
          {pending > 0 ? `带着 ${pending} 个卡点回去，下次再修` : '完成本次'}
        </button>
      </div>

      <TagSheet
        open={sheetOpen}
        atMs={atMs}
        heard={segmentAt(session.transcript, atMs)?.text ?? ''}
        onClose={() => setSheetOpen(false)}
        onConfirm={confirmMark}
      />
    </div>
  )
}
