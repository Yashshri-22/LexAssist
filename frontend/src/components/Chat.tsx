import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Bot, Check, ChevronDown, Copy, FlaskConical, MessageSquare, Pencil, SendHorizonal, Trash2 } from 'lucide-react'
import { api } from '../api'
import type { ChatMode, Msg, Source } from '../types'
import { Markdown } from './ui'
import { useToast } from './Toasts'

const KEY = (id: number) => `nyayasetu.chat.${id}`
const load = (id: number): Msg[] => {
  try { return JSON.parse(localStorage.getItem(KEY(id)) || '[]') } catch { return [] }
}
const save = (id: number, m: Msg[]) => {
  try { localStorage.setItem(KEY(id), JSON.stringify(m.slice(-60))) } catch { /* ignore */ }
}

const SUGGESTIONS: Record<ChatMode, string[]> = {
  ask: ['What is the notice period?', 'Who are the parties to this agreement?', 'What are the payment terms?', 'Summarise the termination conditions'],
  whatif: ['What if I terminate after six months?', 'What if payment is 30 days late?', 'What if I breach the confidentiality clause?'],
}

const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null
  return (
    <div className="sources">
      <button className="src-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <ChevronDown size={14} className={open ? 'flip' : ''} />
        {sources.length} source{sources.length > 1 ? 's' : ''} from the document
      </button>
      {open && (
        <div className="src-list">
          {sources.map((s, i) => (
            <blockquote key={i}>
              <span className="src-ref">
                {s.page_number != null && `Page ${s.page_number}`}
                {s.clause_number ? ` · Clause ${s.clause_number}` : ''}
              </span>
              {s.text}
            </blockquote>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button className="icon-btn sm" onClick={copy} aria-label="Copy" title={copied ? 'Copied' : 'Copy'}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function UserMessage({ m, canEdit, onEdit }: { m: Msg; canEdit: boolean; onEdit: (id: string, text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.text)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.setSelectionRange(draft.length, draft.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const submit = () => {
    const t = draft.trim()
    if (!t) return
    setEditing(false)
    onEdit(m.id, t)
  }
  const cancel = () => {
    setEditing(false)
    setDraft(m.text)
  }

  if (editing) {
    return (
      <div className="msg user">
        <div className="edit-box">
          <textarea
            ref={ref}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
              if (e.key === 'Escape') cancel()
            }}
            aria-label="Edit message"
          />
          <div className="edit-actions">
            <button className="btn ghost sm" onClick={cancel}>Cancel</button>
            <button className="btn primary sm" onClick={submit} disabled={!draft.trim()}>Save &amp; send</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="msg user">
      <div className="bubble">
        {m.mode === 'whatif' && <span className="tag"><FlaskConical size={12} /> What-if</span>}
        {m.text}
      </div>
      <div className="meta">
        <time>{fmtTime(m.ts)}</time>
        <span className="actions">
          <CopyButton text={m.text} />
          <button
            className="icon-btn sm"
            onClick={() => { setDraft(m.text); setEditing(true) }}
            disabled={!canEdit}
            aria-label="Edit message"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
        </span>
      </div>
    </div>
  )
}

function BotMessage({ m }: { m: Msg }) {
  return (
    <div className="msg bot">
      <span className="bot-avatar"><Bot size={16} /></span>
      <div className="bot-col">
        <div className={'bubble' + (m.error ? ' err' : '')}>
          {m.mode === 'whatif' && !m.error && <span className="tag"><FlaskConical size={12} /> Scenario analysis</span>}
          {m.error ? m.text : <Markdown text={m.text} />}
          {m.sources && <Sources sources={m.sources} />}
          {m.grounded === false && <p className="note">No supporting passage was found, so no answer was generated.</p>}
          {m.note && <p className="note">{m.note}</p>}
        </div>
        <div className="meta">
          <time>{fmtTime(m.ts)}</time>
          {!m.error && <span className="actions"><CopyButton text={m.text} /></span>}
        </div>
      </div>
    </div>
  )
}

export default function Chat({ docId, docName, ready }: { docId: number; docName: string; ready: boolean }) {
  const toast = useToast()
  const [msgs, setMsgs] = useState<Msg[]>(() => load(docId))
  const [mode, setMode] = useState<ChatMode>('ask')
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => save(docId, msgs), [docId, msgs])
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, pending])
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [text])

  async function send(q: string, m: ChatMode = mode) {
    q = q.trim()
    if (!q || pending || !ready) return
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: q, mode: m, ts: Date.now() }
    setMsgs(x => [...x, userMsg])
    setText('')
    setPending(true)
    try {
      let bot: Msg
      if (m === 'ask') {
        const r = await api.ask(docId, q)
        bot = { id: crypto.randomUUID(), role: 'assistant', mode: m, text: r.answer, sources: r.sources, grounded: r.grounded, ts: Date.now() }
      } else {
        const r = await api.whatIf(docId, q)
        bot = { id: crypto.randomUUID(), role: 'assistant', mode: m, text: r.analysis, sources: r.sources, note: r.disclaimer, ts: Date.now() }
      }
      setMsgs(x => [...x, bot])
    } catch (err: any) {
      setMsgs(x => [...x, { id: crypto.randomUUID(), role: 'assistant', mode: m, text: err.message || 'Something went wrong.', error: true, ts: Date.now() }])
    } finally {
      setPending(false)
      box.current?.focus()
    }
  }

  /** Edit a previous question: drop it and everything after it, then ask the edited text again. */
  function editMessage(id: string, newText: string) {
    if (pending) return
    const target = msgs.find(m => m.id === id)
    if (!target) return
    setMsgs(x => {
      const i = x.findIndex(m => m.id === id)
      return i < 0 ? x : x.slice(0, i)
    })
    send(newText, target.mode)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(text)
    }
  }

  const clear = () => {
    setMsgs([])
    toast('info', 'Conversation cleared')
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scroller}>
        {msgs.length === 0 && !pending ? (
          <div className="chat-hello">
            <span className="bot-avatar lg"><Bot size={24} /></span>
            <h3>Ask anything about {docName}</h3>
            <p>Answers are based only on this document and always show the passages they came from.</p>
            <div className="chips">
              {SUGGESTIONS[mode].map(s => (
                <button key={s} className="chip" disabled={!ready} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="thread">
            {msgs.map(m =>
              m.role === 'user'
                ? <UserMessage key={m.id} m={m} canEdit={!pending && ready} onEdit={editMessage} />
                : <BotMessage key={m.id} m={m} />,
            )}
            {pending && (
              <div className="msg bot">
                <span className="bot-avatar"><Bot size={16} /></span>
                <div className="bubble typing" aria-label="Assistant is typing">
                  <i /><i /><i />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form className="composer" onSubmit={(e: FormEvent) => { e.preventDefault(); send(text) }}>
        <div className="composer-top">
          <div className="seg" role="tablist" aria-label="Chat mode">
            <button type="button" role="tab" aria-selected={mode === 'ask'} className={mode === 'ask' ? 'on' : ''} onClick={() => setMode('ask')}>
              <MessageSquare size={14} /> Ask
            </button>
            <button type="button" role="tab" aria-selected={mode === 'whatif'} className={mode === 'whatif' ? 'on' : ''} onClick={() => setMode('whatif')}>
              <FlaskConical size={14} /> What-if
            </button>
          </div>
          {msgs.length > 0 && (
            <button type="button" className="btn ghost sm" onClick={clear}><Trash2 size={14} /> Clear</button>
          )}
        </div>
        <div className="composer-box">
          <textarea
            ref={box}
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            disabled={!ready}
            placeholder={!ready ? 'Process the document to start chatting' : mode === 'ask' ? 'Ask a question about this document…' : 'Describe a scenario, e.g. What if I terminate early?'}
            aria-label="Message"
          />
          <button className="send" disabled={!text.trim() || pending || !ready} aria-label="Send">
            <SendHorizonal size={18} />
          </button>
        </div>
        <p className="fine">Enter to send · Shift+Enter for a new line · AI can make mistakes — verify important points.</p>
      </form>
    </div>
  )
}