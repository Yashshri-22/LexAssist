import type { Conflict, Doc, DocDetail, Risk, Source, User } from './types'

const API = (import.meta.env.VITE_API_URL as string | undefined) || '/api'
const TOKEN_KEY = 'token'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const tokenStore = {
  get(): string {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
  },
  set(t: string) {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

function errorMessage(d: any, status: number): string {
  const detail = d?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((e: any) => {
        const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : ''
        return field && field !== 'body' ? `${field}: ${e.msg}` : e.msg
      })
      .join('; ')
  }
  return status >= 500 ? 'The server ran into a problem. Please try again.' : 'Request failed'
}

async function request<T>(path: string, init: { method?: string; json?: unknown; form?: FormData; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token && init.auth !== false) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (init.form) body = init.form
  else if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.json)
  }
  let res: Response
  try {
    res = await fetch(API + path, { method: init.method || 'GET', headers, body })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running on port 8000?', 0)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && init.auth !== false) onUnauthorized()
    throw new ApiError(errorMessage(data, res.status), res.status)
  }
  return data as T
}

export type AuthResult = { access_token: string; user: User }
export type AskResult = { answer: string; sources: Source[]; grounded?: boolean }
export type WhatIfResult = { analysis: string; sources: Source[]; disclaimer?: string }

export const api = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', json: { email, password }, auth: false }),
  register: (name: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { method: 'POST', json: { name, email, password }, auth: false }),
  me: () => request<User>('/auth/me'),
  docs: () => request<Doc[]>('/documents'),
  doc: (id: number) => request<DocDetail>(`/documents/${id}`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ id: number; filename: string; status: string }>('/documents/upload', { method: 'POST', form })
  },
  process: (id: number) => request<{ status: string }>(`/documents/${id}/process`, { method: 'POST' }),
  remove: (id: number) => request<{ deleted: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  ask: (id: number, question: string) =>
    request<AskResult>(`/documents/${id}/ask`, { method: 'POST', json: { question } }),
  whatIf: (id: number, scenario: string) =>
    request<WhatIfResult>(`/documents/${id}/what-if`, { method: 'POST', json: { scenario, language: 'English' } }),
  risks: (id: number) => request<Risk[]>(`/documents/${id}/risks`),
  conflicts: (id: number) => request<Conflict[]>(`/documents/${id}/conflicts`),
}
