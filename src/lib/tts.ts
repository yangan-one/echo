import { useCallback, useEffect, useRef, useState } from 'react'

const LANG_BY_ACCENT: Record<string, string> = {
  美音: 'en-US',
  英音: 'en-GB',
  澳音: 'en-AU',
  印音: 'en-IN',
  尼音: 'en-NG',
  其他口音: 'en-US',
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const norm = (s: string) => s.replace('_', '-').toLowerCase()
  const exact = voices.filter((v) => norm(v.lang) === lang.toLowerCase())
  const near = voices.filter((v) => norm(v.lang).startsWith(lang.slice(0, 2).toLowerCase()))
  const pool = exact.length > 0 ? exact : near
  return pool.find((v) => v.localService) ?? pool[0] ?? null
}

export interface SpeakOptions {
  rate?: number
  accent?: string
  onDone?: () => void
}

/**
 * 浏览器 TTS。V1 没有真实音频文件，听力素材靠系统语音朗读；
 * 这不是"真人语音"，但足以验证"听 → 说 → 回听打标"的整条链路。
 */
export function useTts() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [rate, setRate] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const lengthRef = useRef(1)
  const tokenRef = useRef(0)

  useEffect(() => {
    if (!supported) return
    const update = () => {
      const v = pickVoice('en-US')
      if (v) setVoiceName(v.name)
    }
    update()
    window.speechSynthesis.addEventListener?.('voiceschanged', update)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', update)
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const stop = useCallback(() => {
    tokenRef.current += 1
    if (!supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
    setSpeaking(false)
    setPaused(false)
    setProgress(0)
  }, [supported])

  const speak = useCallback(
    (text: string, opts: SpeakOptions = {}) => {
      if (!supported || !text.trim()) return
      const synth = window.speechSynthesis
      tokenRef.current += 1
      const token = tokenRef.current
      // Chrome 的已知问题：cancel() 紧接着 speak() 时，新的朗读会被安静地丢弃，
      // 表现就是"点了从头再听没反应、图标也不变"。先停、resume 解开暂停态，
      // 再等一拍真正开始。
      try {
        synth.cancel()
      } catch {
        /* ignore */
      }
      try {
        synth.resume()
      } catch {
        /* ignore */
      }
      const utter = new SpeechSynthesisUtterance(text)
      const lang = LANG_BY_ACCENT[opts.accent ?? '美音'] ?? 'en-US'
      utter.lang = lang
      utter.rate = opts.rate ?? rate
      utter.pitch = 1
      const voice = pickVoice(lang)
      if (voice) {
        utter.voice = voice
        setVoiceName(voice.name)
      }
      lengthRef.current = Math.max(1, text.length)
      utter.onstart = () => {
        if (tokenRef.current !== token) return
        startedRef.current = true
        setSpeaking(true)
        setPaused(false)
      }
      utter.onboundary = (e) => {
        if (tokenRef.current !== token) return
        setProgress(Math.min(0.99, e.charIndex / lengthRef.current))
      }
      utter.onend = () => {
        if (tokenRef.current !== token) return
        setSpeaking(false)
        setPaused(false)
        setProgress(1)
        opts.onDone?.()
      }
      utter.onerror = () => {
        if (tokenRef.current !== token) return
        setSpeaking(false)
        setPaused(false)
      }
      setSpeaking(true)
      setPaused(false)
      setProgress(0)
      setError(null)
      const startedRef = { current: false }
      const probe = window.setTimeout(() => {
        if (tokenRef.current !== token) return
        if (!startedRef.current && !synth.speaking) {
          setSpeaking(false)
          setError(
            window.speechSynthesis.getVoices().length === 0
              ? '这个浏览器没有可用的语音包，朗读不会出声。换 Edge 或 Chrome 试试。'
              : '语音合成没有启动。再点一次播放，或换 Edge / Chrome。',
          )
        }
      }, 1600)
      window.setTimeout(() => {
        if (tokenRef.current !== token) return
        try {
          synth.speak(utter)
        } catch {
          setSpeaking(false)
        }
        window.setTimeout(() => window.clearTimeout(probe), 2000)
      }, 90)
    },
    [rate, supported],
  )

  const pause = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.pause()
    setPaused(true)
  }, [supported])

  const resume = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.resume()
    setPaused(false)
  }, [supported])

  return {
    supported,
    speaking,
    paused,
    progress,
    voiceName,
    rate,
    error,
    setRate,
    speak,
    stop,
    pause,
    resume,
  }
}
