// ── Tiny UI helpers: toast notifications + loading spinner (no new deps) ──
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, store } from './store'
import { SITE } from '../data/catalog'

// Site settings (admin-editable) with catalog SITE fallback — used by the
// layout, home and contact pages for phone / email / WhatsApp links.
export function useSettings() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, contact_phone: SITE.phone, contact_email: SITE.email, whatsapp: SITE.whatsapp })
  useEffect(() => { store.getSettings().then((s) => { if (s) setSettings(s) }).catch(() => {}) }, [])
  return settings
}

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const toast = useCallback((message, kind = 'ok') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'err' ? '⚠️ ' : '✔ '}{t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

export function Spinner({ label = 'Load ho raha hai…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
