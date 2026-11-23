// ── Tiny UI helpers: toast notifications + loading spinner (no new deps) ──
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_SETTINGS, store } from './store'
import { SITE } from '../data/catalog'
import { canInstall, initInstallPrompt, isStandalone, promptInstall, subscribeInstall } from './install'

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

// ── "📲 App Download Karein" button ──────────────────────────────────────────
// Browser ka install prompt uplabdh ho to wahi dikhata hai; na ho (iOS Safari
// ya prompt abhi nahi aaya) to steps batakar /app page par le jata hai. App
// pehle se installed (standalone) ho to button gayab ho jata hai.
export function InstallAppButton({ className = 'btn btn-gold', label = '📲 App Download Karein' }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [, force] = useState(0)
  const [standalone, setStandalone] = useState(() => isStandalone())
  useEffect(() => {
    initInstallPrompt()
    setStandalone(isStandalone())
    return subscribeInstall(() => { force((v) => v + 1); setStandalone(isStandalone()) })
  }, [])
  if (standalone) return null
  const click = async () => {
    if (canInstall()) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') toast('App install ho raha hai — home screen par 🪔 icon aa jayega 🎉')
      else toast('Install rok diya gaya — jab chaaho, yahin se phir koshish kar sakte ho.')
      return
    }
    toast('Install ke steps: Android Chrome — ⋮ menu → "App install karein"; iPhone Safari — Share → "Home Screen par jodein".')
    navigate('/app')
  }
  return <button type="button" className={className} onClick={click}>{label}</button>
}

export function Spinner({ label = 'Load ho raha hai…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
