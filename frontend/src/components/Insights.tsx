import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, GitCompareArrows, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import type { Conflict, Risk } from '../types'
import { EmptyState, LoadingBlock, SeverityBadge } from './ui'

function useLoad<T>(fetcher: () => Promise<T[]>, key: number) {
  const [data, setData] = useState<T[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const run = useCallback(() => {
    setLoading(true)
    setError('')
    fetcher()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => { setData(null); run() }, [run])
  return { data, error, loading, run }
}

function Header({ title, hint, loading, onRun }: { title: string; hint: string; loading: boolean; onRun: () => void }) {
  return (
    <div className="insight-head">
      <div>
        <h3>{title}</h3>
        <p className="muted">{hint}</p>
      </div>
      <button className="btn ghost sm" onClick={onRun} disabled={loading}>
        <RefreshCw size={14} className={loading ? 'spin' : ''} /> Re-run
      </button>
    </div>
  )
}

export function Risks({ docId }: { docId: number }) {
  const { data, error, loading, run } = useLoad<Risk>(() => api.risks(docId), docId)
  return (
    <div>
      <Header title="Risk screening" hint="Preliminary flags for clauses that may deserve a closer look — not legal conclusions." loading={loading} onRun={run} />
      {loading && !data ? (
        <LoadingBlock label="Screening clauses for potential risks…" />
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : data && data.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={28} />} title="Nothing flagged">No potentially risky clauses were identified.</EmptyState>
      ) : (
        <div className="cards">
          {(data || []).map((r, i) => (
            <article key={i} className={'risk sev-border-' + (r.severity || 'medium').toLowerCase()}>
              <div className="risk-top">
                <span className="risk-cat"><AlertTriangle size={15} /> {r.category || 'Concern'}</span>
                <SeverityBadge level={r.severity} />
              </div>
              {r.explanation && <p>{r.explanation}</p>}
              {r.evidence && <blockquote>{r.evidence}</blockquote>}
              <small className="muted">
                Clause {r.clause_number || '—'}{r.page_number != null ? ` · Page ${r.page_number}` : ''}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function Conflicts({ docId }: { docId: number }) {
  const { data, error, loading, run } = useLoad<Conflict>(() => api.conflicts(docId), docId)
  return (
    <div>
      <Header title="Clause conflicts" hint="Places where two clauses may contradict each other." loading={loading} onRun={run} />
      {loading && !data ? (
        <LoadingBlock label="Comparing clauses for contradictions…" />
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : data && data.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={28} />} title="No conflicts found">No contradictory clauses were detected.</EmptyState>
      ) : (
        <div className="cards">
          {(data || []).map((c, i) => (
            <article key={i} className={'risk sev-border-' + (c.severity || 'medium').toLowerCase()}>
              <div className="risk-top">
                <span className="risk-cat"><GitCompareArrows size={15} /> Clause {c.clause_a || '—'} vs {c.clause_b || '—'}</span>
                <SeverityBadge level={c.severity} />
              </div>
              {c.explanation && <p>{c.explanation}</p>}
              <div className="vs">
                {c.evidence_a && <blockquote>{c.evidence_a}</blockquote>}
                {c.evidence_b && <blockquote>{c.evidence_b}</blockquote>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
