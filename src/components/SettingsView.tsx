import { useEffect, useRef, useState } from 'react'
import type { AiConfig, AppState } from '../types'
import { usingOwnKey } from '../lib/aiConfig'
import { api } from '../lib/api'
import { downloadPack, parsePack, restorePack } from '../lib/pack'

export function SettingsView({
  state,
  email,
  onSave,
  onBack,
  onClearAll,
  onRestore,
  onLogout,
}: {
  state: AppState
  email?: string
  onSave: (patch: Partial<AppState>) => void
  onBack: () => void
  onClearAll: () => void
  onRestore: (state: AppState) => void
  onLogout: () => void
}) {
  const [name, setName] = useState(state.user)
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [health, setHealth] = useState<{ ai: boolean; model: string | null; asr: boolean } | null>(null)
  const [packMsg, setPackMsg] = useState('')
  const [ai, setAi] = useState<AiConfig>({ ...state.ai })
  const [ownMsg, setOwnMsg] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    api
      .health()
      .then((h) => setHealth({ ai: h.ai, model: h.model, asr: h.asr }))
      .catch(() => setHealth({ ai: false, model: null, asr: false }))
  }, [])

  const save = () => {
    onSave({ user: name.trim() || state.user })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const exportPack = async () => {
    try {
      setPackMsg('正在打包录音…')
      const info = await downloadPack(state)
      setPackMsg(`已下载整包（${info}）。换电脑时用「导入整包」还原。`)
    } catch (err: any) {
      setPackMsg('打包失败：' + (err?.message ?? '未知错误'))
    }
  }

  const importPack = async (file: File) => {
    try {
      setPackMsg('正在读取…')
      const pack = parsePack(await file.text())
      const n = await restorePack(pack)
      onRestore(pack.state)
      setPackMsg(`已还原 ${pack.state.sessions.length} 次训练、${pack.state.marks.length} 个卡点、${n} 段音频。`)
    } catch (err: any) {
      setPackMsg('导入失败：' + (err?.message ?? '未知错误'))
    }
  }

  return (
    <div className="view">
      <div className="view-head">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <div className="kicker">设置</div>
        <h1>你的账号，和数据</h1>
      </div>

      <div className="card">
        <div className="card-label">账号</div>
        <div className="field">
          <span className="field-label">登录邮箱</span>
          <div className="account-email">{email || '—'}</div>
        </div>
        <label className="field">
          <span className="field-label">显示名</span>
          <input className="input" value={name} placeholder="名字或昵称" onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="fineprint">训练记录跟着账号走，换设备登录就能看到同一份数据。</p>
        <button className="btn primary sm" onClick={save}>
          {saved ? '已保存' : '保存名字'}
        </button>
      </div>

      <div className="card">
        <div className="card-label">AI 建议由服务器提供</div>
        <p className="fineprint">
          你不需要填任何 API Key。建议请求发到本站服务器，由服务器统一调用模型；调用失败时会自动退回内置的离线库。
        </p>
        <p className="fineprint">
          当前状态：
          {health === null ? '检查中…' : health.ai ? `已连接（${health.model || '模型'}）` : '服务器未配置模型，正在用离线建议'}
          {health?.asr ? ' · 转写也由服务器提供' : ' · 转写用浏览器识别'}
        </p>
      </div>

      <div className="card">
        <div className="card-label">用我自己的 key（可选）</div>
        <p className="fineprint">
          不填就用站点提供的额度，开箱即用。填了这里，建议请求会由你的浏览器直接发给服务商，不消耗站点额度。
          key 只存在这台浏览器里，不会上传到服务器。
        </p>
        <label className="field">
          <span className="field-label">API Key（留空 = 用站点额度）</span>
          <input
            className="input"
            type="password"
            value={ai.ownKey ?? ''}
            placeholder="sk-…"
            onChange={(e) => setAi({ ...ai, ownKey: e.target.value })}
          />
        </label>
        <div className="row-2">
          <label className="field">
            <span className="field-label">Base URL</span>
            <input
              className="input"
              value={ai.ownBaseUrl ?? ''}
              placeholder="https://api.deepseek.com/v1"
              onChange={(e) => setAi({ ...ai, ownBaseUrl: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">模型</span>
            <input
              className="input"
              value={ai.ownModel ?? ''}
              placeholder="deepseek-chat"
              onChange={(e) => setAi({ ...ai, ownModel: e.target.value })}
            />
          </label>
        </div>
        <button
          className="btn ghost sm"
          onClick={() => {
            onSave({ ai })
            setOwnMsg(usingOwnKey(ai) ? '已保存：之后用你自己的 key' : '已清空：回到站点额度')
            window.setTimeout(() => setOwnMsg(''), 2400)
          }}
        >
          保存 key 设置
        </button>
        {ownMsg ? <div className="flash-line">{ownMsg}</div> : null}
        <p className="fineprint">
          当前：{usingOwnKey(ai) ? '你自己的 key（浏览器直连）' : '站点提供的额度（经本站服务器）'}
        </p>
      </div>

      <div className="card">
        <div className="card-label">数据</div>
        <p className="fineprint">
          共 {state.sessions.length} 次训练、{state.marks.length} 个卡点。录音存在你的账号里，也会在本机留一份缓存。
        </p>
        <button className="btn ghost sm" onClick={() => void exportPack()}>
          导出整包（含录音）
        </button>
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
          导入整包
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importPack(f)
          }}
        />
        {packMsg ? <div className="flash-line">{packMsg}</div> : null}
        <p className="fineprint">导入是覆盖式的：会先清空当前记录，再写回备份里的内容。</p>
        {!confirmClear ? (
          <button className="btn danger sm" onClick={() => setConfirmClear(true)}>
            清空我的记录
          </button>
        ) : (
          <div className="row-2">
            <button className="btn danger sm" onClick={onClearAll}>
              确认清空，不可恢复
            </button>
            <button className="btn ghost sm" onClick={() => setConfirmClear(false)}>
              取消
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-label">退出</div>
        {!confirmLogout ? (
          <button className="btn ghost sm" onClick={() => setConfirmLogout(true)}>
            退出登录
          </button>
        ) : (
          <div className="row-2">
            <button className="btn danger sm" onClick={onLogout}>
              确认退出
            </button>
            <button className="btn ghost sm" onClick={() => setConfirmLogout(false)}>
              取消
            </button>
          </div>
        )}
        <p className="fineprint">退出后会清掉本机缓存，记录仍在账号里，重新登录即可取回。</p>
      </div>

      <div className="card">
        <div className="card-label">关于</div>
        <ul className="tips">
          <li>录音、转写、建议都可以在浏览器里完成，服务器只做账号同步和模型代理。</li>
          <li>转写只用来定位，不用于评分。</li>
          <li>素材均为真人原声。</li>
        </ul>
      </div>
      <div className="spacer" />
    </div>
  )
}
