import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { LoadingBlock, prettyKey } from './ui'

const NONE = /^(not identified|none|n\/a|null|)$/i

function Value({ v }: { v: unknown }): ReactNode {
  if (v == null) return <span className="dim">Not identified</span>
  if (typeof v === 'string') return NONE.test(v.trim()) ? <span className="dim">Not identified</span> : <p>{v}</p>
  if (typeof v === 'number' || typeof v === 'boolean') return <p>{String(v)}</p>
  if (Array.isArray(v)) {
    const items = v.filter(x => !(typeof x === 'string' && NONE.test(x.trim())))
    if (!items.length) return <span className="dim">Not identified</span>
    return <ul>{items.map((x, i) => <li key={i}><Value v={x} /></li>)}</ul>
  }
  const entries = Object.entries(v as Record<string, unknown>)
  if (!entries.length) return <span className="dim">Not identified</span>
  return (
    <dl className="kv">
      {entries.map(([k, val]) => (
        <div key={k}>
          <dt>{prettyKey(k)}</dt>
          <dd><Value v={val} /></dd>
        </div>
      ))}
    </dl>
  )
}

const WIDE = ['purpose', 'extractive_overview', 'obligations', 'potential_concerns', 'financial_terms']

export default function Overview({ summary }: { summary: Record<string, unknown> }) {
  const entries = Object.entries(summary || {})
  if (!entries.length) return <LoadingBlock label="Generating summary…" />
  const fallback = 'extractive_overview' in summary
  return (
    <div className="overview">
      {fallback && (
        <div className="banner">
          <Sparkles size={16} />
          <span>The AI summary isn’t available right now, so this is a plain-text extract. Check your Gemini settings in the project’s <code>.env</code> file.</span>
        </div>
      )}
      <div className="grid">
        {entries.map(([k, v]) => (
          <section key={k} className={'info-card' + (WIDE.includes(k) ? ' wide' : '')}>
            <h4>{prettyKey(k)}</h4>
            <Value v={v} />
          </section>
        ))}
      </div>
    </div>
  )
}