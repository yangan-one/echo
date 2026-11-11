import { useEffect, useRef, useState } from 'react'
import type { Material } from '../types'
import { useTts } from '../lib/tts'
import { Sheet } from './ui'
import { shortOf } from '../data/shorts'
import {
  clearMaterialAudio,
  loadMaterialAudioUrl,
  saveMaterialAudio,
} from '../lib/materialMedia'

export function ListenView({
  material,
  onBack,
  onStart,
  onTextSaved,
}: {
  material: Material
  onBack: () => void
  onStart: () => void
  onTextSaved?: (id: string, text: string) => void
}) {
  const tts = useTts()
  const [showText, setShowText] = useState(false)
  const [showZh, setShowZh] = useState(false)

  const [rate, setRate] = useState(1)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioFail, setAudioFail] = useState('')
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(material.seconds)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const short = shortOf(material.audioUrl)
  const [len, setLen] = useState<'short' | 'full'>(short ? 'short' : 'full')
  const useShort = len === 'short' && !!short
  const textNow = useShort && short ? short.text : material.text
  const zhNow = useShort && short ? short.textZh : material.textZh
  const secsNow = useShort && short ? Math.round(short.durationMs / 1000) : material.seconds

  const [sheetOpen, setSheetOpen] = useState(false)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [draftText, setDraftText] = useState(material.text)
  const [importing, setImporting] = useState(false)

  // 导入过的原声优先；素材自带 audioUrl 次之；都没有则用系统语音
  useEffect(() => {
    let revoked: string | null = null
    let alive = true
    if (material.audioUrl) {
      setAudioUrl(useShort && short ? short.audioUrl : material.audioUrl)
      setPos(0)
      setPlaying(false)
    } else {
      void loadMaterialAudioUrl(material.id).then((url) => {
        if (!alive) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (url) {
          revoked = url
          setAudioUrl(url)
        }
      })
    }
    return () => {
      alive = false
      tts.stop()
      audioRef.current?.pause()
      if (revoked) URL.revokeObjectURL(revoked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id, material.audioUrl, len])

  const isReal = !!audioUrl

  const handlePlay = () => {
    if (isReal) {
      const el = audioRef.current
      if (!el) return
      if (el.paused) {
        el.playbackRate = rate
        void el.play().catch(() => setAudioFail('这个音频文件浏览器打不开，试试换 mp3。'))
      } else {
        el.pause()
      }
      return
    }
    if (tts.speaking && !tts.paused) {
      tts.pause()
      return
    }
    if (tts.paused) {
      tts.resume()
      return
    }
    tts.speak(textNow, { rate, accent: material.accent })
  }

  const changeRate = (r: number) => {
    setRate(r)
    if (isReal) {
      const el = audioRef.current
      if (el) {
        el.playbackRate = r
        if (el.paused) void el.play().catch(() => undefined)
      }
      return
    }
    if (tts.speaking || tts.paused) {
      tts.speak(textNow, { rate: r, accent: material.accent })
    }
  }

  const restart = () => {
    if (isReal) {
      const el = audioRef.current
      if (el) {
        el.currentTime = 0
        el.playbackRate = rate
        void el.play().catch(() => undefined)
      }
      return
    }
    tts.speak(textNow, { rate, accent: material.accent })
  }

  const playingNow = isReal ? playing : tts.speaking && !tts.paused
  const progress = isReal ? (dur ? Math.min(1, pos / dur) : 0) : tts.progress

  const doImport = async () => {
    if (!draftFile && !draftText.trim()) return
    setImporting(true)
    try {
      if (draftFile) await saveMaterialAudio(material.id, draftFile)
      if (draftText.trim() && draftText.trim() !== material.text) {
        onTextSaved?.(material.id, draftText.trim())
      }
      const url = await loadMaterialAudioUrl(material.id)
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
      setAudioUrl(url)
      setAudioFail('')
      setSheetOpen(false)
      setDraftFile(null)
    } finally {
      setImporting(false)
    }
  }

  const removeAudio = async () => {
    await clearMaterialAudio(material.id)
    if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setPlaying(false)
    setPos(0)
    setSheetOpen(false)
  }

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">{material.category}</div>
        <h1>{material.title}</h1>
        <div className="meta-line">{material.source}</div>
        <div className="chips">
          <span className="chip">{isReal ? '真人原声' : material.accent}</span>
          <span className="chip">约 {secsNow}s</span>
          <span className="chip">音变 {material.reduction}</span>
          <span className="chip">话题 {material.familiarity}</span>
        </div>
      </div>

      <div className="card">
        {isReal ? (
          <audio
            key={audioUrl ?? 'none'}
            ref={audioRef}
            src={audioUrl ?? undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (Number.isFinite(d) && d > 0) setDur(d)
            }}
            onError={() => setAudioFail('这个音频浏览器解不开（常见于 m4a/flac）。换 mp3 再试。')}
            hidden
          />
        ) : null}

        <div className="player-line">
          <button className="play-btn" onClick={handlePlay} aria-label="播放">
            {playingNow ? '❙❙' : '▶'}
          </button>
          <div className="player-main">
            <div className="progress">
              <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="player-note">
              {audioFail
                ? audioFail
                : isReal
                  ? `真人原声${
                      material.audioUrl
                        ? useShort
                          ? ' · 30 秒短版'
                          : ' · 60 秒完整片段'
                        : ' · 你导入的音频'
                    }`
                  : tts.error
                    ? tts.error
                    : tts.supported
                      ? `系统语音（不是真人）${tts.voiceName ? ` · ${tts.voiceName}` : ''}`
                      : '当前浏览器不支持语音朗读'}
            </div>
          </div>
        </div>
        <div className="rates">
          {[0.8, 1, 1.2].map((r) => (
            <button key={r} className={`rate ${rate === r ? 'is-on' : ''}`} onClick={() => changeRate(r)}>
              {r}×
            </button>
          ))}
          <button className="rate" onClick={restart}>
            从头再听
          </button>
        </div>
        {short ? (
          <div className="len-row">
            <span className="len-label">长度</span>
            <button className={`rate ${useShort ? 'is-on' : ''}`} onClick={() => setLen('short')}>
              短版 30 秒
            </button>
            <button className={`rate ${!useShort ? 'is-on' : ''}`} onClick={() => setLen('full')}>
              完整 60 秒
            </button>
          </div>
        ) : null}
        <div className="rates" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" onClick={() => setSheetOpen(true)}>
            {isReal ? '换原声 / 换文本' : '导入真人原声'}
          </button>
        </div>
      </div>

      <div className="card">
        <button className="accordion" onClick={() => setShowText((v) => !v)}>
          <span>{showText ? '收起原文' : '看原文（建议先别急）'}</span>
          <span className="chev">{showText ? '−' : '+'}</span>
        </button>
        {showText ? <p className="material-text">{textNow}</p> : null}
        {zhNow ? (
          <>
            <button className="accordion" onClick={() => setShowZh((v) => !v)}>
              <span>{showZh ? '收起中文' : '对照中文'}</span>
              <span className="chev">{showZh ? '−' : '+'}</span>
            </button>
            {showZh ? <p className="material-text zh">{zhNow}</p> : null}
          </>
        ) : null}
      </div>

      <button className="btn primary wide sticky-cta" onClick={onStart}>
        开始英文综述 · 60 秒
      </button>
      <div className="spacer" />

      <Sheet
        open={sheetOpen}
        title="给这段配上真人原声"
        subtitle="音频只存在你这台机器的浏览器里，不会上传。"
        onClose={() => setSheetOpen(false)}
      >
        <div className="field">
          <div className="field-label">音频文件（mp3 / m4a / wav）</div>
          <input
            className="input"
            type="file"
            accept="audio/*"
            onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
          />
          {draftFile ? <p className="fineprint">已选择：{draftFile.name}</p> : null}
        </div>
        <div className="field">
          <div className="field-label">这段的文本（可换成官方字幕/转写）</div>
          <textarea
            className="textarea"
            rows={8}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <p className="fineprint">
            文本会用于「看原文」和打标时的原句定位。音频和文本对不上，AI 就找不到你说的那句。
          </p>
        </div>
        {material.sourceNote ? <p className="fineprint">去哪找：{material.sourceNote}</p> : null}
        <div className="sheet-actions">
          <button className="btn primary" onClick={() => void doImport()} disabled={importing}>
            {importing ? '保存中…' : '保存'}
          </button>
          {isReal && !material.audioUrl ? (
            <button className="btn ghost" onClick={() => void removeAudio()}>
              移除原声
            </button>
          ) : null}
        </div>
      </Sheet>
    </div>
  )
}
