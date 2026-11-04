import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranscriptSeg } from '../types'

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m))
}

export interface CaptureResult {
  blob: Blob
  durationMs: number
  peaks: number[]
  segments: TranscriptSeg[]
  asrSupported: boolean
}

export interface StartOptions {
  /** 到点自动停止并回调 */
  maxMs?: number
  /** 是否同时开启浏览器语音识别（默认开启） */
  asr?: boolean
  onLimit?: (r: CaptureResult) => void
}

/**
 * 麦克风采集：MediaRecorder 录音 + 实时音量峰值（画波形）+ Web Speech 转写。
 *
 * 波形来自录音过程中的实时采样，而不是事后解码音频 —— 这样无论是
 * webm/opus 还是 mp4，都能稳定画出真实波形，不依赖解码器。
 */
export function useVoiceCapture() {
  const [recording, setRecording] = useState(false)
  const [warming, setWarming] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [level, setLevel] = useState(0)
  const [segments, setSegments] = useState<TranscriptSeg[]>([])
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const peaksRef = useRef<number[]>([])
  const startedRef = useRef(0)
  const tickRef = useRef<number | undefined>(undefined)
  const ctxRef = useRef<AudioContext | null>(null)
  const asrRef = useRef<any>(null)
  const segsRef = useRef<TranscriptSeg[]>([])
  const lastEndRef = useRef(0)
  const maxRef = useRef(0)
  const stoppingRef = useRef(false)
  const wantsAsrRef = useRef(true)
  const restartRef = useRef(0)
  const asrTimerRef = useRef<number | undefined>(undefined)
  const onLimitRef = useRef<((r: CaptureResult) => void) | undefined>(undefined)

  const cleanup = useCallback(() => {
    window.clearInterval(tickRef.current)
    tickRef.current = undefined
    window.clearTimeout(asrTimerRef.current)
    asrTimerRef.current = undefined
    try {
      asrRef.current?.stop?.()
    } catch {
      /* ignore */
    }
    asrRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    ctxRef.current?.close().catch(() => undefined)
    ctxRef.current = null
    recRef.current = null
    setLevel(0)
    setWarming(false)
  }, [])

  const stop = useCallback((): Promise<CaptureResult> => {
    return new Promise((resolve) => {
      stoppingRef.current = true
      const durationMs = startedRef.current ? Date.now() - startedRef.current : 0
      const rec = recRef.current

      const hadAsr = !!asrRef.current
      const finish = () => {
        const type = rec?.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const result: CaptureResult = {
          blob,
          durationMs,
          peaks: peaksRef.current.slice(),
          segments: segsRef.current.slice(),
          asrSupported: hadAsr,
        }
        cleanup()
        setRecording(false)
        setInterim('')
        setElapsedMs(0)
        resolve(result)
      }

      if (!rec || rec.state === 'inactive') {
        finish()
        return
      }
      rec.onstop = finish
      try {
        rec.requestData()
      } catch {
        /* ignore */
      }
      try {
        rec.stop()
      } catch {
        finish()
      }
    })
  }, [cleanup])

  const start = useCallback(
    async (opts: StartOptions = {}) => {
      setError(null)
      setSegments([])
      setInterim('')
      setElapsedMs(0)
      chunksRef.current = []
      peaksRef.current = []
      segsRef.current = []
      lastEndRef.current = 0
      restartRef.current = 0
      stoppingRef.current = false
      wantsAsrRef.current = opts.asr !== false
      maxRef.current = opts.maxMs ?? 0
      onLimitRef.current = opts.onLimit

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('当前浏览器不支持麦克风采集，请使用 Chrome / Edge 桌面版。')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (err: any) {
        const name = err?.name ?? ''
        setError(
          name === 'NotAllowedError'
            ? '麦克风权限被拒绝。请在地址栏左侧的权限设置里允许麦克风，然后重试。'
            : '无法打开麦克风，请检查是否有其他程序占用。',
        )
        return
      }

      streamRef.current = stream
      stream.getAudioTracks().forEach((t) => (t.enabled = true))
      setWarming(true)

      // 先把采集链路和音频上下文跑起来，再开录音。
      // Chrome 里设备刚打开时 MediaRecorder 前 1–2 秒经常是空的（用户实测过），
      // 这段预热能显著减少「开头没声」。
      let analyser: AnalyserNode | null = null
      let buf: Float32Array<ArrayBuffer> | null = null
      try {
        const ctx = new AudioContext()
        await ctx.resume().catch(() => undefined)
        const src = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        src.connect(analyser)
        buf = new Float32Array(analyser.fftSize)
        ctxRef.current = ctx
      } catch {
        /* 没有 AudioContext 也能录音，只是没有波形 */
      }
      // 等「真的收到声音」再开录：固定等待 1.2 秒在慢设备上仍会吞开头。
      // 这里用包络做门控——检测到连续两次有信号（最多等 2.2 秒）才 start。
      const waitForSignal = async () => {
        const t0 = Date.now()
        if (!analyser || !buf) {
          await new Promise((r) => window.setTimeout(r, 900))
          return
        }
        const an = analyser
        const b = buf
        let hits = 0
        while (Date.now() - t0 < 2200) {
          an.getFloatTimeDomainData(b)
          let sum = 0
          for (let i = 0; i < b.length; i += 1) sum += b[i] * b[i]
          const rms = Math.sqrt(sum / b.length)
          hits = rms > 0.015 ? hits + 1 : 0
          if (hits >= 2) return
          await new Promise((r) => window.setTimeout(r, 55))
        }
        // 一直很安静：再多等 250ms 让设备彻底就绪，不让用户白等
        await new Promise((r) => window.setTimeout(r, 250))
      }
      await waitForSignal()
      setWarming(false)

      const mime = pickMime()
      let rec: MediaRecorder
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      } catch {
        setError('当前浏览器无法录制音频（MediaRecorder 不可用）。')
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start(200)
      recRef.current = rec
      startedRef.current = Date.now()
      setRecording(true)

      // 音量 → 峰值
      if (analyser && buf) {
        const an = analyser
        const b = buf
        tickRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startedRef.current
          setElapsedMs(elapsed)
          an.getFloatTimeDomainData(b)
          let sum = 0
          for (let i = 0; i < b.length; i += 1) sum += b[i] * b[i]
          const rms = Math.sqrt(sum / b.length)
          const p = Math.min(1, rms * 4.5)
          peaksRef.current.push(p)
          setLevel(p)
          if (maxRef.current > 0 && elapsed >= maxRef.current) {
            const cb = onLimitRef.current
            void stop().then((r) => cb?.(r))
          }
        }, 55)
      }

      // 实时转写
      const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      if (wantsAsrRef.current && SR) {
        const r = new SR()
        r.lang = 'en-US'
        r.continuous = true
        r.interimResults = true
        r.maxAlternatives = 1
        r.onresult = (ev: any) => {
          let pending = ''
          for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
            const res = ev.results[i]
            const text = String(res[0]?.transcript ?? '').trim()
            if (res.isFinal) {
              if (!text) continue
              const now = Date.now() - startedRef.current
              const startAt = Math.max(lastEndRef.current, Math.min(now - 400, now - 3500))
              const seg: TranscriptSeg = { text, startMs: startAt, endMs: now }
              segsRef.current = [...segsRef.current, seg]
              lastEndRef.current = now
              setSegments(segsRef.current)
            } else {
              pending += text
            }
          }
          setInterim(pending)
        }
        r.onerror = (ev: any) => {
          const kind = ev?.error ?? ''
          if (kind === 'not-allowed' || kind === 'service-not-allowed') {
            wantsAsrRef.current = false
            setError('浏览器拒绝了语音识别权限：录音仍然有效，但不会自动转写，可手动补一句。')
          } else if (kind === 'network') {
            wantsAsrRef.current = false
            setError(
              '语音识别连不上服务器（浏览器自带的识别依赖在线服务，国内网络常不可用）。录音不受影响，打完标后手动输入那句话即可。',
            )
          }
        }
        r.onend = () => {
          if (stoppingRef.current) return
          if (wantsAsrRef.current && recRef.current?.state === 'recording' && restartRef.current < 40) {
            restartRef.current += 1
            try {
              r.start()
            } catch {
              /* ignore */
            }
          }
        }
        asrRef.current = r
        // 语音识别会抢占麦克风，和 MediaRecorder 同时启动时开头一段容易丢，
        // 所以延后 600ms 再开；这段时间的录音仍然完整。
        asrTimerRef.current = window.setTimeout(() => {
          if (stoppingRef.current || recRef.current?.state !== 'recording') return
          try {
            r.start()
          } catch {
            /* ignore */
          }
        }, 600)
      }
    },
    [stop],
  )

  useEffect(() => () => cleanup(), [cleanup])

  return {
    recording,
    warming,
    elapsedMs,
    level,
    segments,
    interim,
    error,
    asrSupported: typeof window !== 'undefined' && !!((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition),
    start,
    stop,
  }
}
