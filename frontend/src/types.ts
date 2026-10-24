export type User = { id: number; name: string; email: string }
export type Doc = { id: number; filename: string; status: string; created_at?: string }
export type Clause = { id?: number; clause_number: string; title: string; page_number: number; text: string }
export type DocDetail = { id: number; filename: string; status: string; summary: Record<string, unknown>; clauses: Clause[] }
export type Source = { page_number?: number; clause_number?: string; text: string }
export type Risk = {
  category?: string
  severity?: string
  explanation?: string
  evidence?: string
  clause_number?: string
  page_number?: number
}
export type Conflict = {
  clause_a?: string
  clause_b?: string
  explanation?: string
  evidence_a?: string
  evidence_b?: string
  severity?: string
}
export type ChatMode = 'ask' | 'whatif'
export type Msg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  mode: ChatMode
  sources?: Source[]
  note?: string
  error?: boolean
  grounded?: boolean
  ts: number
}
