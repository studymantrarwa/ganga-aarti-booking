// ── Push notifications (client) — Firebase Cloud Messaging ──────────────────
// ON karne par browser se FCM registration token banta hai; Supabase mode
// mein woh `device_tokens` table mein save hota hai (migration 005) taaki
// admin /api/send-push se sabko (ya sirf users / sirf partners ko, ya kisi
// ek user ko) notification bhej sake. Yahi website asli Android app
// (Capacitor shell) mein bhi chalti hai — wahan PushNotifications plugin se
// native FCM token banta hai (platform 'android', wahi table).
// Demo mode mein token sirf
// localStorage mein rehta hai — asal push bhejna sirf live (database) mode
// mein hota hai.
//
// Koi SECRET yahan nahi hai: Firebase web config aur Web Push VAPID public
// key sarvajanik hote hain (src/lib/firebase.js). Service-account private
// key sirf server env (api/send-push.js) mein rehti hai.
import { supabase, isSupabaseMode } from './supabase'
import { FIREBASE_WEB_PUSH_VAPID_KEY, getFirebaseMessaging, isFirebaseConfigured, registerMessagingServiceWorker } from './firebase'

const LS_ROWS_KEY = 'gab_device_tokens_v1'
const LS_TOKEN_KEY = 'gab_fcm_token_v1'
// Aakhri push token (web ho ya native) — unsubscribe ko pakka banane ke
// liye dono raaston par yahi key bhari jaati hai.
const LS_PUSH_TOKEN_KEY = 'gab_push_token'
export const PUSH_PROMPT_FLAG = 'gab_push_prompt_seen_v1'

// ── Native Android app (Capacitor shell) ────────────────────────────────────
// Yahi website ek asli Android app ke andar bhi chalti hai (Capacitor,
// in.gangaaartibooking.app) jo live site ko load karta hai. Wahan browser
// wala web-FCM raasta nahi chalta — PushNotifications plugin se native FCM
// token milta hai aur woh bhi usi device_tokens table mein save hota hai
// (platform 'android'), taaki /api/send-push dono ko ek jaise bhej sake.
// Plugin sirf tab DYNAMICALLY import hota hai jab sach mein native shell
// ho (window.Capacitor maujood ho) — aam browser bundle par koi asar nahi.
function isNative() {
  return typeof window !== 'undefined'
    && !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
}

async function loadNativePush() {
  const mod = await import('@capacitor/push-notifications')
  return mod.PushNotifications
}

export function isPushSupported() {
  if (isNative()) return true
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'Notification' in window
}

// 'unsupported' | 'blocked' | 'on' | 'off'
export async function getSubscriptionState() {
  if (isNative()) {
    try {
      const PushNotifications = await loadNativePush()
      const perm = await PushNotifications.checkPermissions()
      if (perm.receive === 'denied') return 'blocked'
      if (perm.receive === 'granted') {
        // Permission hai; token bhi save ho to pakka ON. Permission ho par
        // token na ho (register kabhi hua hi nahi) to OFF — taaki tap karke
        // register ho jaye.
        try { return localStorage.getItem(LS_PUSH_TOKEN_KEY) ? 'on' : 'off' } catch { return 'off' }
      }
      return 'off' // 'prompt' — permission abhi manga hi nahi gaya
    } catch { return 'off' }
  }
  if (!isPushSupported()) return 'unsupported'
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'blocked'
  try { return localStorage.getItem(LS_TOKEN_KEY) ? 'on' : 'off' } catch { return 'off' }
}

// ── Demo mode: tokens localStorage mein ─────────────────────────────────────
function loadDemoRows() {
  try { const raw = localStorage.getItem(LS_ROWS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : [] } catch { return [] }
}
function saveDemoRows(rows) { try { localStorage.setItem(LS_ROWS_KEY, JSON.stringify(rows)) } catch { /* ignore */ } }

// ── Token row save/delete — web aur native dono raaston ke liye ek ─────────
async function saveTokenRow(row) {
  if (isSupabaseMode) {
    const { error } = await supabase.from('device_tokens').upsert(row, { onConflict: 'token' })
    if (error) throw new Error('Token save nahi ho paya — dobara koshish karein.')
  } else {
    const rows = loadDemoRows().filter((r) => r.token !== row.token)
    rows.push({ ...row, demo: true, created_at: new Date().toISOString() })
    saveDemoRows(rows)
  }
}

async function deleteTokenRow(token) {
  if (!token) return
  if (isSupabaseMode) {
    try { await supabase.from('device_tokens').delete().eq('token', token) } catch { /* ignore */ }
  } else {
    saveDemoRows(loadDemoRows().filter((r) => r.token !== token))
  }
}

// Notifications ON karein — permission maangta hai, FCM token banata hai
// aur use save karta hai. Galti par Hinglish error throw hota hai.
export async function subscribeToPush(userId) {
  if (isNative()) return subscribeNativePush(userId)
  if (!isPushSupported()) {
    throw new Error('Is browser mein notifications support nahi hote — Chrome (Android) ya Safari (iPhone, home-screen app se) mein koshish karein.')
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Notifications ka setup abhi poora nahi hua hai — kripya kuchh samay baad dobara koshish karein.')
  }
  let permission = Notification.permission
  if (permission === 'default') {
    try { permission = await Notification.requestPermission() } catch { permission = 'denied' }
  }
  if (permission !== 'granted') {
    throw new Error('Notification ki permission nahi mili. Browser ki settings → Site settings → Notifications mein is site ko Allow karein, phir dobara ON karein.')
  }
  const messaging = await getFirebaseMessaging()
  if (!messaging) {
    throw new Error('Is browser mein notifications support nahi hote — Chrome (Android) ya home-screen app (iPhone) se koshish karein.')
  }
  const registration = await registerMessagingServiceWorker()
  if (!registration) {
    throw new Error('App ka background hissa taiyaar nahi ho paya — page dobara load karke koshish karein.')
  }
  let token = ''
  try {
    const { getToken } = await import('firebase/messaging')
    token = await getToken(messaging, { vapidKey: FIREBASE_WEB_PUSH_VAPID_KEY, serviceWorkerRegistration: registration })
  } catch { token = '' }
  if (!token) {
    throw new Error('Notification token nahi ban paya — net connection check karke dobara koshish karein.')
  }
  try { localStorage.setItem(LS_TOKEN_KEY, token); localStorage.setItem(LS_PUSH_TOKEN_KEY, token) } catch { /* ignore */ }
  const row = {
    token,
    user_id: userId || null,
    platform: 'web',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }
  await saveTokenRow(row)
  return token
}

// Native app mein notifications ON — PushNotifications plugin se permission
// maangta hai, register() karta hai; 'registration' event se native FCM
// token milta hai jo web wale hi device_tokens table mein platform
// 'android' ke saath save hota hai.
async function subscribeNativePush(userId) {
  let PushNotifications
  try {
    PushNotifications = await loadNativePush()
  } catch {
    throw new Error('App ka notification hissa taiyaar nahi ho paya — app band karke dobara kholein.')
  }
  let perm = await PushNotifications.checkPermissions()
  if (perm.receive !== 'granted') {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive !== 'granted') {
    throw new Error('Notification ki permission nahi mili. Phone ki Settings → Apps → Ganga Aarti Booking → Notifications mein jaakar Allow karein, phir dobara ON karein.')
  }
  const token = await new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn, val) => { if (settled) return; settled = true; clearTimeout(timer); fn(val) }
    const timer = setTimeout(() => finish(reject, new Error('Notification token nahi ban paya — net connection check karke dobara koshish karein.')), 25000)
    PushNotifications.addListener('registration', (t) => finish(resolve, (t && t.value) || ''))
    PushNotifications.addListener('registrationError', () => finish(reject, new Error('Notification register nahi ho paya — net connection check karke dobara koshish karein.')))
    PushNotifications.register().catch(() => finish(reject, new Error('Notification register nahi ho paya — dobara koshish karein.')))
  })
  if (!token) {
    throw new Error('Notification token nahi ban paya — dobara koshish karein.')
  }
  try { localStorage.setItem(LS_PUSH_TOKEN_KEY, token) } catch { /* ignore */ }
  const row = {
    token,
    user_id: userId || null,
    platform: 'android',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }
  await saveTokenRow(row)
  return token
}

// Notifications OFF karein — FCM token khatam + row delete.
export async function unsubscribeFromPush() {
  if (isNative()) {
    let nToken = ''
    try { nToken = localStorage.getItem(LS_PUSH_TOKEN_KEY) || '' } catch { nToken = '' }
    try {
      const PushNotifications = await loadNativePush()
      if (PushNotifications.removeAllListeners) await PushNotifications.removeAllListeners().catch(() => {})
    } catch { /* ignore */ }
    await deleteTokenRow(nToken)
    try { localStorage.removeItem(LS_PUSH_TOKEN_KEY) } catch { /* ignore */ }
    return true
  }
  let token = ''
  try { token = localStorage.getItem(LS_TOKEN_KEY) || localStorage.getItem(LS_PUSH_TOKEN_KEY) || '' } catch { token = '' }
  try {
    const messaging = await getFirebaseMessaging()
    if (messaging) {
      const { deleteToken } = await import('firebase/messaging')
      await deleteToken(messaging).catch(() => {})
    }
  } catch { /* ignore */ }
  await deleteTokenRow(token)
  try { localStorage.removeItem(LS_TOKEN_KEY); localStorage.removeItem(LS_PUSH_TOKEN_KEY) } catch { /* ignore */ }
  return true
}

// Kul subscribers (device tokens) ki ginti — Admin → Notifications tab.
export async function countDeviceTokens() {
  if (!isSupabaseMode) return loadDemoRows().length
  try {
    const { count, error } = await supabase.from('device_tokens').select('id', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  } catch { return 0 }
}

// Kya is (admin) user ka apna token hai? — Test push se pehle hint ke liye.
export async function hasOwnSubscription(userId) {
  if (!userId) return false
  if (!isSupabaseMode) return loadDemoRows().some((r) => r.user_id === userId)
  try {
    const { data } = await supabase.from('device_tokens').select('id').eq('user_id', userId).limit(1)
    return !!(data && data.length)
  } catch { return false }
}

// Current Supabase session ka access token — /api/send-push ko admin ki
// pehchan ke liye bhejna hota hai.
export async function getSessionAccessToken() {
  if (!isSupabaseMode) return null
  try {
    const { data } = await supabase.auth.getSession()
    return (data && data.session && data.session.access_token) || null
  } catch { return null }
}

// ── Targeted push (ek khaas user ko) ────────────────────────────────────────
// Chat messages aur booking events ke liye: /api/send-push ko { toUserId }
// ke saath bulata hai. Server pehle pehchan (login token) check karta hai,
// phir ye bhi ki bhejne wale aur paane wale ke beech sach mein koi booking
// ya quotation hai — tabhi bhejta hai.
// FIRE-AND-FORGET: ye function kabhi throw nahi karta aur demo mode mein
// kuchh nahi karta (asli push sirf live/database mode mein hota hai) —
// isliye ise bina await kiye bhi surakshit roop se bulaya ja sakta hai.
export async function sendTargetedPush({ toUserId, title, body, url } = {}) {
  try {
    if (!isSupabaseMode) return false
    if (!toUserId || !title || !body) return false
    const accessToken = await getSessionAccessToken()
    if (!accessToken) return false
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ toUserId, title, body, url: url || '/' }),
    })
    return !!(res && res.ok)
  } catch { return false }
}

// Chat message ka notification — title "💬 <bhejne wale ka naam>", body
// message ka text (~120 aksharon tak kata hua), url panel ka deep link.
export function notifyChatMessage({ toUserId, senderName, text, url } = {}) {
  const raw = String(text || '').trim()
  const short = raw.length > 120 ? `${raw.slice(0, 117)}…` : raw
  return sendTargetedPush({
    toUserId,
    title: `💬 ${senderName || 'Naya Message'}`,
    body: short || 'Aapke liye ek naya message aaya hai.',
    url: url || '/',
  })
}
