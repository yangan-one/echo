import { useCallback, useEffect, useRef, useState } from 'react'
import { audioObjectUrl } from './idb'

export interface Player {
  ready: boolean
  playing: boolean
  currentMs: number
  durationMs: number
  play: (fromMs?: number, untilMs?: number) => void
  pause: () => void
  toggle: (fromMs?: number, untilMs?: number) => void
  seek: (ms: number) => void
  setRate: (r: number) => void
  rate: number
}

export function usePlayer(audioId?: string): Player {
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [rate, setRateState] = useState(1)
  const elRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const untilRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setPlaying(false)
    setCurrentMs(0)
    setDurationMs(0)
    if (!audioId) return
    audioObjectUrl(audioId).then((u) => {
      if (!cancelled) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [audioId])

  useEffect(() => {
    if (!url) return
    const el = new Audio(url)
    el.preload = 'auto'
    elRef.current = el
    const onMeta = () => setDurationMs(Number.isFinite(el.duration) ? el.duration * 1000 : 0)
    const onEnd = () => setPlaying(false)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.pause()
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      elRef.current = null
    }
  }, [url])

  const tick = useCallback(() => {
    const el = elRef.current
    if (!el) return
    const now = el.currentTime * 1000
    setCurrentMs(now)
    if (untilRef.current > 0 && now >= untilRef.current) {
      el.pause()
      untilRef.current = 0
      setPlaying(false)
      return
    }
    if (!el.paused) rafRef.current = requestAnimationFrame(tick)
  }, [])

  const play = useCallback(
    (fromMs?: number, untilMs?: number) => {
      const el = elRef.current
      if (!el) return
      if (typeof fromMs === 'number') el.currentTime = Math.max(0, fromMs / 1000)
      untilRef.current = untilMs ?? 0
      el.playbackRate = rate
      void el.play().then(() => {
        setPlaying(true)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(tick)
      })
    },
    [rate, tick],
  )

  const pause = useCallback(() => {
    elRef.current?.pause()
    setPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const seek = useCallback((ms: number) => {
    const el = elRef.current
    if (!el) return
    el.currentTime = Math.max(0, ms / 1000)
    setCurrentMs(ms)
  }, [])

  const toggle = useCallback(
    (fromMs?: number, untilMs?: number) => {
      if (playing) pause()
      else play(fromMs, untilMs)
    },
    [pause, play, playing],
  )

  const setRate = useCallback((r: number) => {
    setRateState(r)
    if (elRef.current) elRef.current.playbackRate = r
  }, [])

  return { ready: !!url, playing, currentMs, durationMs, play, pause, toggle, seek, setRate, rate }
}
