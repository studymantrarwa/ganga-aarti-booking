// ── PWA install prompt ───────────────────────────────────────────────────────
// `beforeinstallprompt` event ko pakad kar rakhte hain taaki header, mobile
// bar, home page aur /app page ke "App Download Karein" button use istemal
// karke asal install dialog dikha sakein. iOS Safari ye event nahi deta —
// wahan button /app page ke manual steps dikhata hai.
let deferredPrompt = null
let initialized = false
const listeners = new Set()

function notify() { listeners.forEach((fn) => { try { fn() } catch { /* ignore */ } }) }

export function initInstallPrompt() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function subscribeInstall(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canInstall() { return !!deferredPrompt }

// Asli Android app (Capacitor shell) ke andar chal raha hai? Wahan site
// pehle se ek installed app hai — install wala UI bekaar hai, isliye
// InstallAppButton wahan khud chhup jata hai (isStandalone ke zariye).
export function isNativeApp() {
  return typeof window !== 'undefined'
    && !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
}

// App pehle se installed / standalone mode mein chal raha hai?
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return isNativeApp()
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true
}

// Returns: 'accepted' | 'dismissed' | 'unavailable'
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable'
  const ev = deferredPrompt
  deferredPrompt = null
  notify()
  try {
    await ev.prompt()
    const choice = await ev.userChoice
    return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    return 'dismissed'
  }
}
