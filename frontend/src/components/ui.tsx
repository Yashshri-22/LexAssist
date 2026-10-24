import { Fragment, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="spin" aria-label="Loading" />

export const Skeleton = ({ w = '100%', h = 14, r = 8 }: { w?: string | number; h?: number; r?: number }) => (
  <span className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
)

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block">
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function SeverityBadge({ level }: { level?: string }) {
  const l = (level || 'MEDIUM').toUpperCase()
  return <span className={`badge sev-${l.toLowerCase()}`}>{l}</span>
}

/** Small, safe markdown renderer (headings, lists, bold, italics, inline code). No raw HTML is ever injected. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={i++}>{t.slice(1, -1)}</code>)
    else out.push(<em key={i++}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) { blocks.push(<h4 key={k++} className="md-h">{inline(h[2])}</h4>); i++; continue }
    if (/^\s*([-*•])\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ''))
      blocks.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
      blocks.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++])
    blocks.push(
      <p key={k++}>
        {para.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t)}</Fragment>)}
      </p>,
    )
  }
  return <div className="md">{blocks}</div>
}

export const prettyKey = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return d.toLocaleDateString()
}
