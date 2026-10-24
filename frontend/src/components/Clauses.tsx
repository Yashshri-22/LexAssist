import { useMemo, useState } from 'react'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import type { Clause } from '../types'
import { EmptyState } from './ui'

export default function Clauses({ clauses }: { clauses: Clause[] }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<number>>(new Set())
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return clauses.map((c, i) => ({ c, i })).filter(({ c }) => !t || `${c.clause_number} ${c.title} ${c.text}`.toLowerCase().includes(t))
  }, [clauses, q])

  const toggle = (i: number) =>
    setOpen(s => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  if (!clauses.length) return <EmptyState icon={<SearchX size={28} />} title="No clauses found">We couldn’t split this document into clauses.</EmptyState>

  return (
    <div>
      <div className="searchbar">
        <Search size={16} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${clauses.length} clauses…`} aria-label="Search clauses" />
        <span className="count">{shown.length}/{clauses.length}</span>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<SearchX size={28} />} title="No matches">Try a different word.</EmptyState>
      ) : (
        <ul className="clause-list">
          {shown.map(({ c, i }) => (
            <li key={i} className={open.has(i) ? 'open' : ''}>
              <button onClick={() => toggle(i)} aria-expanded={open.has(i)}>
                <ChevronRight size={16} className="chev" />
                <span className="cnum">{c.clause_number || '—'}</span>
                <span className="ctitle">{c.title || c.text.slice(0, 80)}</span>
                <span className="cpage">p.{c.page_number}</span>
              </button>
              {open.has(i) && <p className="ctext">{c.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
