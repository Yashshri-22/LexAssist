import { useRef, useState, type DragEvent } from 'react'
import { FileText, LogOut, Moon, PanelLeftClose, Plus, Sun, Trash2, UploadCloud } from 'lucide-react'
import type { Doc, User } from '../types'
import { Skeleton, Spinner, timeAgo } from './ui'

export type UploadState = { step: 'uploading' | 'processing'; name: string } | null

type Props = {
  user: User | null
  docs: Doc[]
  loading: boolean
  selected: number | null
  upload: UploadState
  dark: boolean
  open: boolean
  collapsed: boolean
  onClose: () => void
  onHome: () => void
  onSelect: (id: number) => void
  onUpload: (f: File) => void
  onDelete: (d: Doc) => void
  onToggleTheme: () => void
  onLogout: () => void
}

const STEPS = [
  { key: 'uploading', label: 'Uploading file' },
  { key: 'processing', label: 'Reading, splitting & indexing clauses' },
]

export default function Sidebar(p: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const busy = !!p.upload

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f && !busy) p.onUpload(f)
  }

  return (
    <>
      {p.open && <div className="scrim" onClick={p.onClose} />}
      <aside className={'sidebar' + (p.open ? ' open' : '') + (p.collapsed ? ' collapsed' : '')}>
        <div className="side-top">
          <button className="logo" onClick={p.onHome} aria-label="NyayaSetu home" title="Back to home">
            <span className="mark sm">न्य</span>
            <span>
              <b>NyayaSetu</b>
              <small>Legal intelligence</small>
            </span>
          </button>
          <button className="icon-btn" onClick={p.onClose} aria-label="Hide sidebar" title="Hide sidebar"><PanelLeftClose size={19} /></button>
        </div>

        <div
          className={'dropzone' + (drag ? ' drag' : '') + (busy ? ' busy' : '')}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={drop}
          onClick={() => !busy && input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !busy && input.current?.click()}
        >
          {busy ? (
            <div className="progress">
              <p className="progress-name" title={p.upload!.name}>{p.upload!.name}</p>
              {STEPS.map((s, i) => {
                const cur = STEPS.findIndex(x => x.key === p.upload!.step)
                const state = i < cur ? 'done' : i === cur ? 'active' : 'todo'
                return (
                  <div key={s.key} className={'step' + state}>
                    {state === 'active' ? <Spinner size={14} /> : <span className="dot" />}
                    <span>{s.label}</span>
                  </div>
                )
              })}
              <div className="bar"><i /></div>
            </div>
          ) : (
            <>
              <UploadCloud size={26} />
              <b>Upload a document</b>
              <small>Drop a PDF or DOCX here, or click to browse</small>
            </>
          )}
          <input
            ref={input}
            type="file"
            hidden
            accept=".pdf,.docx"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) p.onUpload(f)
              e.target.value = ''
            }}
          />
        </div>

        <div className="side-label">
          <span>YOUR DOCUMENTS</span>
          <span className="count">{p.docs.length}</span>
        </div>

        <nav className="doclist" aria-label="Documents">
          {p.loading && p.docs.length === 0 ? (
            [0, 1, 2].map(i => (
              <div key={i} className="docrow skel">
                <Skeleton w={34} h={34} r={9} />
                <div style={{ flex: 1, display: 'grid', gap: 7 }}>
                  <Skeleton w="80%" />
                  <Skeleton w="40%" h={10} />
                </div>
              </div>
            ))
          ) : p.docs.length === 0 ? (
            <p className="side-empty"><Plus size={14} /> Nothing here yet — upload your first document.</p>
          ) : (
            p.docs.map(d => (
              <div key={d.id} className={'docrow' + (p.selected === d.id ? ' chosen' : '')}>
                <button className="docbtn" onClick={() => p.onSelect(d.id)} title={d.filename}>
                  <span className={'fileicon' + (d.filename.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf')}>
                    <FileText size={16} />
                  </span>
                  <span className="docname">
                    <b>{d.filename}</b>
                    <small>
                      <i className={'status-dot' + d.status.toLowerCase()} /> {d.status === 'COMPLETED' ? 'Ready' : d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                      {d.created_at ? ` · ${timeAgo(d.created_at)}` : ''}
                    </small>
                  </span>
                </button>
                <button className="icon-btn danger del" aria-label={`Delete ${d.filename}`} onClick={() => p.onDelete(d)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </nav>

        <div className="side-bottom">
          <p className="disclaimer">AI-generated information only. Not legal advice.</p>
          <div className="user">
            <span className="avatar">{(p.user?.name || p.user?.email || '?').charAt(0).toUpperCase()}</span>
            <span className="user-info">
              <b>{p.user?.name || 'Account'}</b>
              <small>{p.user?.email}</small>
            </span>
            <button className="icon-btn" onClick={p.onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {p.dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="icon-btn" onClick={p.onLogout} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
    </>
  )
}