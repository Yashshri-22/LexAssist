import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, FileUp, GitCompareArrows, LayoutList, ListTree, MessagesSquare, PanelLeftOpen, RotateCw, ShieldAlert, Sparkles } from 'lucide-react'
import { api, setUnauthorizedHandler, tokenStore, type AuthResult } from './api'
import type { Doc, DocDetail, User } from './types'
import Auth from './components/Auth'
import Sidebar, { type UploadState } from './components/Sidebar'
import Chat from './components/Chat'
import Overview from './components/Overview'
import Clauses from './components/Clauses'
import { Conflicts, Risks } from './components/Insights'
import { EmptyState, LoadingBlock, Modal, Spinner } from './components/ui'
import { useToast } from './components/Toasts'

type Tab = 'chat' | 'overview' | 'clauses' | 'risks' | 'conflicts'
const TABS: { key: Tab; label: string; icon: typeof MessagesSquare }[] = [
  { key: 'chat', label: 'Chat', icon: MessagesSquare },
  { key: 'overview', label: 'Overview', icon: LayoutList },
  { key: 'clauses', label: 'Clauses', icon: ListTree },
  { key: 'risks', label: 'Risks', icon: ShieldAlert },
  { key: 'conflicts', label: 'Conflicts', icon: GitCompareArrows },
]
const MAX_MB = 20

function readTheme(): boolean {
  try {
    const s = localStorage.getItem('theme')
    if (s) return s === 'dark'
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function App() {
  const toast = useToast()
  const [authed, setAuthed] = useState(!!tokenStore.get())
  const [user, setUser] = useState<User | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<DocDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')
  const [upload, setUpload] = useState<UploadState>(null)
  const [reprocessing, setReprocessing] = useState(false)
  const [toDelete, setToDelete] = useState<Doc | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar') === 'hidden' } catch { return false }
  })
  const [dark, setDark] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])

  useEffect(() => {
    try { localStorage.setItem('sidebar', collapsed ? 'hidden' : 'shown') } catch { /* ignore */ }
  }, [collapsed])

  const goHome = () => {
    setSelected(null)
    setDetail(null)
    setMenu(false)
  }

  const logout = useCallback(() => {
    tokenStore.clear()
    setAuthed(false)
    setUser(null)
    setDocs([])
    setDetail(null)
    setSelected(null)
  }, [])

  useEffect(() => setUnauthorizedHandler(() => { logout(); toast('info', 'Your session expired. Please sign in again.') }), [logout, toast])

  const refresh = useCallback(async () => {
    try {
      setDocs(await api.docs())
    } catch (e: any) {
      toast('error', e.message)
    }
  }, [toast])

  useEffect(() => {
    if (!authed) return
    setDocsLoading(true)
    Promise.all([api.me().then(setUser).catch(() => {}), refresh()]).finally(() => setDocsLoading(false))
  }, [authed, refresh])

  const open = useCallback(async (id: number) => {
    setSelected(id)
    setMenu(false)
    setDetailLoading(true)
    setTab('chat')
    try {
      setDetail(await api.doc(id))
    } catch (e: any) {
      toast('error', e.message)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  function onAuthed(r: AuthResult) {
    tokenStore.set(r.access_token)
    setUser(r.user)
    setAuthed(true)
  }

  async function waitUntilProcessed(id: number) {
    for (let i = 0; i < 200; i++) {
      const s = (await api.docs()).find(d => d.id === id)?.status
      if (s === 'COMPLETED') return
      if (s === 'FAILED') throw new Error('Processing failed for this document.')
      await new Promise(r => setTimeout(r, 1500))
    }
    throw new Error('Processing is taking too long. Check the backend terminal.')
  }

  async function handleUpload(file: File) {
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf' && ext !== 'docx') return toast('error', 'Only PDF and DOCX files are supported.')
    if (file.size > MAX_MB * 1024 * 1024) return toast('error', `File is larger than ${MAX_MB} MB.`)
    if (file.size === 0) return toast('error', 'That file is empty.')
    setUpload({ step: 'uploading', name: file.name })
    let id: number | null = null
    try {
      const d = await api.upload(file)
      id = d.id
      setUpload({ step: 'processing', name: file.name })
      await api.process(d.id)
      await waitUntilProcessed(d.id)
      await refresh()
      await open(d.id)
      toast('success', 'Document is ready — start asking questions.')
    } catch (e: any) {
      toast('error', e.message)
      await refresh()
      if (id) await open(id)
    } finally {
      setUpload(null)
    }
  }

  async function reprocess() {
    if (!selected) return
    setReprocessing(true)
    try {
      await api.process(selected)
      await waitUntilProcessed(selected)
      toast('success', 'Document processed.')
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setReprocessing(false)
      await refresh()
      await open(selected)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.remove(toDelete.id)
      try { localStorage.removeItem(`nyayasetu.chat.${toDelete.id}`) } catch { /* ignore */ }
      if (selected === toDelete.id) { setSelected(null); setDetail(null) }
      toast('success', 'Document deleted.')
      await refresh()
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  // The summary is generated after the document becomes usable; keep checking until it arrives.
  useEffect(() => {
    if (!selected || !detail || detail.status !== 'COMPLETED' || Object.keys(detail.summary || {}).length) return
    const t = setInterval(() => api.doc(selected).then(setDetail).catch(() => {}), 3000)
    return () => clearInterval(t)
  }, [selected, detail])

  if (!authed) return <Auth onAuthed={onAuthed} />

  const ready = detail?.status === 'COMPLETED'

  return (
    <div className="shell">
      <Sidebar
        user={user}
        docs={docs}
        loading={docsLoading}
        selected={selected}
        upload={upload}
        dark={dark}
        open={menu}
        collapsed={collapsed}
        onClose={() => { setMenu(false); setCollapsed(true) }}
        onHome={goHome}
        onSelect={id => open(id)}
        onUpload={handleUpload}
        onDelete={setToDelete}
        onToggleTheme={() => setDark(d => !d)}
        onLogout={logout}
      />

      <main className="main">
        <header className="topbar">
          <button
            className={'icon-btn menu-btn' + (collapsed ? ' show-desktop' : '')}
            onClick={() => { setMenu(true); setCollapsed(false) }}
            aria-label="Show sidebar"
            title="Show sidebar"
          >
            <PanelLeftOpen size={21} />
          </button>
          {detail ? (
            <div className="doc-title">
              <h1 title={detail.filename}>{detail.filename}</h1>
              <span className={'pill' + detail.status.toLowerCase()}>{ready ? 'Ready' : detail.status.toLowerCase()}</span>
            </div>
          ) : (
            <div className="doc-title"><h1>Workspace</h1></div>
          )}
        </header>

        {!selected ? (
          <div className="welcome">
            <EmptyState icon={<Sparkles size={30} />} title={docs.length ? 'Pick a document' : 'Welcome to NyayaSetu'}>
              {docs.length ? 'Choose a document from the sidebar to chat with it, review clauses and screen for risks.' : 'Upload a PDF or DOCX agreement to chat with it, review its clauses and screen for risks.'}
            </EmptyState>
            <label className={'btn primary' + (upload ? ' disabled' : '')} style={{ cursor: upload ? 'progress' : 'pointer' }}>
              {upload ? <Spinner size={16} /> : <FileUp size={16} />} {upload ? 'Processing…' : docs.length ? 'Upload a document' : 'Upload your first document'}
              <input type="file" hidden accept=".pdf,.docx" disabled={!!upload} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
            </label>
          </div>
        ) : detailLoading ? (
          <LoadingBlock label="Opening document…" />
        ) : !detail ? (
          <EmptyState icon={<AlertTriangle size={28} />} title="Couldn’t load this document">Try selecting it again.</EmptyState>
        ) : (
          <>
            <div className="tabs" role="tablist">
              {TABS.map(({ key, label, icon: I }) => (
                <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
                  <I size={16} /> <span>{label}</span>
                  {key === 'clauses' && <em>{detail.clauses.length}</em>}
                </button>
              ))}
            </div>

            {!ready && (
              <div className="banner warn">
                <AlertTriangle size={16} />
                <span>{detail.status === 'FAILED' ? 'Processing failed for this document.' : 'This document hasn’t been processed yet.'}</span>
                <button className="btn sm" onClick={reprocess} disabled={reprocessing}>
                  {reprocessing ? <Spinner size={14} /> : <RotateCw size={14} />} {reprocessing ? 'Processing…' : 'Process now'}
                </button>
              </div>
            )}

            <section className={'panel' + (tab === 'chat' ? ' chat-panel' : '')}>
              {tab === 'chat' && <Chat key={detail.id} docId={detail.id} docName={detail.filename} ready={!!ready} />}
              {tab === 'overview' && <Overview summary={detail.summary} />}
              {tab === 'clauses' && <Clauses key={detail.id} clauses={detail.clauses} />}
              {tab === 'risks' && (ready ? <Risks key={detail.id} docId={detail.id} /> : <EmptyState icon={<ShieldAlert size={28} />} title="Process the document first" />)}
              {tab === 'conflicts' && (ready ? <Conflicts key={detail.id} docId={detail.id} /> : <EmptyState icon={<GitCompareArrows size={28} />} title="Process the document first" />)}
            </section>
          </>
        )}
      </main>

      {toDelete && (
        <Modal title="Delete this document?" onClose={() => !deleting && setToDelete(null)}>
          <p className="muted"><b>{toDelete.filename}</b> and its analysis will be permanently removed.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
            <button className="btn danger" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Spinner size={14} />} Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}