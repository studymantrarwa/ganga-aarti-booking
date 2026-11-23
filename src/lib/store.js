// ─────────────────────────────────────────────────────────────────────────────
// Data layer for Ganga Aarti Booking.
//
// Two modes, same async API:
//  • DEMO MODE (default, no env vars): everything is stored in localStorage
//    and seeded with demo partners / products so the site works out of the box.
//  • SUPABASE MODE (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set): auth via
//    Supabase Auth, data in the tables defined in supabase/schema.sql.
//
// Rule carried over from the companion app: the FIRST account registered
// through the sign-up form becomes ADMIN.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase, isSupabaseMode } from './supabase'
import { CATEGORIES } from '../data/catalog'

export { isSupabaseMode }

const DB_KEY = 'gab_db_v1'
const SESSION_KEY = 'gab_session_v1'
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const now = () => new Date().toISOString()

// ── Seed data (demo mode) ────────────────────────────────────────────────────
function seedDB() {
  const partners = [
    { id: 'p-kashi-aarti', name: 'Kashi Aarti Samiti', email: 'partner@demo.in', password: 'demo123', role: 'partner', phone: '+91 94150 00001', city: 'Varanasi', businessName: 'Kashi Aarti Samiti', isSeed: true, createdAt: now() },
    { id: 'p-sharma-events', name: 'Sharma Wedding Events', email: 'sharma@demo.in', password: 'demo123', role: 'partner', phone: '+91 94150 00002', city: 'Varanasi', businessName: 'Sharma Wedding Events', isSeed: true, createdAt: now() },
    { id: 'p-banaras-rides', name: 'Banaras Rides & Decor', email: 'rides@demo.in', password: 'demo123', role: 'partner', phone: '+91 94150 00003', city: 'Lucknow', businessName: 'Banaras Rides & Decor', isSeed: true, createdAt: now() },
  ]
  const demoUser = { id: 'u-demo', name: 'Demo Grahak', email: 'user@demo.in', password: 'demo123', role: 'user', phone: '+91 90000 11111', city: 'Varanasi', businessName: '', isSeed: true, createdAt: now() }
  const P = (partnerId, partnerName, category, title, price, unit, city, description, image) => ({
    id: 'prod-' + uid(), partnerId, partnerName, category, title, price, unit, city, description, image: image || '', active: true, createdAt: now(),
  })
  const products = [
    P('p-kashi-aarti', 'Kashi Aarti Samiti', 'ganga-aarti', 'Family Ganga Aarti — Venue Par', 21000, 'per event', 'Varanasi', '7 purohiton dwara bhavya Ganga Aarti aapke wedding venue par. Sankalp, shankhnaad aur prasad sahit.', '/images/hero-aarti.jpg'),
    P('p-kashi-aarti', 'Kashi Aarti Samiti', 'ganga-aarti', 'Shubh Aarti Ceremony — Budget Package', 11000, 'per event', 'Varanasi', '5 purohit, 30 minute ki divya aarti chhote samaroh ke liye.', '/images/couple-aarti.jpg'),
    P('p-kashi-aarti', 'Kashi Aarti Samiti', 'pandit-ji', 'Sampurn Vivah Sanskar — 2 Pandit Ji', 11000, 'per event', 'Varanasi', 'Haldi se vidaai tak poori vidhi, Hindi mein arth sahit.', '/images/pandit-puja.jpg'),
    P('p-sharma-events', 'Sharma Wedding Events', 'pandit-ji', 'Shubh Vivah Puja — Pandit Ji', 5100, 'per event', 'Lucknow', 'Anubhavi Pandit Ji, Ganesh pujan aur vivah sanskar.', '/images/pandit-puja.jpg'),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'gaadi', 'Innova Crysta — Baraat + Vidaai', 5500, 'per day', 'Varanasi', 'Phoolon se sajji Innova Crysta, driver sahit, 12 ghante.', '/images/wedding-car.jpg'),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'gaadi', 'Swift Dzire — Dulha Gaadi', 2500, 'per day', 'Lucknow', 'Basic sajawat ke saath saaf-suthri sedan.', '/images/wedding-car.jpg'),
    P('p-sharma-events', 'Sharma Wedding Events', 'tent-decoration', 'Royal Mandap + Stage Package', 45000, 'per event', 'Varanasi', 'Mandap, jaimala stage, phool sajawat aur LED lighting — 500 mehmaanon tak.', '/images/tent-decor.jpg'),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'tent-decoration', 'Budget Tent Package — Ghar Ki Shaadi', 15000, 'per event', 'Jaunpur', 'Tent, kursi, table aur basic sajawat chhote karyakram ke liye.', '/images/tent-decor.jpg'),
    P('p-sharma-events', 'Sharma Wedding Events', 'dj-sound', 'Sangeet DJ + Dhol Night', 12000, 'per event', 'Varanasi', 'DJ, powerful sound, LED screen aur baraat dhol.', '/images/dj-setup.jpg'),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'dj-sound', 'Basic DJ Sound Setup', 8000, 'per event', 'Lucknow', 'DJ console, 2 speaker aur wireless mic.', '/images/dj-setup.jpg'),
    P('p-sharma-events', 'Sharma Wedding Events', 'catering', 'Satvik Shakahari Bhoj — Per Plate', 350, 'per plate', 'Varanasi', 'Bina lahsun-pyaaz satvik khana, live chaat counter vikalp.', ''),
    P('p-sharma-events', 'Sharma Wedding Events', 'catering', 'Premium Multi-Cuisine Menu', 650, 'per plate', 'Lucknow', 'North Indian + Chinese + mithaas, trained serving staff.', ''),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'photography', 'Candid + Traditional Photography', 25000, 'per event', 'Varanasi', '2 photographer, cinematic teaser, premium album.', ''),
    P('p-sharma-events', 'Sharma Wedding Events', 'photography', 'Budget Photo-Video Package', 15000, 'per event', 'Prayagraj', 'Traditional photo aur full HD video, pendrive delivery.', ''),
    P('p-kashi-aarti', 'Kashi Aarti Samiti', 'band-baja', 'Brass Band — 12 Kalakar', 11000, 'per event', 'Varanasi', 'Uniform wala brass band, shehnai sahit.', ''),
    P('p-banaras-rides', 'Banaras Rides & Decor', 'band-baja', 'Band + Ghoda Gaadi Combo', 15000, 'per event', 'Varanasi', '8 kalakar band, safed ghoda aur sajji baggi.', ''),
  ]
  const quotations = [
    {
      id: 'q-seed-1', userId: 'u-demo', userName: 'Demo Grahak', category: 'ganga-aarti', productId: null,
      title: 'Ganga Aarti', date: '2026-12-11', city: 'Varanasi', venue: 'Shree Lawn, Lanka', guests: 300,
      notes: 'Beti ki shaadi hai, shaam ko aarti chahiye.', status: 'open', createdAt: now(),
      replies: [
        { id: 'r-seed-1', partnerId: 'p-kashi-aarti', partnerName: 'Kashi Aarti Samiti', price: 21000, message: 'Namaste! Family Ganga Aarti package mein 7 purohit, sankalp aur prasad shamil hai. Date uplabdh hai.', createdAt: now() },
      ],
    },
  ]
  const bookings = [
    { id: 'b-seed-1', userId: 'u-demo', userName: 'Demo Grahak', partnerId: 'p-banaras-rides', partnerName: 'Banaras Rides & Decor', quotationId: null, category: 'gaadi', title: 'Innova Crysta — Baraat + Vidaai', date: '2026-12-11', city: 'Varanasi', venue: 'Shree Lawn, Lanka', guests: 0, amount: 5500, status: 'confirmed', createdAt: now() },
  ]
  return {
    users: [...partners, demoUser],
    products,
    quotations,
    bookings,
    commissions: { defaultPct: 10, byCategory: { 'ganga-aarti': 12 }, byPartner: {} },
    enquiries: [],
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const db = seedDB()
  saveDB(db)
  return db
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)) }
const publicUser = (u) => u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || '', city: u.city || '', businessName: u.businessName || '', createdAt: u.createdAt } : null

// ── Commission helpers (shared by both modes) ────────────────────────────────
export function commissionPct(commissions, category, partnerId) {
  if (!commissions) return 10
  if (partnerId && commissions.byPartner && commissions.byPartner[partnerId] != null) return Number(commissions.byPartner[partnerId])
  if (category && commissions.byCategory && commissions.byCategory[category] != null) return Number(commissions.byCategory[category])
  return Number(commissions.defaultPct ?? 10)
}
export function partnerEarning(booking, commissions) {
  const pct = commissionPct(commissions, booking.category, booking.partnerId)
  const commission = Math.round((Number(booking.amount) * pct) / 100)
  return { pct, commission, earning: Number(booking.amount) - commission }
}

// ═══════════════════════ DEMO MODE IMPLEMENTATION ═══════════════════════════
const demo = {
  async signUp({ name, email, password, role, phone, city, businessName }) {
    const db = loadDB()
    email = email.trim().toLowerCase()
    if (db.users.some((u) => u.email === email)) throw new Error('Is email se pehle se account hai. Login karein.')
    const hasRealUser = db.users.some((u) => !u.isSeed)
    const finalRole = hasRealUser ? role : 'admin' // first registered account = admin
    const user = { id: 'u-' + uid(), name, email, password, role: finalRole, phone: phone || '', city: city || '', businessName: businessName || '', isSeed: false, createdAt: now() }
    db.users.push(user); saveDB(db)
    localStorage.setItem(SESSION_KEY, user.id)
    return publicUser(user)
  },
  async signIn(email, password) {
    const db = loadDB()
    const user = db.users.find((u) => u.email === email.trim().toLowerCase() && u.password === password)
    if (!user) throw new Error('Email ya password galat hai.')
    localStorage.setItem(SESSION_KEY, user.id)
    return publicUser(user)
  },
  async signOut() { localStorage.removeItem(SESSION_KEY) },
  async currentUser() {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    return publicUser(loadDB().users.find((u) => u.id === id))
  },
  async changePassword(userId, oldPw, newPw) {
    const db = loadDB(); const u = db.users.find((x) => x.id === userId)
    if (!u || u.password !== oldPw) throw new Error('Purana password galat hai.')
    u.password = newPw; saveDB(db); return true
  },
  async updateProfile(userId, patch) {
    const db = loadDB(); const u = db.users.find((x) => x.id === userId)
    if (!u) throw new Error('User nahi mila.')
    Object.assign(u, patch); saveDB(db); return publicUser(u)
  },
  async listUsers() { return loadDB().users.map(publicUser) },

  async listProducts({ category, partnerId, activeOnly } = {}) {
    let rows = [...loadDB().products]
    if (category) rows = rows.filter((p) => p.category === category)
    if (partnerId) rows = rows.filter((p) => p.partnerId === partnerId)
    if (activeOnly) rows = rows.filter((p) => p.active)
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async saveProduct(product, partner) {
    const db = loadDB()
    if (product.id) {
      const i = db.products.findIndex((p) => p.id === product.id)
      if (i >= 0) db.products[i] = { ...db.products[i], ...product }
    } else {
      db.products.unshift({ ...product, id: 'prod-' + uid(), partnerId: partner.id, partnerName: partner.businessName || partner.name, active: true, createdAt: now() })
    }
    saveDB(db); return true
  },
  async deleteProduct(id) { const db = loadDB(); db.products = db.products.filter((p) => p.id !== id); saveDB(db); return true },

  async createQuotation(q, user) {
    const db = loadDB()
    const row = { ...q, id: 'q-' + uid(), userId: user.id, userName: user.name, status: 'open', replies: [], createdAt: now() }
    db.quotations.unshift(row); saveDB(db); return row
  },
  async listQuotations({ userId, partnerCategories, all } = {}) {
    let rows = [...loadDB().quotations]
    if (userId) rows = rows.filter((q) => q.userId === userId)
    if (partnerCategories) rows = rows.filter((q) => partnerCategories.includes(q.category))
    if (!all && !userId && !partnerCategories) rows = []
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async replyQuotation(quotationId, partner, price, message) {
    const db = loadDB(); const q = db.quotations.find((x) => x.id === quotationId)
    if (!q) throw new Error('Quotation nahi mila.')
    q.replies = q.replies.filter((r) => r.partnerId !== partner.id)
    q.replies.push({ id: 'r-' + uid(), partnerId: partner.id, partnerName: partner.businessName || partner.name, price: Number(price), message, createdAt: now() })
    saveDB(db); return true
  },
  async acceptReply(quotationId, replyId, user) {
    const db = loadDB(); const q = db.quotations.find((x) => x.id === quotationId)
    if (!q || q.userId !== user.id) throw new Error('Quotation nahi mila.')
    const reply = q.replies.find((r) => r.id === replyId)
    if (!reply) throw new Error('Reply nahi mila.')
    q.status = 'accepted'
    const cat = CATEGORIES.find((c) => c.slug === q.category)
    const booking = {
      id: 'b-' + uid(), userId: user.id, userName: user.name, partnerId: reply.partnerId, partnerName: reply.partnerName,
      quotationId: q.id, category: q.category, title: q.title || (cat ? cat.name : q.category),
      date: q.date, city: q.city, venue: q.venue, guests: q.guests, amount: reply.price, status: 'pending', createdAt: now(),
    }
    db.bookings.unshift(booking); saveDB(db); return booking
  },
  async createBooking(b, user) {
    const db = loadDB()
    const booking = { ...b, id: 'b-' + uid(), userId: user.id, userName: user.name, status: 'pending', createdAt: now() }
    db.bookings.unshift(booking); saveDB(db); return booking
  },
  async listBookings({ userId, partnerId, all } = {}) {
    let rows = [...loadDB().bookings]
    if (userId) rows = rows.filter((b) => b.userId === userId)
    if (partnerId) rows = rows.filter((b) => b.partnerId === partnerId)
    if (!all && !userId && !partnerId) rows = []
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async setBookingStatus(id, status) {
    const db = loadDB(); const b = db.bookings.find((x) => x.id === id)
    if (b) { b.status = status; saveDB(db) }
    return true
  },
  async getCommissions() { return loadDB().commissions },
  async setCommission(scope, key, pct) {
    const db = loadDB()
    if (scope === 'default') db.commissions.defaultPct = Number(pct)
    else if (scope === 'category') db.commissions.byCategory[key] = Number(pct)
    else if (scope === 'partner') db.commissions.byPartner[key] = Number(pct)
    saveDB(db); return db.commissions
  },
  async addEnquiry(e) { const db = loadDB(); db.enquiries.unshift({ ...e, id: uid(), createdAt: now() }); saveDB(db); return true },
}

// ═════════════════════ SUPABASE MODE IMPLEMENTATION ═════════════════════════
// Tables (see supabase/schema.sql): profiles, products, quotations,
// quotation_replies, bookings, commission_settings.
const sb = {
  async profile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data ? { id: data.id, name: data.name, email: data.email, role: data.role, phone: data.phone || '', city: data.city || '', businessName: data.business_name || '', createdAt: data.created_at } : null
  },
  async signUp({ name, email, password, role, phone, city, businessName }) {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
    const finalRole = count === 0 ? 'admin' : role
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Account ban gaya hai — email confirm karke login karein.')
    const { error: e2 } = await supabase.from('profiles').insert({ id: data.user.id, name, email, role: finalRole, phone, city, business_name: businessName })
    if (e2) throw e2
    return sb.profile(data.user.id)
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Email ya password galat hai.')
    return sb.profile(data.user.id)
  },
  async signOut() { await supabase.auth.signOut() },
  async currentUser() {
    const { data } = await supabase.auth.getUser()
    return data.user ? sb.profile(data.user.id) : null
  },
  async changePassword(_userId, _oldPw, newPw) {
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) throw error
    return true
  },
  async updateProfile(userId, patch) {
    const { error } = await supabase.from('profiles').update({ name: patch.name, phone: patch.phone, city: patch.city, business_name: patch.businessName }).eq('id', userId)
    if (error) throw error
    return sb.profile(userId)
  },
  async listUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    return (data || []).map((d) => ({ id: d.id, name: d.name, email: d.email, role: d.role, phone: d.phone || '', city: d.city || '', businessName: d.business_name || '', createdAt: d.created_at }))
  },
  async listProducts({ category, partnerId, activeOnly } = {}) {
    let q = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (category) q = q.eq('category', category)
    if (partnerId) q = q.eq('partner_id', partnerId)
    if (activeOnly) q = q.eq('active', true)
    const { data } = await q
    return (data || []).map((d) => ({ id: d.id, partnerId: d.partner_id, partnerName: d.partner_name, category: d.category, title: d.title, price: d.price, unit: d.unit, city: d.city, description: d.description, image: d.image || '', active: d.active, createdAt: d.created_at }))
  },
  async saveProduct(product, partner) {
    const row = { partner_id: partner.id, partner_name: partner.businessName || partner.name, category: product.category, title: product.title, price: Number(product.price), unit: product.unit, city: product.city, description: product.description, image: product.image || '' }
    if (product.id) { const { error } = await supabase.from('products').update(row).eq('id', product.id); if (error) throw error }
    else { const { error } = await supabase.from('products').insert(row); if (error) throw error }
    return true
  },
  async deleteProduct(id) { await supabase.from('products').delete().eq('id', id); return true },
  async createQuotation(q, user) {
    const { data, error } = await supabase.from('quotations').insert({ user_id: user.id, user_name: user.name, category: q.category, product_id: q.productId || null, title: q.title, date: q.date, city: q.city, venue: q.venue, guests: q.guests, notes: q.notes }).select().single()
    if (error) throw error
    return { ...q, id: data.id, userId: user.id, userName: user.name, status: data.status, replies: [], createdAt: data.created_at }
  },
  async listQuotations({ userId, partnerCategories, all } = {}) {
    let q = supabase.from('quotations').select('*, quotation_replies(*)').order('created_at', { ascending: false })
    if (userId) q = q.eq('user_id', userId)
    if (partnerCategories) q = q.in('category', partnerCategories)
    if (!all && !userId && !partnerCategories) return []
    const { data } = await q
    return (data || []).map((d) => ({
      id: d.id, userId: d.user_id, userName: d.user_name, category: d.category, productId: d.product_id, title: d.title,
      date: d.date, city: d.city, venue: d.venue, guests: d.guests, notes: d.notes, status: d.status, createdAt: d.created_at,
      replies: (d.quotation_replies || []).map((r) => ({ id: r.id, partnerId: r.partner_id, partnerName: r.partner_name, price: r.price, message: r.message, createdAt: r.created_at })),
    }))
  },
  async replyQuotation(quotationId, partner, price, message) {
    await supabase.from('quotation_replies').delete().eq('quotation_id', quotationId).eq('partner_id', partner.id)
    const { error } = await supabase.from('quotation_replies').insert({ quotation_id: quotationId, partner_id: partner.id, partner_name: partner.businessName || partner.name, price: Number(price), message })
    if (error) throw error
    return true
  },
  async acceptReply(quotationId, replyId, user) {
    const rows = await sb.listQuotations({ userId: user.id })
    const q = rows.find((x) => x.id === quotationId)
    if (!q) throw new Error('Quotation nahi mila.')
    const reply = q.replies.find((r) => r.id === replyId)
    if (!reply) throw new Error('Reply nahi mila.')
    await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quotationId)
    const cat = CATEGORIES.find((c) => c.slug === q.category)
    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id, user_name: user.name, partner_id: reply.partnerId, partner_name: reply.partnerName,
      quotation_id: q.id, category: q.category, title: q.title || (cat ? cat.name : q.category),
      date: q.date, city: q.city, venue: q.venue, guests: q.guests, amount: reply.price,
    }).select().single()
    if (error) throw error
    return { id: data.id, amount: reply.price, status: data.status }
  },
  async createBooking(b, user) {
    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id, user_name: user.name, partner_id: b.partnerId, partner_name: b.partnerName,
      category: b.category, title: b.title, date: b.date, city: b.city, venue: b.venue, guests: b.guests, amount: b.amount,
    }).select().single()
    if (error) throw error
    return data
  },
  async listBookings({ userId, partnerId, all } = {}) {
    let q = supabase.from('bookings').select('*').order('created_at', { ascending: false })
    if (userId) q = q.eq('user_id', userId)
    if (partnerId) q = q.eq('partner_id', partnerId)
    if (!all && !userId && !partnerId) return []
    const { data } = await q
    return (data || []).map((d) => ({ id: d.id, userId: d.user_id, userName: d.user_name, partnerId: d.partner_id, partnerName: d.partner_name, quotationId: d.quotation_id, category: d.category, title: d.title, date: d.date, city: d.city, venue: d.venue, guests: d.guests, amount: d.amount, status: d.status, createdAt: d.created_at }))
  },
  async setBookingStatus(id, status) { await supabase.from('bookings').update({ status }).eq('id', id); return true },
  async getCommissions() {
    const { data } = await supabase.from('commission_settings').select('*')
    const out = { defaultPct: 10, byCategory: {}, byPartner: {} }
    for (const r of data || []) {
      if (r.scope === 'default') out.defaultPct = Number(r.pct)
      else if (r.scope === 'category') out.byCategory[r.key] = Number(r.pct)
      else if (r.scope === 'partner') out.byPartner[r.key] = Number(r.pct)
    }
    return out
  },
  async setCommission(scope, key, pct) {
    await supabase.from('commission_settings').upsert({ scope, key, pct: Number(pct) }, { onConflict: 'scope,key' })
    return sb.getCommissions()
  },
  async addEnquiry(e) { await supabase.from('enquiries').insert(e); return true },
}

export const store = isSupabaseMode ? sb : demo
export const DEMO_LOGINS = [
  { label: 'Partner — Kashi Aarti Samiti', email: 'partner@demo.in', password: 'demo123' },
  { label: 'Partner — Sharma Wedding Events', email: 'sharma@demo.in', password: 'demo123' },
  { label: 'User — Demo Grahak', email: 'user@demo.in', password: 'demo123' },
]
