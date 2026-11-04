import { useState } from 'react'
import { api } from '../lib/api'

type Mode = 'login' | 'register'

export function AuthScreen({ onAuthed }: { onAuthed: (user: { id: string; email: string; name: string }) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const inWechat = /MicroMessenger/i.test(navigator.userAgent)
  const [error, setError] = useState('')

  const submit = async () => {
    if (busy) return
    setError('')
    if (!email.trim() || !password) {
      setError('邮箱和密码都要填')
      return
    }
    setBusy(true)
    try {
      const user =
        mode === 'register'
          ? await api.register(email.trim(), password, name.trim() || '同学')
          : await api.login(email.trim(), password)
      onAuthed(user)
    } catch (err: any) {
      setError(err?.message || '网络不太顺，再试一次')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-inner">
        <div className="brand">回响 Echo</div>
        <h1 className="login-title">
          不教新词，
          <br />
          只修你已有的漏洞。
        </h1>
        <p className="login-lede">听完一段真人材料，用自己的英文讲 60 秒，再回听标出卡住的那几秒。</p>

        {inWechat ? (
          <p className="warn">
            你在微信里打开。微信内置浏览器常常禁用麦克风，录音会失败——请点右上角「…」，选「在浏览器打开」。
          </p>
        ) : null}
        <div className="login-card">
          <div className="seg-control auth-tabs">
            <button className={`seg-btn ${mode === 'login' ? 'is-on' : ''}`} onClick={() => setMode('login')}>
              登录
            </button>
            <button className={`seg-btn ${mode === 'register' ? 'is-on' : ''}`} onClick={() => setMode('register')}>
              注册
            </button>
          </div>

          <label className="field">
            <span className="field-label">邮箱</span>
            <input
              className="input"
              type="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode === 'register' ? (
            <label className="field">
              <span className="field-label">怎么称呼你（可空）</span>
              <input
                className="input"
                value={name}
                placeholder="名字或昵称"
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : null}

          <label className="field">
            <span className="field-label">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              placeholder={mode === 'register' ? '至少 6 位' : '你的密码'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
            />
          </label>

          {error ? <p className="warn">{error}</p> : null}

          <button className="btn primary wide" onClick={() => void submit()} disabled={busy}>
            {busy ? '等一下…' : mode === 'register' ? '注册并开始' : '登录'}
          </button>
        </div>

        <p className="fineprint login-note">
          账号用来把你的训练记录存到服务器，换设备也能看到。录音只在需要时上传，仍会先存在你的浏览器里。
        </p>
      </div>
    </div>
  )
}
