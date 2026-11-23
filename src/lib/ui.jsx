// ── Tiny UI helpers: toast notifications + loading spinner (no new deps) ──
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_SETTINGS, store } from './store'
import { SITE } from '../data/catalog'
import { canInstall, initInstallPrompt, isStandalone, promptInstall, subscribeInstall } from './install'
import { PUSH_PROMPT_FLAG, getSubscriptionState, isPushSupported, subscribeToPush, unsubscribeFromPush } from './push'
import { useAuth } from '../context/AuthContext'

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

// ── 🔔 Notifications ON/OFF button ───────────────────────────────────────────
// Chaar haalatein: unsupported (browser mein push nahi), blocked (permission
// mana kar di gayi), on (subscription chalu), off (kabhi bhi ON kar sakte hain).
export function NotificationToggle({ userId = null, className = 'btn btn-ghost btn-sm' }) {
  const toast = useToast()
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    getSubscriptionState().then((s) => { if (live) setState(s) }).catch(() => { if (live) setState('off') })
    return () => { live = false }
  }, [])
  const click = async () => {
    if (busy || state === 'loading') return
    if (state === 'unsupported') { toast('Is browser mein notifications nahi chalte — Chrome (Android) ya home-screen app (iPhone) se kholein.', 'err'); return }
    if (state === 'blocked') { toast('Notifications browser mein block hain — browser settings → Site settings → Notifications mein is site ko Allow karein.', 'err'); return }
    setBusy(true)
    try {
      if (state === 'on') {
        await unsubscribeFromPush()
        setState('off')
        toast('Notifications band ho gaye.')
      } else {
        await subscribeToPush(userId)
        setState('on')
        toast('Notifications ON ho gaye 🔔 — offers aur booking updates sabse pehle milenge!')
      }
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi — dobara koshish karein.', 'err') }
    setBusy(false)
  }
  const label = state === 'on' ? '🔔 Notifications ON ✔'
    : state === 'blocked' ? '🔔 Notifications Blocked'
      : state === 'unsupported' ? '🔔 Notifications (is browser mein nahi)'
        : '🔔 Notifications ON Karein'
  return (
    <button type="button" className={className} onClick={click} disabled={busy || state === 'loading' || state === 'unsupported'} aria-pressed={state === 'on'}>
      {busy ? 'Rukiye…' : label}
    </button>
  )
}

// ── Ek-baar wala narm prompt banner (panels mein, login ke baad) ────────────
// localStorage flag se ye banner sirf ek baar dikhta hai — user ON kare ya
// band kare, dobara pareshan nahi karta.
export function NotificationPromptBanner() {
  const { user } = useAuth()
  const toast = useToast()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!user) return
    let seen = false
    try { seen = !!localStorage.getItem(PUSH_PROMPT_FLAG) } catch { seen = true }
    if (seen || !isPushSupported()) return
    let live = true
    getSubscriptionState().then((s) => { if (live && s === 'off') setShow(true) }).catch(() => {})
    return () => { live = false }
  }, [user])
  if (!show || !user) return null
  const dismiss = () => { try { localStorage.setItem(PUSH_PROMPT_FLAG, '1') } catch { /* ignore */ } setShow(false) }
  const turnOn = async () => {
    setBusy(true)
    try {
      await subscribeToPush(user.id)
      toast('Notifications ON ho gaye 🔔 — offers aur booking updates sabse pehle milenge!')
      dismiss()
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi — dobara koshish karein.', 'err') }
    setBusy(false)
  }
  return (
    <div className="push-banner" role="region" aria-label="Notifications ki jaankari">
      <span>🔔 <b>Offers aur updates ke liye notifications ON karein</b> — naye offers, quotation ke jawab aur booking updates sabse pehle aapke phone par.</span>
      <span className="push-banner-actions">
        <button type="button" className="btn btn-gold btn-sm" onClick={turnOn} disabled={busy}>{busy ? 'Rukiye…' : '🔔 ON Karein'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>Baad Mein</button>
      </span>
    </div>
  )
}

// ── Date helpers — booking/quotation ki event dates ke liye ────────────────
// Event dates har jagah 'YYYY-MM-DD' string mein aati hain (date input / DB).
// todayStr() LOCAL timezone se aaj ki wahi string deta hai, taaki string
// compare (date < today) hamesha sahi rahe.
export function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// '2026-12-15' → '15 Dec 2026'. Date-only string ko local date ki tarah
// parse karta hai (new Date('YYYY-MM-DD') UTC midnight hota hai — kuchh
// timezones mein ek din peeche dikh sakta tha). Poora timestamp mile to
// use waise hi format karta hai.
export function fmtDate(iso) {
  if (!iso) return ''
  try {
    const s = String(iso).trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}

export const isPastDate = (dateStr) => !!dateStr && String(dateStr).slice(0, 10) < todayStr()

// Booking/quotation lists ka kram: aane wali date pehle (sabse nazdeek sabse
// upar), beeti hui dates uske baad (sabse taaza beeti sabse pehle), bina
// date wali entries sabse neeche. Nayi array deta hai — original nahi badalta.
export function sortByEventDate(list) {
  const t = todayStr()
  const key = (x) => (x && x.date ? String(x.date).slice(0, 10) : '')
  return [...(list || [])].sort((a, b) => {
    const da = key(a); const db = key(b)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    const ua = da >= t; const ub = db >= t
    if (ua && ub) return da.localeCompare(db)
    if (!ua && !ub) return db.localeCompare(da)
    return ua ? -1 : 1
  })
}

// Display-only: jis 'confirmed' booking ki event date beet chuki hai, wo
// asal mein sampann hai — DB ka status NAHI badalta, sirf panels mein
// dikhawa 'completed' hota hai (aur User Panel mein review khul jata hai).
export function effectiveBookingStatus(b) {
  if (b && b.status === 'confirmed' && isPastDate(b.date)) return 'completed'
  return b ? b.status : ''
}

// Mobile number validation: pure 10 ank; +91 / 91 / 0 wala prefix chalega.
export function validPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^\d{10}$/.test(d)
}

export function Spinner({ label = 'Load ho raha hai…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
