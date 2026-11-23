/* ──────────────────────────────────────────────────────────────────────────
   Ganga Aarti Booking — Firebase Cloud Messaging service worker.
   Ye file PWA wale /sw.js se ALAG hai: iska kaam sirf FCM notifications
   dikhana hai jab page band / background mein ho. Registration scope
   '/firebase-cloud-messaging-push-scope' hai, isliye ye main SW se
   takrati nahi.

   ⚠️ PARENT NOTE: neeche ke firebaseConfig values PLACEHOLDER hain.
   Firebase Console → Project settings → "Your apps" (Web app) se asal
   values lekar yahan bharein — src/lib/firebase.js ki config se bilkul
   ek jaise hone chahiye. Tab tak background notifications nahi aayenge.
   ────────────────────────────────────────────────────────────────────────── */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN / FIREBASE_PROJECT_ID /
// FIREBASE_STORAGE_BUCKET / FIREBASE_MESSAGING_SENDER_ID / FIREBASE_APP_ID
// — sab ke asal values Firebase Console se yahan daalein ("REPLACE_ME").
const firebaseConfig = {
  apiKey: 'AIzaSyBBRa-TVKMrjG8mMwjcxYluFXprPIXoI2Q',
  authDomain: 'ganga-aarti-booking.firebaseapp.com',
  projectId: 'ganga-aarti-booking',
  storageBucket: 'ganga-aarti-booking.firebasestorage.app',
  messagingSenderId: '449895335870',
  appId: '1:449895335870:web:d9fe7c78b3bfa145771bef',
}

try {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  // Background message — notification yahan se dikhta hai. Payload
  // /api/send-push se aata hai: { notification: {title, body},
  // data: { url }, webpush.fcmOptions.link }.
  messaging.onBackgroundMessage((payload) => {
    const notif = (payload && payload.notification) || {}
    const data = (payload && payload.data) || {}
    const title = notif.title || '🪔 Ganga Aarti Booking'
    const url = data.url || (payload && payload.fcmOptions && payload.fcmOptions.link) || '/'
    const options = {
      body: notif.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [80, 40, 80],
      data: { url },
    }
    return self.registration.showNotification(title, options)
  })
} catch (e) {
  // Config placeholder ho to SW chup chaap rehta hai — site ka baaki kaam
  // (main /sw.js) isse bilkul alag hai aur chalta rehta hai.
}

// Notification par tap → data.url wala page (khula tab ho to focus, warna naya).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  const targetUrl = new URL(target, self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url === targetUrl && 'focus' in client) return client.focus()
    }
    for (const client of windows) {
      try {
        if (new URL(client.url).origin !== self.location.origin || !('focus' in client)) continue
        await client.focus()
        if ('navigate' in client) { try { await client.navigate(targetUrl) } catch { /* ignore */ } }
        return undefined
      } catch { /* ignore */ }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    return undefined
  })())
})
