import { useEffect, useRef, useState } from 'react'
import type { AiConfig, AppState, Mark, Session } from './types'
import { api, tokenStore, type ServerUser } from './lib/api'
import { resolveAi } from './lib/aiConfig'
import { getMaterial } from './lib/materialMedia'
import type { TopicItem } from './data/topics'
import type { CaptureResult } from './lib/capture'
import { computeMetrics } from './lib/metrics'
import { transcribeWithEndpoint } from './lib/asr'
import { clearState, emptyState, loadState, saveState, uid } from './lib/storage'
import { clearAudio, putAudio } from './lib/idb'
import { Home } from './components/Home'
import { Library } from './components/Library'
import { ListenView } from './components/ListenView'
import { RecordView } from './components/RecordView'
import { ReviewView } from './components/ReviewView'
import { TopicView } from './components/TopicView'
import { MarksView } from './components/MarksView'
import { ProgressView } from './components/ProgressView'
import { SettingsView } from './components/SettingsView'
import { AuthScreen } from './components/AuthScreen'
import { Empty } from './components/ui'

/** 登录后统一使用服务器代理：客户端不再持有任何 key */
function serverAi(): AiConfig {
  return {
    mode: 'remote',
    baseUrl: '/api/ai',
    apiKey: 'server',
    model: 'server',
    asrUrl: '/api/asr/v1/audio/transcriptions',
    asrModel: 'whisper-1',
    asrToken: 'server',
  }
}

type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'listen'; materialId: string; from?: 'home' | 'library' }
  | { name: 'summary'; materialId: string }
  | { name: 'topic' }
  | { name: 'impromptu'; version: number; parentId?: string }
  | { name: 'review'; sessionId: string }
  | { name: 'marks' }
  | { name: 'progress' }
  | { name: 'settings' }

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [auth, setAuth] = useState<'loading' | 'anon' | 'user'>('loading')
  const [serverUser, setServerUser] = useState<ServerUser | null>(null)
  const [route, setRoute] = useState<Route>({ name: 'home' })
  // 用户改过素材文本后，靠这个计数器触发重渲染（文本存在 localStorage，不在 state 里）
  const [, setTextTick] = useState(0)
  const [activeTopic, setActiveTopic] = useState<TopicItem | null>(null)
  const syncTimer = useRef<number | undefined>(undefined)
  const aiCfg = resolveAi(state.ai)

  const hydrate = async (user: ServerUser) => {
    setServerUser(user)
    // 自己的 key 只存在本机：账号切换/刷新时保留，不随服务器状态覆盖
    const localAi = loadState().ai
    const ai: AiConfig = {
      ...serverAi(),
      ownKey: localAi?.ownKey,
      ownBaseUrl: localAi?.ownBaseUrl,
      ownModel: localAi?.ownModel,
    }
    let remote: any = null
    try {
      remote = (await api.getState()).state
    } catch {
      /* 网络不通时先用本地缓存 */
    }
    // 兼容旧数据：曾经把内部 id 存进 user 字段
    const looksLikeId = (v?: string) => !!v && (/^[a-f0-9]{12,}$/i.test(v) || /^u_/.test(v))
    const displayName = looksLikeId(remote?.user) ? user.name : remote?.user || user.name
    if (remote && Array.isArray(remote.sessions)) {
      const next: AppState = { ...remote, user: displayName, ai }
      setState(next)
      saveState(next)
    } else {
      const next: AppState = { ...emptyState(), user: user.name, ai }
      setState(next)
      saveState(next)
    }
    setAuth('user')
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!tokenStore.get()) {
        setAuth('anon')
        return
      }
      try {
        const { user } = await api.me()
        if (alive) await hydrate(user)
      } catch {
        tokenStore.clear()
        if (alive) setAuth('anon')
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 本地立即落盘，同时把这份状态同步到账号（去掉 ai 配置，服务器自己决定用哪个模型）
  useEffect(() => {
    saveState(state)
    if (auth !== 'user') return
    window.clearTimeout(syncTimer.current)
    syncTimer.current = window.setTimeout(() => {
      const { ai: _ai, ...rest } = state as any
      api.putState(rest).catch(() => {})
    }, 1200)
    return () => window.clearTimeout(syncTimer.current)
  }, [state, auth])

  const addMark = (mark: Mark) => {
    setState((s) => ({ ...s, marks: [...s.marks, mark] }))
  }

  const updateMark = (id: string, patch: Partial<Mark>) => {
    setState((s) => ({ ...s, marks: s.marks.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
  }

  const updateSession = (id: string, patch: Partial<Session>) => {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
  }

  const persistSession = async (
    result: CaptureResult,
    meta: Omit<Session, 'id' | 'createdAt' | 'durationMs' | 'audioId' | 'peaks' | 'transcript' | 'metrics'>,
  ) => {
    const id = uid('ss')
    const audioId = uid('au')
    try {
      await putAudio(audioId, result.blob)
    } catch {
      /* 音频存不进去也允许继续：转写与文字仍在 */
    }

    // 浏览器识别为空时，如果配了本机转写服务，就补一次词级/句级转写
    let segments = result.segments
    let asrSource: Session['asrSource'] = segments.length ? 'browser' : undefined
    let asrError: string | undefined
    if (!segments.length && state.ai.asrUrl) {
      try {
        const got = await transcribeWithEndpoint(result.blob, {
          url: state.ai.asrUrl,
          model: state.ai.asrModel,
          token: state.ai.asrToken,
        })
        if (got.length) {
          segments = got
          asrSource = 'endpoint'
        }
      } catch (err: any) {
        asrError = err?.name === 'AbortError' ? '本机转写超时' : err?.message ?? '本机转写失败'
      }
    }

    const session: Session = {
      ...meta,
      id,
      createdAt: Date.now(),
      durationMs: result.durationMs,
      audioId,
      peaks: result.peaks,
      transcript: segments,
      asrSource,
      asrError,
      metrics: computeMetrics(segments, result.durationMs),
    }
    setState((s) => ({ ...s, sessions: [...s.sessions, session] }))
    setRoute({ name: 'review', sessionId: id })
  }

  const handleSummaryFinish = async (materialId: string, result: CaptureResult) => {
    await persistSession(result, { type: 'summary', materialId, version: 1 })
  }

  const handleImpromptuFinish = async (version: number, parentId: string | undefined, result: CaptureResult) => {
    await persistSession(result, { type: 'impromptu', topic: activeTopic?.title, version, parentId })
  }

  const clearAll = async () => {
    try {
      await clearAudio()
    } catch {
      /* ignore */
    }
    const fresh: AppState = { ...emptyState(), user: state.user, ai: serverAi() }
    setState(fresh)
    api.putState(fresh).catch(() => {})
    setRoute({ name: 'home' })
  }

  const logout = async () => {
    api.putState({ ...state, ai: undefined }).catch(() => {})
    tokenStore.clear()
    setServerUser(null)
    try {
      await clearAudio()
    } catch {
      /* ignore */
    }
    clearState()
    setState({ ...emptyState(), ai: serverAi() })
    setRoute({ name: 'home' })
    setAuth('anon')
  }

  if (auth === 'loading') {
    return (
      <div className="login">
        <div className="login-inner">
          <div className="brand">回响 Echo</div>
          <p className="fineprint">正在载入你的记录…</p>
        </div>
      </div>
    )
  }

  if (auth === 'anon') {
    return <AuthScreen onAuthed={(u) => void hydrate(u as ServerUser)} />
  }

  if (route.name === 'library') {
    return <Library onBack={() => setRoute({ name: 'home' })} onListen={(id) => setRoute({ name: 'listen', materialId: id, from: 'library' })} />
  }

  if (route.name === 'listen') {
    const material = getMaterial(route.materialId)
    if (!material) return <Empty title="找不到这条素材" hint="它可能被删掉了。" />
    return (
      <ListenView
        material={material}
        onBack={() => setRoute(route.from === 'library' ? { name: 'library' } : { name: 'home' })}
        onStart={() => setRoute({ name: 'summary', materialId: material.id })}
        onTextSaved={() => setTextTick((n) => n + 1)}
      />
    )
  }

  if (route.name === 'summary') {
    const material = getMaterial(route.materialId)
    if (!material) return <Empty title="找不到这条素材" hint="它可能被删掉了。" />
    return (
      <RecordView
        kicker={`听力综述 · ${material.title}`}
        title="用自己的英文讲一遍"
        prompt="不要背原文。讲清讲了什么、一两个细节、你怎么看。忘了就绕过去。"
        limitMs={60000}
        onBack={() => setRoute({ name: 'listen', materialId: material.id })}
        onFinish={(r) => void handleSummaryFinish(material.id, r)}
      />
    )
  }

  if (route.name === 'topic') {
    return (
      <TopicView
        onBack={() => setRoute({ name: 'home' })}
        onStart={(topic) => {
          setActiveTopic(topic)
          setRoute({ name: 'impromptu', version: 1 })
        }}
      />
    )
  }

  if (route.name === 'impromptu') {
    const topic = activeTopic
    return (
      <RecordView
        kicker="即兴开口 · 60 秒"
        title={topic?.title ?? '随便说点什么'}
        prompt={
          topic
            ? `切入：${topic.angle}。没有准备时间，看到题就开口。`
            : '没有准备时间，看到题就开口。'
        }
        limitMs={60000}
        onBack={() => setRoute({ name: 'topic' })}
        onFinish={(r) => void handleImpromptuFinish(route.version, route.parentId, r)}
      />
    )
  }

  if (route.name === 'review') {
    const session = state.sessions.find((s) => s.id === route.sessionId)
    if (!session) return <Empty title="找不到这次记录" hint="返回首页重新开始。" />
    return (
      <ReviewView
        session={session}
        marks={state.marks}
        ai={aiCfg}
        sessions={state.sessions}
        onAddMark={addMark}
        onUpdateMark={updateMark}
        onUpdateSession={updateSession}
        onDone={() => setRoute({ name: 'home' })}
        onRetry={
          session.type === 'impromptu' && (session.topic || activeTopic)
            ? () => {
                const tp: TopicItem = session.topic
                  ? {
                      title: session.topic,
                      kind: '观点',
                      level: 2,
                      angle: '还是刚才那道题。这次只说清一件事：上次你卡住的那句，换个说法说出来',
                    }
                  : (activeTopic as TopicItem)
                setActiveTopic(tp)
                setRoute({
                  name: 'impromptu',
                  version: session.version + 1,
                  parentId: session.id,
                })
              }
            : undefined
        }
      />
    )
  }

  if (route.name === 'marks') {
    return (
      <MarksView state={state} ai={aiCfg} onUpdateMark={updateMark} onBack={() => setRoute({ name: 'home' })} />
    )
  }

  if (route.name === 'progress') {
    return (
      <ProgressView
        state={state}
        onBack={() => setRoute({ name: 'home' })}
        onOpenSession={(id) => setRoute({ name: 'review', sessionId: id })}
      />
    )
  }

  if (route.name === 'settings') {
    return (
      <SettingsView
        state={state}
        email={serverUser?.email}
        onBack={() => setRoute({ name: 'home' })}
        onSave={(patch) => setState((s) => ({ ...s, ...patch }))}
        onClearAll={() => void clearAll()}
        onRestore={(next) => setState(next)}
        onLogout={() => void logout()}
      />
    )
  }

  return (
    <Home
      state={state}
      onListen={(id) => setRoute({ name: 'listen', materialId: id, from: 'home' })}
      onLibrary={() => setRoute({ name: 'library' })}
      onImpromptu={() => setRoute({ name: 'topic' })}
      onMarks={() => setRoute({ name: 'marks' })}
      onProgress={() => setRoute({ name: 'progress' })}
      onSettings={() => setRoute({ name: 'settings' })}
    />
  )
}
