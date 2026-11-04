import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DATA_DIR = process.env.ECHO_DATA_DIR || join(process.cwd(), 'data')
const DB_FILE = join(DATA_DIR, 'db.json')
const AUDIO_DIR = join(DATA_DIR, 'audio')

mkdirSync(AUDIO_DIR, { recursive: true })

const empty = () => ({ users: [], states: {}, createdAt: Date.now() })

let db = empty()
try {
  if (existsSync(DB_FILE)) db = JSON.parse(readFileSync(DB_FILE, 'utf8'))
} catch (err) {
  console.error('[store] 读取 db.json 失败，使用空库：', err.message)
}

let dirty = false
function persist() {
  if (!dirty) return
  mkdirSync(dirname(DB_FILE), { recursive: true })
  const tmp = DB_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(db))
  renameSync(tmp, DB_FILE)
  dirty = false
}
setInterval(persist, 1500).unref?.()
process.on('SIGTERM', () => { dirty = true; persist() })
process.on('SIGINT', () => { dirty = true; persist() })

export const uid = (p = '') => p + randomBytes(9).toString('hex')

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, hash) {
  const a = scryptSync(password, salt, 64)
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

const SECRET = process.env.ECHO_SECRET || 'dev-secret-change-me'

export function signToken(userId, days = 30) {
  const exp = Date.now() + days * 864e5
  const payload = Buffer.from(JSON.stringify({ u: userId, e: exp })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function readToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const want = createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig !== want) return null
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!u || !e || Date.now() > e) return null
    return u
  } catch {
    return null
  }
}

export const users = {
  byEmail: (email) => db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()),
  byId: (id) => db.users.find((u) => u.id === id),
  create({ email, name, password }) {
    const existing = this.byEmail(email)
    if (existing) return null
    const { salt, hash } = hashPassword(password)
    const user = { id: uid('u_'), email: email.trim(), name: name.trim() || email.split('@')[0], salt, hash, createdAt: Date.now() }
    db.users.push(user)
    dirty = true
    return user
  },
  check(email, password) {
    const user = this.byEmail(email)
    if (!user) return null
    return verifyPassword(password, user.salt, user.hash) ? user : null
  },
  public: (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt }),
}

export function getState(userId) {
  return db.states[userId] || null
}

export function putState(userId, state) {
  db.states[userId] = state
  dirty = true
}

export function audioPath(userId, audioId) {
  const safeUser = String(userId).replace(/[^a-zA-Z0-9_-]/g, '')
  const safeId = String(audioId).replace(/[^a-zA-Z0-9_-]/g, '')
  return join(AUDIO_DIR, safeUser, safeId + '.bin')
}

export function saveAudio(userId, audioId, buffer) {
  const p = audioPath(userId, audioId)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, buffer)
  return p
}

export function readAudio(userId, audioId) {
  const p = audioPath(userId, audioId)
  return existsSync(p) ? readFileSync(p) : null
}

export function flush() {
  dirty = true
  persist()
}
