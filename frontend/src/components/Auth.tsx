import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, FileSearch, Loader2, MessagesSquare, ShieldCheck } from 'lucide-react'
import { api, type AuthResult } from '../api'

export default function Auth({ onAuthed }: { onAuthed: (r: AuthResult) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      onAuthed(mode === 'login' ? await api.login(email, password) : await api.register(name, email, password))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <section className="auth-brand">
        <div className="mark">न्य</div>
        <h1>NyayaSetu</h1>
        <p className="tagline">Bridging the Gap Between Law and Understanding</p>
        <ul className="auth-points">
          <li><FileSearch size={18} /> Upload a contract and see every clause laid out clearly</li>
          <li><MessagesSquare size={18} /> Chat with your document and get answers with sources</li>
          <li><ShieldCheck size={18} /> Spot risky terms and conflicting clauses early</li>
        </ul>
      </section>

      <form className="card auth-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">{mode === 'login' ? 'Sign in to continue to your workspace.' : 'It takes less than a minute.'}</p>

        {mode === 'register' && (
          <label className="field">
            <span>Full name</span>
            <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Asha Verma" required />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="pw">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="btn primary block" disabled={busy}>
          {busy && <Loader2 size={16} className="spin" />}
          {busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="btn link" onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setError('') }}>
          {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>
        <p className="fine">AI-generated information only. Not legal advice.</p>
      </form>
    </main>
  )
}
