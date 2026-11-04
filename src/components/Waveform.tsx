import { useEffect, useRef } from 'react'

export interface WaveMark {
  startMs: number
  endMs: number
  color: string
}

interface Props {
  peaks?: number[]
  durationMs: number
  currentMs: number
  marks?: WaveMark[]
  height?: number
  onSeek?: (ms: number) => void
  color?: string
  dimColor?: string
}

export function Waveform({
  peaks,
  durationMs,
  currentMs,
  marks = [],
  height = 96,
  onSeek,
  color = '#c2410c',
  dimColor = '#ded9d3',
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = height
      if (w === 0) return
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const total = Math.max(durationMs, 1)
      const barW = 3
      const gap = 2
      const count = Math.max(1, Math.floor(w / (barW + gap)))
      const mid = h / 2
      const maxAmp = h * 0.42

      const sample = (i: number): number => {
        if (!peaks || peaks.length === 0) {
          // 没有包络数据时画一条示意线，而不是假装有波形
          return 0.06
        }
        const from = Math.floor((i / count) * peaks.length)
        const to = Math.max(from + 1, Math.floor(((i + 1) / count) * peaks.length))
        let m = 0
        for (let j = from; j < to && j < peaks.length; j += 1) m = Math.max(m, peaks[j])
        return m
      }

      // 标记区间底色
      for (const mk of marks) {
        const x1 = (mk.startMs / total) * w
        const x2 = (mk.endMs / total) * w
        ctx.fillStyle = `${mk.color}1f`
        ctx.fillRect(x1, 0, Math.max(2, x2 - x1), h)
        ctx.fillStyle = mk.color
        ctx.fillRect(x1, 0, 2, h)
      }

      const playedX = (Math.min(currentMs, total) / total) * w

      for (let i = 0; i < count; i += 1) {
        const amp = Math.max(0.02, sample(i)) * maxAmp
        const x = i * (barW + gap) + gap / 2
        const played = x < playedX
        ctx.fillStyle = played ? color : dimColor
        const r = barW / 2
        const y = mid - amp
        const hh = amp * 2
        ctx.beginPath()
        ctx.roundRect(x, y, barW, hh, r)
        ctx.fill()
      }

      // 播放头
      ctx.fillStyle = '#292524'
      ctx.fillRect(playedX, 0, 1.5, h)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [peaks, durationMs, currentMs, marks, height, color, dimColor])

  const seekFromEvent = (clientX: number) => {
    const wrap = wrapRef.current
    if (!wrap || !onSeek) return
    const rect = wrap.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    onSeek(ratio * durationMs)
  }

  return (
    <div
      ref={wrapRef}
      className={`waveform ${onSeek ? 'is-seekable' : ''}`}
      style={{ height }}
      onPointerDown={(e) => {
        if (!onSeek) return
        draggingRef.current = true
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        seekFromEvent(e.clientX)
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) seekFromEvent(e.clientX)
      }}
      onPointerUp={() => {
        draggingRef.current = false
      }}
      onPointerCancel={() => {
        draggingRef.current = false
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
