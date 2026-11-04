import './env.mjs'
import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  getState,
  putState,
  readAudio,
  readToken,
  saveAudio,
  signToken,
  users,
} from './store.mjs'

const PORT = Number(process.env.PORT || 8788)
const DIST = join(process.cwd(), 'dist')
const AI_BASE = (process.env.ECHO_AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const AI_KEY = process.env.ECHO_AI_KEY || ''
const AI_MODEL = process.env.ECHO_AI_MODEL || 'deepseek-chat'
const ASR_BASE = (process.env.ECHO_ASR_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const ASR_KEY = process.env.ECHO_ASR_KEY || ''
const ASR_MODEL = process.env.ECHO_ASR_MODEL || 'whisper-1'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '60mb' }))

const aiReady = () => Boolean(AI_KEY)

function auth(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const userId = readToken(token)
  const user = userId ? users.byId(userId) : null
  if (!user) return res.status(401).json({ error: '未登录或登录已过期' })
  req.user = user
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: aiReady(), model: aiReady() ? AI_MODEL : null, asr: Boolean(ASR_KEY) })
})

app.post('/api/auth/register', (req, res) => {
  const { email = '', password = '', name = '' } = req.body || {}
  const cleanEmail = String(email).trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return res.status(400).json({ error: '邮箱格式不对' })
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' })
  if (users.byEmail(cleanEmail)) return res.status(409).json({ error: '这个邮箱已经注册过了，直接登录吧' })
  const user = users.create({ email: cleanEmail, name, password: String(password) })
  if (!user) return res.status(409).json({ error: '这个邮箱已经注册过了，直接登录吧' })
  res.json({ token: signToken(user.id), user: users.public(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {}
  const user = users.check(String(email).trim().toLowerCase(), String(password))
  if (!user) return res.status(401).json({ error: '邮箱或密码不对' })
  res.json({ token: signToken(user.id), user: users.public(user) })
})

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: users.public(req.user) })
})

app.get('/api/state', auth, (req, res) => {
  res.json({ state: getState(req.user.id) })
})

app.put('/api/state', auth, (req, res) => {
  const state = req.body?.state
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'state 缺失' })
  putState(req.user.id, state)
  res.json({ ok: true, savedAt: Date.now() })
})

app.put('/api/audio/:id', auth, (req, res) => {
  const { base64 = '', type = '' } = req.body || {}
  if (!base64) return res.status(400).json({ error: '音频为空' })
  const buf = Buffer.from(base64, 'base64')
  saveAudio(req.user.id, req.params.id, buf)
  res.json({ ok: true, id: req.params.id, bytes: buf.length, type })
})

app.get('/api/audio/:id', auth, (req, res) => {
  const buf = readAudio(req.user.id, req.params.id)
  if (!buf) return res.status(404).json({ error: '没有这段音频' })
  res.setHeader('content-type', 'audio/webm')
  res.setHeader('cache-control', 'private, max-age=86400')
  res.send(buf)
})

/** 前端把 ai.baseUrl 指到 /api/ai，因此会调到这里；服务端用环境变量里的 key，用户无需配置 */
app.post('/api/ai/chat/completions', auth, async (req, res) => {
  if (!aiReady()) {
    return res.status(503).json({ error: '服务器还没有配置 AI key（ECHO_AI_KEY）' })
  }
  const body = { ...(req.body || {}), model: AI_MODEL }
  try {
    const upstream = await fetch(`${AI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
    const text = await upstream.text()
    res.status(upstream.status).type('application/json').send(text)
  } catch (err) {
    res.status(502).json({ error: `调用模型失败：${err.message}` })
  }
})

/** ASR 透传：保留原始 multipart body 与 content-type，只替换 Authorization */
app.post(
  '/api/asr/:path(*)',
  auth,
  express.raw({ type: () => true, limit: '40mb' }),
  async (req, res) => {
    if (!ASR_KEY) return res.status(503).json({ error: '服务器还没有配置转写 key' })
    const target = `${ASR_BASE}/audio/transcriptions`
    const headers = { authorization: `Bearer ${ASR_KEY}` }
    if (req.get('content-type')) headers['content-type'] = req.get('content-type')
    try {
      const upstream = await fetch(target, {
        method: 'POST',
        headers,
        body: req.body,
        signal: AbortSignal.timeout(90_000),
      })
      const text = await upstream.text()
      res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text)
    } catch (err) {
      res.status(502).json({ error: `转写失败：${err.message}` })
    }
  },
)

if (existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(join(DIST, 'index.html'))
  })
}

app.use((_req, res) => res.status(404).json({ error: 'not found' }))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[echo] 服务已启动 http://0.0.0.0:${PORT}`)
  console.log(`[echo] AI: ${aiReady() ? `${AI_MODEL} @ ${AI_BASE}` : '未配置（只用离线建议）'}`)
  console.log(`[echo] ASR: ${ASR_KEY ? `${ASR_MODEL} @ ${ASR_BASE}` : '未配置（退回浏览器识别）'}`)
})
