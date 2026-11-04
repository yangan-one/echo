import { useState } from 'react'

export function LoginScreen({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState('')

  return (
    <div className="login">
      <div className="login-inner">
        <div className="brand">回响 Echo</div>
        <h1 className="login-title">
          不教新词，
          <br />
          只修你已有的漏洞。
        </h1>
        <p className="login-lede">
          把你口语里卡住的那 3 秒找出来，改成下次真能说出口的样子。
        </p>

        <label className="field">
          <span className="field-label">怎么称呼你</span>
          <input
            className="input"
            value={name}
            placeholder="名字或昵称"
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEnter(name.trim() || '同学')
            }}
          />
        </label>

        <button className="btn primary wide" onClick={() => onEnter(name.trim() || '同学')}>
          开始
        </button>

        <p className="fineprint">
          V1 是单机版：不注册、不上传。录音和建议都留在这台设备的浏览器里。麦克风与语音识别需要你授权。
        </p>
      </div>
    </div>
  )
}
