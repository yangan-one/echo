import { useEffect, type ReactNode } from 'react'

export function Sheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`sheet ${wide ? 'sheet-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div>
            <div className="sheet-title">{title}</div>
            {subtitle ? <div className="sheet-sub">{subtitle}</div> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {hint ? <div className="empty-hint">{hint}</div> : null}
      {children}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner" aria-label={label ?? '加载中'}>
      <span className="spinner-dot" />
      <span className="spinner-dot" />
      <span className="spinner-dot" />
    </span>
  )
}

export function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="tag-chip" style={{ borderColor: `${color}55`, color }}>
      {label}
    </span>
  )
}
