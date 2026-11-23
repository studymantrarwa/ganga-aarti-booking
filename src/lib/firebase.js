// ── Firebase (Cloud Messaging) — client setup ────────────────────────────────
// Notifications Firebase FCM se jaate hain. Firebase SDK yahan LAZY load
// hota hai (dynamic import) taaki site ke baaki hisse par koi bojh na pade,
// aur jin browsers mein messaging support nahi (jaise kuchh iOS haalatein)
// wahan ye chup chaap null de deta hai.
//
// ⚠️ PARENT NOTE: neeche ke saare values PLACEHOLDER ("REPLACE_ME") hain.
// Firebase Console → Project settings → "Your apps" (Web app) se asal
// config lekar yahan bharein. Wahi config public/firebase-messaging-sw.js
// mein bhi bharni hai (dono bilkul ek jaise). Web Push certificates (VAPID
// key pair) Firebase Console → Project settings → Cloud Messaging →
// "Web Push certificates" se milta hai — uski PUBLIC key neeche
// FIREBASE_WEB_PUSH_VAPID_KEY mein daalein. Ye config/key sarvajanik
// (public) hote hain — inmein koi secret nahi hai; asal secret
// (service account) sirf server par /api/send-push ke env mein rehta hai.

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBBRa-TVKMrjG8mMwjcxYluFXprPIXoI2Q',
  authDomain: 'ganga-aarti-booking.firebaseapp.com',
  projectId: 'ganga-aarti-booking',
  storageBucket: 'ganga-aarti-booking.firebasestorage.app',
  messagingSenderId: '449895335870',
  appId: '1:449895335870:web:d9fe7c78b3bfa145771bef',
}

// Firebase Console → Cloud Messaging → Web Push certificates ki PUBLIC key.
export const FIREBASE_WEB_PUSH_VAPID_KEY = 'BGJRPbQtl0bPKIysgKKuv5296PjvW-ysJSu3AAY8qCNzWi0xwIGmpwamFhri_fYxWTY3MPzONDTsCwhkhfvdWH8'

export function isFirebaseConfigured() {
  return Object.values(FIREBASE_CONFIG).every((v) => v && v !== 'REPLACE_ME')
    && !!FIREBASE_WEB_PUSH_VAPID_KEY && FIREBASE_WEB_PUSH_VAPID_KEY !== 'REPLACE_ME'
}

let messagingPromise = null

// Lazy messaging instance — unsupported browser par null.
export async function getFirebaseMessaging() {
  if (messagingPromise) return messagingPromise
  messagingPromise = (async () => {
    try {
      const [{ initializeApp }, messagingMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging'),
      ])
      if (!(await messagingMod.isSupported())) return null
      const app = initializeApp(FIREBASE_CONFIG)
      return messagingMod.getMessaging(app)
    } catch { return null }
  })()
  return messagingPromise
}

// firebase-messaging-sw.js ko uske apne scope par register karo — main PWA
// SW ('/sw.js', scope '/') se takraav nahi hota.
export async function registerMessagingServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope')
    if (existing) return existing
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' })
  } catch { return null }
}
