// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-push — Admin se Firebase (FCM) push notification bhejna.
//
// Suraksha:
//  • Sirf POST. Caller ko apna Supabase login token (Authorization: Bearer)
//    bhejna hota hai — yahan token se pehle user ki pehchan, phir profiles
//    table mein uska role check hota hai.
//  • Broadcast / audience / testOnly: sirf role = 'admin' bhej sakta hai.
//  • Targeted mode ({ toUserId }): admin ke alawa koi bhi LOGGED-IN user
//    bhej sakta hai, LEKIN sirf tab jab bhejne wale aur paane wale ke beech
//    sach mein koi booking ya quotation maujood ho (chat messages aur
//    booking events ke liye — sharesBookingOrQuotation neeche dekhein).
//    Iske bina 403.
//  • Firebase service account ki private key sirf yahan, server env mein
//    rehti hai — client code mein kabhi nahi. Koi secret log nahi hota.
//  • Bhejna FCM HTTP v1 API se hota hai, bina kisi extra package ke —
//    service-account OAuth token node:crypto se JWT sign karke banta hai.
//
// Env (Vercel → Project → Settings → Environment Variables):
//  FIREBASE_PROJECT_ID   — Firebase project id
//  FIREBASE_CLIENT_EMAIL — service account ka email (…@…iam.gserviceaccount.com)
//  FIREBASE_PRIVATE_KEY  — service account ki PEM private key (GUPT —
//                          kabhi code/chat mein mat daalo; "\n" wali
//                          escaped shakal bhi chalegi, apne aap sudhar
//                          jati hai)
//  SUPABASE_URL          — (vaikalpik) default production project URL
//  SUPABASE_ANON_KEY     — ZAROORI (public anon key; admin ke token ke saath
//                          milkar kaam karti hai, service-role key nahi
//                          chahiye)
//
// Body (JSON): { title, body, url,
//                audience: 'all'|'user'|'partner',  (default 'all', admin)
//                testOnly?: boolean,   — sirf admin ke apne devices (admin)
//                toUserId?: string }   — sirf us ek user ke devices; admin
//                bina shart, baaki users sirf booking/quotation saathi ko
// Jawab (JSON): { sent, failed, total } — FCM jin tokens ko UNREGISTERED
// kehta hai woh device_tokens se apne aap saaf ho jate hain.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('node:crypto')

const DEFAULT_SUPABASE_URL = 'https://rdjuwklyixmhbqigfisd.supabase.co'

function send(res, status, obj) {
  res.status(status).json(obj)
}

function b64url(data) {
  return Buffer.from(data).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Service account se FCM OAuth access token — JWT bana kar Google ke token
// endpoint par badla jata hai (scope: firebase.messaging).
async function getFcmAccessToken(clientEmail, privateKeyRaw) {
  const privateKey = String(privateKeyRaw).replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claims}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(privateKey).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const assertion = `${signingInput}.${signature}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error('oauth_failed')
  const data = await res.json()
  if (!data || !data.access_token) throw new Error('oauth_failed')
  return data.access_token
}

// Kya do users ke beech sach mein koi booking ya quotation hai?
// Chat / event notifications ke targeted path ki shart yahi hai — koi bhi
// logged-in user kisi ajnabi ko notification nahi bhej sakta.
// Check teenon raaston se hota hai (REST, caller ke apne token se):
//  1. bookings — dono dishaon mein (a user/b partner ya b user/a partner)
//  2. quotations.partner_id — storefront/direct quotation mein partner
//     pehle se tay hota hai (dono dishaon mein)
//  3. quotation_replies — partner ne user ke quotation par rate bheja ho
//     (dono dishaon mein: b ne a ke quotation par, ya a ne b ke par)
async function sharesBookingOrQuotation(supabaseUrl, headers, a, b) {
  const rest = async (path) => {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers })
      if (!r.ok) return []
      const data = await r.json()
      return Array.isArray(data) ? data : []
    } catch { return [] }
  }
  const orFilter = encodeURIComponent(`(and(user_id.eq.${a},partner_id.eq.${b}),and(user_id.eq.${b},partner_id.eq.${a}))`)
  const bookings = await rest(`bookings?select=id&or=${orFilter}&limit=1`)
  if (bookings.length) return true
  const directA = await rest(`quotations?select=id&user_id=eq.${encodeURIComponent(a)}&partner_id=eq.${encodeURIComponent(b)}&limit=1`)
  if (directA.length) return true
  const directB = await rest(`quotations?select=id&user_id=eq.${encodeURIComponent(b)}&partner_id=eq.${encodeURIComponent(a)}&limit=1`)
  if (directB.length) return true
  const repliedQuotationIds = async (partnerId) => {
    const rows = await rest(`quotation_replies?select=quotation_id&partner_id=eq.${encodeURIComponent(partnerId)}`)
    return [...new Set(rows.map((r) => r && r.quotation_id).filter(Boolean))]
  }
  const idsFromB = await repliedQuotationIds(b)
  if (idsFromB.length) {
    const qs = await rest(`quotations?select=id&user_id=eq.${encodeURIComponent(a)}&id=in.(${idsFromB.join(',')})&limit=1`)
    if (qs.length) return true
  }
  const idsFromA = await repliedQuotationIds(a)
  if (idsFromA.length) {
    const qs = await rest(`quotations?select=id&user_id=eq.${encodeURIComponent(b)}&id=in.(${idsFromA.join(',')})&limit=1`)
    if (qs.length) return true
  }
  return false
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Sirf POST request chalegi.' })

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '')
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!projectId || !clientEmail || !privateKey) return send(res, 500, { error: 'Server par Firebase settings set nahi hain — Vercel env mein FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL aur FIREBASE_PRIVATE_KEY daalein.' })
  if (!anonKey) return send(res, 500, { error: 'Server par SUPABASE_ANON_KEY set nahi hai — Vercel env mein daalein.' })

  const authHeader = String(req.headers.authorization || '')
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return send(res, 401, { error: 'Login token nahi mila — dobara login karke koshish karein.' })

  const sbHeaders = { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // ── Caller ki pehchan + role ──
  let callerId = null
  let callerRole = ''
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: sbHeaders })
    if (!userRes.ok) return send(res, 401, { error: 'Session sahi nahi hai — dobara login karein.' })
    const authUser = await userRes.json()
    callerId = authUser && authUser.id
    if (!callerId) return send(res, 401, { error: 'Session sahi nahi hai — dobara login karein.' })
    const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(callerId)}&select=role`, { headers: sbHeaders })
    const profs = profRes.ok ? await profRes.json() : []
    callerRole = (Array.isArray(profs) && profs.length && profs[0].role) || ''
  } catch {
    return send(res, 502, { error: 'Supabase se sampark nahi ho paya — thodi der baad dobara koshish karein.' })
  }
  const isAdmin = callerRole === 'admin'

  // ── Body ──
  let payload = req.body
  if (typeof payload === 'string') { try { payload = JSON.parse(payload) } catch { payload = {} } }
  payload = payload || {}
  const title = String(payload.title || '').trim()
  const body = String(payload.body || '').trim()
  const url = String(payload.url || '/').trim() || '/'
  const audience = ['all', 'user', 'partner'].includes(payload.audience) ? payload.audience : 'all'
  const testOnly = payload.testOnly === true
  const toUserId = payload.toUserId ? String(payload.toUserId) : ''
  if (!title || !body) return send(res, 400, { error: 'Title aur message dono zaroori hain.' })

  // ── Adhikaar (kaun, kisko bhej sakta hai) ──
  // Admin: sab kuchh (broadcast / audience / testOnly / kisi ek ko).
  // Baaki logged-in users: SIRF targeted mode, aur sirf usi ko jiske saath
  // booking ya quotation judaa ho (chat + booking events ke liye).
  let participantOnly = false
  if (!isAdmin) {
    if (!toUserId) {
      return send(res, 403, { error: 'Sirf admin hi sabko notification bhej sakta hai.' })
    }
    if (toUserId === callerId) {
      return send(res, 403, { error: 'Apne aap ko notification nahi bhej sakte.' })
    }
    let shared = false
    try {
      shared = await sharesBookingOrQuotation(supabaseUrl, sbHeaders, callerId, toUserId)
    } catch { shared = false }
    if (!shared) {
      return send(res, 403, { error: 'Notification sirf usi ko bhej sakte hain jiske saath aapki booking ya quotation ho.' })
    }
    participantOnly = true
  }

  // ── Target device tokens ──
  let rows = []
  try {
    const fetchTokens = async (query) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/device_tokens?select=token,user_id&${query}`, { headers: sbHeaders })
      return r.ok ? await r.json() : []
    }
    // Note: gair-admin (participant) path yahan hamesha pehle branch mein
    // aata hai — uske paas toUserId tay hai aur adhikaar upar check ho
    // chuka hai; audience/testOnly us par laagu nahi hote.
    if (toUserId) {
      rows = await fetchTokens(`user_id=eq.${encodeURIComponent(toUserId)}`)
    } else if (testOnly) {
      rows = await fetchTokens(`user_id=eq.${encodeURIComponent(callerId)}`)
    } else if (audience === 'all') {
      rows = await fetchTokens('')
    } else {
      // user / partner — pehle us role ke profile ids, phir unke tokens.
      const pr = await fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.${audience}&select=id`, { headers: sbHeaders })
      const profs = pr.ok ? await pr.json() : []
      const ids = new Set((profs || []).map((p) => p.id))
      if (ids.size) {
        const all = await fetchTokens('user_id=not.is.null')
        rows = (all || []).filter((r) => ids.has(r.user_id))
      }
    }
  } catch {
    return send(res, 502, { error: 'Device tokens padhne mein dikkat aayi — dobara koshish karein.' })
  }
  rows = Array.isArray(rows) ? rows.filter((r) => r && r.token) : []
  const tokens = [...new Set(rows.map((r) => r.token))]

  // ── FCM access token ──
  let accessToken = ''
  try {
    accessToken = await getFcmAccessToken(clientEmail, privateKey)
  } catch {
    return send(res, 500, { error: 'Firebase se sampark nahi ho paya — server ki service-account settings check karein.' })
  }

  // ── Bhejo (har token par alag message) ──
  let sent = 0
  let failed = 0
  const dead = []
  await Promise.all(tokens.map(async (deviceToken) => {
    try {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title, body },
            webpush: {
              notification: { icon: '/icons/icon-192.png' },
              fcmOptions: { link: url },
            },
            data: { url },
          },
        }),
      })
      if (r.ok) { sent += 1; return }
      failed += 1
      const errBody = await r.json().catch(() => null)
      const err = (errBody && errBody.error) || {}
      const detailCode = Array.isArray(err.details)
        ? (err.details.find((d) => d && d.errorCode) || {}).errorCode
        : ''
      if (err.status === 'UNREGISTERED' || detailCode === 'UNREGISTERED') dead.push(deviceToken)
    } catch {
      failed += 1
    }
  }))
  // Dead tokens saaf karo (app uninstall / browser reset ho chuka hai).
  for (const deadToken of dead) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/device_tokens?token=eq.${encodeURIComponent(deadToken)}`, { method: 'DELETE', headers: sbHeaders })
    } catch { /* ignore */ }
  }
  return send(res, 200, { sent, failed, total: tokens.length })
}
