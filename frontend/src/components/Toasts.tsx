import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {})
export const useToast = () => useContext(Ctx)

let seq = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const dismiss = (id: number) => setItems(t => t.filter(x => x.id !== id))
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq
    setItems(t => [...t.slice(-3), { id, kind, text }])
    setTimeout(() => setItems(t => t.filter(x => x.id !== id)), kind === 'error' ? 6500 : 3500)
  }, [])
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info }
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => {
          const I = Icon[t.kind]
          return (
            <div key={t.id} className={`toast ${t.kind}`}>
              <I size={18} />
              <span>{t.text}</span>
              <button className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
