import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChatBox from '../components/ChatBox'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, SITE, categoryBySlug, inr } from '../data/catalog'
import { BOOKING_STATUS_HI, REFERRAL_PCT, bookingThreadKey, commissionPct, isSupabaseMode, partnerEarning, quotationThreadKey, referralActive, referralExpiry, roleMeta, slugify, store } from '../lib/store'
import { NotificationPromptBanner, NotificationToggle, Spinner, effectiveBookingStatus, fmtDate, isPastDate, sortByEventDate, todayStr, useSettings, useToast, validPhone } from '../lib/ui'
import { ProfileForm } from './UserPanel'

// Category/unit jaan-boojh kar KHALI shuru hote hain — pehle pehli category
// apne aap chun jaati thi aur product galat category mein save ho jata tha.
// Ab partner ko khud chunna padega; bina chune save nahi hoga.
const EMPTY = { title: '', category: '', price: '', unit: '', city: 'Varanasi', description: '', image: '', imageUrl: '' }
const PAY_HI = { unpaid: 'Advance baaki', advance_paid: 'Advance mil gaya ✔', paid: 'Poora payment ✔' }

export default function PartnerPanel() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const settings = useSettings()
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [commissions, setCommissions] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [reply, setReply] = useState({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refCode, setRefCode] = useState(user.referralCode || '')
  const [myReferrals, setMyReferrals] = useState([])
  const [refEarnings, setRefEarnings] = useState([])
  const [copied, setCopied] = useState(false)
  // Photo upload
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  // Products filter
  const [prodFilter, setProdFilter] = useState('all')
  // Storefront (Meri Website)
  const [slug, setSlug] = useState(user.slug || '')
  const [slugBusy, setSlugBusy] = useState(false)
  // Roles editor
  const [roles, setRoles] = useState(user.roles || [])
  // Manual booking
  const [manual, setManual] = useState({ customerName: '', customerPhone: '', productId: '', title: '', category: (user.roles && user.roles[0]) || 'ganga-aarti', date: '', city: 'Varanasi', venue: '', amount: '' })
  // Reject flow
  const [rejectFor, setRejectFor] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  // Chat (kis card/booking ki chat khuli hai)
  const [openChat, setOpenChat] = useState(null)

  const myRoleCats = useMemo(() => (user.roles && user.roles.length ? CATEGORIES.filter((c) => user.roles.includes(c.slug)) : CATEGORIES), [user.roles])
  const myCategories = useMemo(() => {
    const fromProducts = [...new Set(products.map((p) => p.category))]
    if (fromProducts.length) return fromProducts
    if (user.roles && user.roles.length) return user.roles
    return CATEGORIES.map((c) => c.slug)
  }, [products, user.roles])

  const load = async () => {
    const prods = await store.listProducts({ partnerId: user.id })
    setProducts(prods)
    const cats = [...new Set(prods.map((p) => p.category))]
    const fallbackCats = user.roles && user.roles.length ? user.roles : CATEGORIES.map((c) => c.slug)
    setQuotations(await store.listQuotations({ partnerCategories: cats.length ? cats : fallbackCats }))
    setBookings(await store.listBookings({ partnerId: user.id }))
    setCommissions(await store.getCommissions())
    const me = await store.ensureReferralCode(user).catch(() => user)
    if (me && me.referralCode) setRefCode(me.referralCode)
    const me2 = await store.ensureSlug(me || user).catch(() => me || user)
    if (me2 && me2.slug) setSlug(me2.slug)
    const allUsers = await store.listUsers().catch(() => [])
    setMyReferrals(allUsers.filter((u) => u.role === 'partner' && u.referredBy === user.id))
    setRefEarnings(await store.listReferralEarnings({ referrerId: user.id }))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const meta = roleMeta(form.category)
  const setCategory = (slugCat) => {
    const m = roleMeta(slugCat)
    setForm((f) => ({ ...f, category: slugCat, unit: m.units[0] || f.unit }))
  }

  const onPhoto = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!isSupabaseMode) {
      // Demo mode: file sirf preview ke liye — save sirf URL field se hota hai.
      setPhotoPreview(URL.createObjectURL(file))
      toast('Demo mode mein photo upload nahi hota — neeche Image URL daalein, wahi save hoga.', 'err')
      return
    }
    setPhotoBusy(true)
    try {
      const url = await store.uploadProductImage(file, user)
      setForm((f) => ({ ...f, imageUrl: url, image: url }))
      setPhotoPreview(url)
      toast('Photo upload ho gayi ✔')
    } catch { toast('Photo upload nahi ho payi — Image URL wala tareeka try karein.', 'err') }
    setPhotoBusy(false)
  }

  const saveProduct = async (e) => {
    e.preventDefault()
    setErr(''); setMsg('')
    const price = Number(form.price)
    if (!form.category) { setErr('⚠️ Pehle category chunein — bina category ke product save nahi hoga.'); return }
    if (!form.unit) { setErr('⚠️ Unit chunein — jaise per event, per day (category chunte hi sahi unit apne aap aa jata hai).'); return }
    if (!form.title.trim()) { setErr('Product ka title bharein.'); return }
    if (!price || price <= 0) { setErr('⚠️ Price ₹0 se zyada hona chahiye — yahi rate customers ko dikhega.'); return }
    setBusy(true)
    try {
      await store.saveProduct({ ...form, price, id: editing || undefined }, user)
      setForm(EMPTY); setEditing(null); setPhotoPreview('')
      setMsg('Product save ho gaya ✔'); toast('Product save ho gaya ✔'); load()
    } catch (ex) { setErr(ex.message) }
    setBusy(false)
  }
  const edit = (p) => { setForm({ title: p.title, category: p.category, price: p.price, unit: p.unit, city: p.city, description: p.description, image: p.image || '', imageUrl: p.imageUrl || '' }); setPhotoPreview(p.imageUrl || p.image || ''); setEditing(p.id); setTab('products'); setErr('') }
  const del = async (p) => { if (confirm(`"${p.title}" delete karein?`)) { await store.deleteProduct(p.id); toast('Product delete ho gaya.'); load() } }
  const sendReply = async (q) => {
    const r = reply[q.id]
    if (!r?.price || Number(r.price) <= 0) { setErr('⚠️ Quotation ke liye sahi rate (₹0 se zyada) bharein.'); return }
    setErr(''); setBusy(true)
    try { await store.replyQuotation(q.id, user, r.price, r.message || ''); setMsg('Quotation bhej diya ✔'); toast('Quotation bhej diya ✔'); load() }
    catch (ex) { setErr(ex.message) }
    setBusy(false)
  }

  const respond = async (b, accept) => {
    setBusy(true)
    try {
      await store.respondToBooking(b.id, accept, accept ? '' : rejectReason)
      toast(accept ? 'Booking Accept ✔ — ab grahak Final Confirm karega' : 'Booking reject ho gayi')
      setRejectFor(null); setRejectReason('')
      load()
    } catch (ex) { toast(ex.message || 'Ho nahi paya.', 'err') }
    setBusy(false)
  }

  const saveManual = async (e) => {
    e.preventDefault()
    const amount = Number(manual.amount)
    if (!manual.customerName.trim()) { toast('Grahak ka naam bharein.', 'err'); return }
    if (manual.customerPhone.trim() && !validPhone(manual.customerPhone)) { toast('⚠️ Grahak ka sahi 10-ank ka mobile number bharein.', 'err'); return }
    if (!manual.title.trim()) { toast('Seva / product ka naam bharein.', 'err'); return }
    if (!manual.date || isPastDate(manual.date)) { toast('⚠️ Sahi date chunein — karyakram ki date aaj ya aage ki honi chahiye.', 'err'); return }
    if (!amount || amount <= 0) { toast('Sahi kul rakam (₹0 se zyada) bharein.', 'err'); return }
    setBusy(true)
    try {
      await store.createManualBooking({ ...manual, amount }, user)
      toast(`Manual booking ban gayi ✔ — ispar sirf ${inr(Number(settings.manual_booking_commission) || 50)} flat commission lagega`)
      setManual({ customerName: '', customerPhone: '', productId: '', title: '', category: manual.category, date: '', city: 'Varanasi', venue: '', amount: '' })
      load()
    } catch (ex) { toast(ex.message || 'Booking nahi ban payi.', 'err') }
    setBusy(false)
  }
  const pickManualProduct = (pid) => {
    const p = products.find((x) => x.id === pid)
    if (p) setManual((m) => ({ ...m, productId: pid, title: p.title, category: p.category, amount: String(p.price) }))
    else setManual((m) => ({ ...m, productId: '' }))
  }

  const saveSlug = async () => {
    const clean = slugify(slug)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(clean)) { toast('Website naam sirf chhote akshar, number aur hyphen mein ho — jaise: kashi-events', 'err'); return }
    setSlugBusy(true)
    try {
      await store.updateProfile(user.id, { name: user.name, phone: user.phone, city: user.city, businessName: user.businessName, slug: clean })
      setSlug(clean)
      await refresh()
      toast('Aapki website ka naam save ho gaya ✔')
    } catch (ex) { toast(ex.message || 'Save nahi ho paya.', 'err') }
    setSlugBusy(false)
  }
  const saveRoles = async () => {
    setBusy(true)
    try {
      await store.updateProfile(user.id, { name: user.name, phone: user.phone, city: user.city, businessName: user.businessName, roles })
      await refresh()
      toast('Aapki sevayein update ho gayi ✔')
      load()
    } catch (ex) { toast(ex.message || 'Save nahi ho paya.', 'err') }
    setBusy(false)
  }

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
  const gross = activeBookings.reduce((s, b) => s + Number(b.amount), 0)
  const net = commissions ? activeBookings.reduce((s, b) => s + partnerEarning(b, commissions).earning, 0) : 0
  const commissionPaid = gross - net
  const myPct = (category) => commissionPct(commissions, category, user.id)
  const netOf = (amount, category) => { const pct = myPct(category); return { pct, net: Number(amount) - Math.round((Number(amount) * pct) / 100) } }
  const refLink = refCode ? `${SITE.origin}/signup?ref=${refCode}` : ''
  const refTotal = refEarnings.reduce((s, r) => s + Number(r.amount), 0)
  const storefrontLink = slug ? `${SITE.origin}/p/${slug}` : ''
  const sfBookings = bookings.filter((b) => b.source === 'storefront')
  const sfQuotes = quotations.filter((q) => q.source === 'storefront' && q.partnerId === user.id)
  const sfShareText = encodeURIComponent(`Namaste! Meri wedding services dekhiye — ${(user.roles || []).map((r) => categoryBySlug(r)?.name || r).join(', ') || 'Ganga Aarti, Pandit Ji, Tent, DJ'}. Meri apni website: ${storefrontLink}`)
  const copyText = async (text, label) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2200); toast(`${label} copy ho gaya ✔`) }
    catch { setErr('Copy nahi ho paya — link ko select karke khud copy kar lein.') }
  }
  const productCatsPresent = [...new Set(products.map((p) => p.category))]
  const orderedProdCats = [...(user.roles || []).filter((r) => productCatsPresent.includes(r)), ...CATEGORIES.map((c) => c.slug).filter((s) => productCatsPresent.includes(s) && !(user.roles || []).includes(s))]

  return (
    <>
      <Seo title="Partner Panel | Ganga Aarti Booking" description="Partner panel — apne wedding products add karein, quotation bhejein, bookings, manual booking, apni storefront website aur kamai (commission ke baad) dekhein." path="/partner" />
      <section className="section wrap">
        <h2>🏪 Partner Panel — {user.businessName || user.name}</h2>
        <NotificationPromptBanner />
        {(user.roles || []).length > 0 && <p className="hint" style={{ marginTop: -6 }}>Aapki sevayein: {(user.roles || []).map((r) => `${categoryBySlug(r)?.icon || ''} ${categoryBySlug(r)?.name || r}`).join(' · ')}</p>}
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="err">{err}</div>}
        <div className="stat-grid">
          <div className="stat"><b>{products.length}</b><span>Mere Products</span></div>
          <div className="stat"><b>{quotations.filter((q) => q.status === 'open').length}</b><span>Khule Quotation Requests</span></div>
          <div className="stat"><b>{bookings.length}</b><span>Total Bookings</span></div>
          <div className="stat"><b>{bookings.filter((b) => b.status === 'pending_partner').length}</b><span>Mere Jawab Ka Intezaar</span></div>
          <div className="stat"><b>{inr(gross)}</b><span>Kul Booking Value</span></div>
          <div className="stat"><b>{inr(net)}</b><span>Meri Kamai (commission ke baad)</span></div>
          <div className="stat"><b>{inr(commissionPaid)}</b><span>Platform Commission</span></div>
          <div className="stat"><b>{inr(refTotal)}</b><span>Referral Kamai ({REFERRAL_PCT}%)</span></div>
        </div>
        <div className="panel">
          <aside className="side">
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Mere Products</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>Quotation Requests</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Bookings Aur Kamai</button>
            <button className={tab === 'manual' ? 'active' : ''} onClick={() => setTab('manual')}>Manual Booking</button>
            <button className={tab === 'website' ? 'active' : ''} onClick={() => setTab('website')}>Meri Website</button>
            <button className={tab === 'referrals' ? 'active' : ''} onClick={() => setTab('referrals')}>Referrals ({myReferrals.length})</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile Aur Sevayein</button>
            <Link className="side-shop" to="/services#marketplace">Products Dekhein — Shop</Link>
            <div className="push-toggle-wrap"><NotificationToggle userId={user.id} className="btn btn-ghost btn-sm" /></div>
          </aside>
          <div>
            {loading ? <Spinner /> : (<>

            {tab === 'products' && (
              <>
                <form className="form-card wide" style={{ margin: '0 0 20px' }} onSubmit={saveProduct}>
                  <h3>{editing ? `✏️ ${meta.productLabel} Edit Karein` : `➕ Naya ${meta.productLabel} Add Karein`}</h3>
                  <label>Category (Aapki Sevayein)</label>
                  <select value={form.category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="" disabled>— Category Chunein —</option>
                    {myRoleCats.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                  </select>
                  {(user.roles || []).length === 0 && <p className="hint" style={{ margin: '4px 0 0' }}>ℹ️ Aapne abhi apni sevayein nahi chuni hain — Profile tab se chun lein, form aapke hisaab se dhal jayega.</p>}
                  <label>{meta.productLabel} Ka Naam</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={meta.hint} />
                  <div className="form-row">
                    <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
                    <div><label>Unit</label>
                      <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                        <option value="" disabled>— Unit Chunein —</option>
                        {[...new Set([...meta.units, 'per event', 'per day', 'per plate', 'per hour', 'per puja', 'per night'])].map((u) => <option key={u}>{u}</option>)}
                      </select></div>
                  </div>
                  <div className="price-field">
                    <label htmlFor="partner-price">💰 {meta.priceLabel} — Yahi Rate Customers Ko Dikhega</label>
                    <div className="price-input">
                      <span aria-hidden="true">₹</span>
                      <input id="partner-price" type="number" min={1} step={1} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Jaise: 21000" />
                    </div>
                    <p className="hint" style={{ margin: '6px 0 0' }}>Saaf aur sahi rate likhein — customer pehle yahi price dekhkar quotation maangta hai. Price ₹0 se zyada hona chahiye.</p>
                  </div>
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Kya-kya shamil hai, khaasiyat…" />
                  <label>📸 Product Ki Photo</label>
                  <input type="file" accept="image/*" onChange={onPhoto} disabled={photoBusy} />
                  {photoBusy && <p className="hint">Photo upload ho rahi hai…</p>}
                  {(photoPreview || form.imageUrl || form.image) && <div className="ph" style={{ height: 150, marginTop: 8 }}><img src={photoPreview || form.imageUrl || form.image} alt="Product photo preview" /></div>}
                  <label>Ya Image URL Daalein (vaikalpik)</label>
                  <input value={form.imageUrl || form.image} onChange={(e) => setForm({ ...form, imageUrl: e.target.value, image: e.target.value })} placeholder="/images/hero-aarti.jpg ya https://…" />
                  <p className="hint" style={{ margin: '4px 0 0' }}>Photo wale products par grahak zyada bharosa karte hain — apni asal kaam ki photo lagayein.</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button className="btn btn-gold" disabled={busy}>{busy ? 'Save ho raha hai…' : editing ? 'Update Karein' : 'Product Add Karein'}</button>
                    {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); setPhotoPreview('') }}>Cancel</button>}
                  </div>
                </form>

                {products.length > 0 && (
                  <div className="filter-chips">
                    <button className={prodFilter === 'all' ? 'on' : ''} onClick={() => setProdFilter('all')}>Saare ({products.length})</button>
                    {orderedProdCats.map((s) => <button key={s} className={prodFilter === s ? 'on' : ''} onClick={() => setProdFilter(s)}>{categoryBySlug(s)?.icon} {categoryBySlug(s)?.name} ({products.filter((p) => p.category === s).length})</button>)}
                  </div>
                )}
                {products.length === 0 ? (
                  <div className="empty-state">
                    <p>📦 Abhi koi product nahi hai.</p>
                    <p className="hint">Upar wale form se apna pehla {meta.productLabel} add karein — usi category ke quotation requests aapko dikhne lagenge, aur product aapki storefront website par bhi dikhega.</p>
                  </div>
                ) : orderedProdCats.filter((s) => prodFilter === 'all' || prodFilter === s).map((s) => (
                  <div key={s} style={{ marginBottom: 22 }}>
                    <h3>{roleMeta(s).heading}</h3>
                    <div className="grid grid-2">
                      {products.filter((p) => p.category === s).map((p) => (
                        <article className="card" key={p.id}>
                          {(p.imageUrl || p.image) ? <div className="ph"><img src={p.imageUrl || p.image} alt={p.title} loading="lazy" /></div> : <div className="ph">{categoryBySlug(p.category)?.icon}</div>}
                          <div className="body">
                            <span className="badge">{categoryBySlug(p.category)?.name}</span>
                            <h3>{p.title}</h3>
                            <p>{p.description}</p>
                            <p className="price">{inr(p.price)} <small>{p.unit} · 📍 {p.city}</small></p>
                            {commissions && <p className="hint" style={{ margin: 0 }}>💰 Commission {netOf(p.price, p.category).pct}% katne ke baad aapko ≈ <b>{inr(netOf(p.price, p.category).net)}</b> milega</p>}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-maroon btn-sm" onClick={() => edit(p)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => del(p)}>Delete</button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? (
                <div className="empty-state">
                  <p>💬 Abhi koi quotation request nahi hai.</p>
                  <button className="btn btn-gold" onClick={() => setTab('products')}>📦 Pehle Apne Products Add Karein</button>
                </div>
              ) :
              sortByEventDate(quotations).map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 16 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{q.status}</span>{q.partnerId === user.id && q.source === 'storefront' && <span className="badge" style={{ marginLeft: 6 }}>🏪 Meri Website Se Aaya</span>}</h3>
                    <p className="hint">👤 {q.userName} · 📅 {fmtDate(q.date)} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests} mehmaan</p>
                    {q.notes && <p>📝 {q.notes}</p>}
                    {q.replies.map((r) => (
                      <div className="reply-box" key={r.id}><b>{r.partnerName}</b> — {inr(r.price)}
                        {r.partnerId === user.id && commissions && <span className="hint"> · commission {netOf(r.price, q.category).pct}% ke baad aapko ≈ {inr(netOf(r.price, q.category).net)}</span>}
                        <p style={{ margin: '4px 0' }}>{r.message}</p></div>
                    ))}
                    {q.status === 'open' && (
                      <div className="form-row" style={{ marginTop: 10 }}>
                        <input type="number" min={1} placeholder="Aapka rate (₹) — jaise: 21000" value={reply[q.id]?.price || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], price: e.target.value } })} />
                        <input placeholder="Sandesh (kya-kya shamil hai)" value={reply[q.id]?.message || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], message: e.target.value } })} />
                      </div>
                    )}
                    {q.status === 'open' && reply[q.id]?.price && Number(reply[q.id].price) > 0 && commissions && (
                      <p className="hint" style={{ margin: '6px 0 0' }}>💰 Is rate par commission {netOf(reply[q.id].price, q.category).pct}% katne ke baad aapko ≈ <b>{inr(netOf(reply[q.id].price, q.category).net)}</b> milega</p>
                    )}
                    {q.status === 'open' && <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => sendReply(q)}>Quotation Bhejein</button>}
                    {q.replies.some((r) => r.partnerId === user.id) && (
                      <>
                        <div className="chat-toggle-row">
                          <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(openChat === `q:${q.id}` ? null : `q:${q.id}`)}>💬 {q.userName} Se Chat</button>
                        </div>
                        {openChat === `q:${q.id}` && (
                          <ChatBox threadKey={quotationThreadKey(q.id)} quotationId={q.id} otherId={q.userId} otherName={q.userName} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}

            {tab === 'bookings' && (
              <>
              {commissions && (
                <div className="reply-box" style={{ margin: '0 0 16px' }}>
                  <b>💰 Mera Commission — saaf hisaab:</b>{' '}
                  {commissions.byPartner[user.id] != null
                    ? <>Aapke liye khaas <b>partner rate {commissions.byPartner[user.id]}%</b> tay hai — har booking par yahi lagega.</>
                    : <>Aapke liye category ke hisaab se rate lagta hai{myCategories.length ? <> — {myCategories.map((slug) => `${categoryBySlug(slug)?.name || slug}: ${myPct(slug)}%`).join(' · ')}</> : ''} (default {commissions.defaultPct}%).</>}
                  {' '}Manual (offline) booking par % nahi — sirf <b>flat {inr(Number(settings.manual_booking_commission) || 50)}</b> lagta hai.
                </div>
              )}
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <p>📅 Abhi koi booking nahi mili hai.</p>
                  <button className="btn btn-gold" onClick={() => setTab('website')}>🌐 Apni Website Share Karein — Booking Wahi Se Aayegi</button>
                </div>
              ) : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Service</th><th>Grahak</th><th>Date / Jagah</th><th>Rakam</th><th>Commission</th><th>Meri Kamai</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{sortByEventDate(bookings).map((b) => {
                    const e = commissions ? partnerEarning(b, commissions) : { pct: 0, earning: b.amount }
                    return (
                      <Fragment key={b.id}>
                      <tr>
                        <td><b>{b.title}</b>{b.source === 'manual' && <span className="badge" style={{ marginLeft: 6 }}>✍️ Manual</span>}{b.source === 'storefront' && <span className="badge" style={{ marginLeft: 6 }}>🏪 Website</span>}</td><td>{b.userName}</td>
                        <td>{fmtDate(b.date)}<br /><span className="hint">{b.city}{b.venue ? ` — ${b.venue}` : ''}</span></td>
                        <td>{inr(b.amount)}</td><td>{e.flat ? `${inr(e.commission)} flat` : `${e.pct}%`}</td><td><b>{inr(e.earning)}</b></td>
                        <td><span className={`status ${b.paymentStatus === 'unpaid' ? 'pending' : 'confirmed'}`}>{PAY_HI[b.paymentStatus] || b.paymentStatus}</span></td>
                        <td><span className={`status ${effectiveBookingStatus(b)}`}>{BOOKING_STATUS_HI[effectiveBookingStatus(b)] || b.status}</span></td>
                        <td>
                          {b.status === 'pending_partner' && rejectFor !== b.id && (
                            <span style={{ whiteSpace: 'nowrap' }}>
                              <button className="btn btn-green btn-sm" disabled={busy} onClick={() => respond(b, true)}>✔ Accept</button>{' '}
                              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { setRejectFor(b.id); setRejectReason('') }}>✖ Reject</button>
                            </span>
                          )}
                          {b.status === 'pending_partner' && rejectFor === b.id && (
                            <span>
                              <input placeholder="Mana karne ka kaaran (vaikalpik)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ minWidth: 170 }} />
                              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => respond(b, false)}>Pakka Reject</button>{' '}
                              <button className="btn btn-ghost btn-sm" onClick={() => setRejectFor(null)}>Wapas</button>
                            </span>
                          )}
                          {b.status === 'pending_customer' && <span className="hint">Grahak ke Final Confirm ka intezaar</span>}
                          {b.source !== 'manual' && (
                            <div style={{ marginTop: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(openChat === `b:${b.id}` ? null : `b:${b.id}`)}>💬 Chat</button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {openChat === `b:${b.id}` && b.source !== 'manual' && (
                        <tr><td colSpan={9}>
                          <ChatBox threadKey={bookingThreadKey(b.id)} bookingId={b.id} otherId={b.userId} otherName={b.userName} />
                        </td></tr>
                      )}
                      </Fragment>
                    )
                  })}</tbody>
                </table></div>
              )}
              </>
            )}

            {tab === 'manual' && (
              <form className="form-card wide" style={{ margin: 0 }} onSubmit={saveManual}>
                <h3>✍️ Manual Booking — Offline Grahak Ki Entry</h3>
                <p className="hint">Jo booking aapko seedha phone/muh se mili hai, use yahan daal dein — taaki saara hisaab ek jagah rahe. Is booking par % commission <b>nahi</b> lagega, sirf <b>flat {inr(Number(settings.manual_booking_commission) || 50)}</b> platform commission lagega. Booking seedha "Pakki" (confirmed) banti hai.</p>
                <div className="form-row">
                  <div><label>Grahak Ka Naam</label><input required value={manual.customerName} onChange={(e) => setManual({ ...manual, customerName: e.target.value })} placeholder="Jaise: Ramesh Gupta" /></div>
                  <div><label>Grahak Ka Mobile</label><input value={manual.customerPhone} onChange={(e) => setManual({ ...manual, customerPhone: e.target.value })} placeholder="Jaise: 94150 00000" /></div>
                </div>
                <label>Mera Product Chunein (vaikalpik — naam/rate apne aap bhar jayega)</label>
                <select value={manual.productId} onChange={(e) => pickManualProduct(e.target.value)}>
                  <option value="">— Free text likhunga —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.title} — {inr(p.price)}</option>)}
                </select>
                <div className="form-row">
                  <div><label>Seva / Product Ka Naam</label><input required value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} placeholder="Jaise: Family Ganga Aarti" /></div>
                  <div><label>Category</label>
                    <select value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })}>
                      {myRoleCats.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                    </select></div>
                </div>
                <div className="form-row">
                  <div><label>Karyakram Ki Date</label><input type="date" required min={todayStr()} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></div>
                  <div><label>Kul Rakam (₹)</label><input type="number" min={1} required value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} placeholder="Jaise: 21000" /></div>
                </div>
                <div className="form-row">
                  <div><label>Shahar</label><input value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
                  <div><label>Venue / Jagah</label><input value={manual.venue} onChange={(e) => setManual({ ...manual, venue: e.target.value })} placeholder="Jaise: Grahak ka ghar / lawn" /></div>
                </div>
                {manual.amount && Number(manual.amount) > 0 && (
                  <p className="reply-box" style={{ margin: '12px 0 0' }}>💰 Hisaab: Kul {inr(manual.amount)} − flat commission {inr(Number(settings.manual_booking_commission) || 50)} = <b>aapko {inr(Number(manual.amount) - (Number(settings.manual_booking_commission) || 50))}</b></p>
                )}
                <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Ban rahi hai…' : '✍️ Manual Booking Banayein'}</button>
              </form>
            )}

            {tab === 'website' && (
              <div>
                <div className="form-card wide" style={{ margin: '0 0 20px' }}>
                  <h3>🌐 Meri Apni Website (Storefront)</h3>
                  <p className="hint">Ye aapki apni dukaan hai — is link par <b>sirf aapke products</b> dikhte hain. Wahan se aayi har quotation/booking seedha aapko milti hai; platform ko sirf apna commission milta hai, baaki hisaab aapke panel mein. (Note: asli subdomain vercel.app par nahi banta — isliye aapki website isi domain ke /p/naam path par hai.)</p>
                  <label>Aapki Website Ka Link</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input readOnly value={storefrontLink} onFocus={(e) => e.target.select()} style={{ flex: '1 1 260px' }} />
                    <button type="button" className="btn btn-gold" onClick={() => copyText(storefrontLink, 'Website link')}>{copied ? '✔ Copy Ho Gaya' : '📋 Copy Karein'}</button>
                    <a className="btn btn-wa" href={`https://wa.me/?text=${sfShareText}`} target="_blank" rel="noreferrer">💬 WhatsApp Share</a>
                    {slug && <a className="btn btn-ghost" href={`/p/${slug}`} target="_blank" rel="noreferrer">👀 Website Dekhein</a>}
                  </div>
                  <label style={{ marginTop: 16 }}>Website Ka Naam (Slug) Badlein</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ alignSelf: 'center' }} className="hint">{SITE.origin}/p/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="jaise: kashi-events" style={{ flex: '1 1 200px' }} />
                    <button type="button" className="btn btn-maroon" disabled={slugBusy} onClick={saveSlug}>{slugBusy ? 'Save ho raha hai…' : 'Save Karein'}</button>
                  </div>
                  <p className="hint" style={{ margin: '6px 0 0' }}>Sirf chhote akshar, number aur hyphen. Naam badalne par purana link kaam nahi karega.</p>
                </div>
                <div className="stat-grid">
                  <div className="stat"><b>{sfBookings.length}</b><span>Website Se Aayi Bookings</span></div>
                  <div className="stat"><b>{sfQuotes.length}</b><span>Website Se Aayi Quotations</span></div>
                  <div className="stat"><b>{inr(sfBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected').reduce((s, b) => s + Number(b.amount), 0))}</b><span>Website Bookings Ki Value</span></div>
                </div>
                <div className="form-card wide" style={{ margin: 0 }}>
                  <h3>🔗 Mera Referral Link</h3>
                  <p className="hint">Doosre vendors ko is link se jodein — unki har booking par aapko {REFERRAL_PCT}% milega, pure 1 saal tak. Poora hisaab <b>Referrals</b> tab mein hai.</p>
                  {refCode ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input readOnly value={refLink} onFocus={(e) => e.target.select()} style={{ flex: '1 1 260px' }} />
                      <button type="button" className="btn btn-gold" onClick={() => copyText(refLink, 'Referral link')}>📋 Copy Karein</button>
                      <a className="btn btn-wa" href={`https://wa.me/?text=${encodeURIComponent(`Namaste! Aap bhi Ganga Aarti Booking par partner bankar apni wedding services bechiye — join karna free hai. Mere referral code ${refCode} ke saath sign up karein: ${refLink}`)}`} target="_blank" rel="noreferrer">💬 WhatsApp Share</a>
                    </div>
                  ) : <p className="hint">Code taiyaar ho raha hai…</p>}
                </div>
              </div>
            )}

            {tab === 'referrals' && (
              <div>
                <div className="form-card wide" style={{ margin: '0 0 20px' }}>
                  <h3>🔗 Aapka Referral Code</h3>
                  <p className="hint">Ye link apne jaanne wale vendors (pandit, decorator, gaadi, DJ…) ko bhejein. Jo partner is link se sign up karega, uski <b>har booking par {REFERRAL_PCT}%</b> aapko milega — uske judne ki tareekh se <b>poore 1 saal</b> tak.</p>
                  {refCode ? (
                    <>
                      <p style={{ fontSize: '1.3rem', margin: '8px 0' }}>Code: <b style={{ letterSpacing: 1 }}>{refCode}</b></p>
                      <label>Aapka Referral Link</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input readOnly value={refLink} onFocus={(e) => e.target.select()} />
                        <button type="button" className="btn btn-gold" style={{ whiteSpace: 'nowrap' }} onClick={() => copyText(refLink, 'Referral link')}>{copied ? '✔ Copy Ho Gaya' : '📋 Copy Karein'}</button>
                      </div>
                    </>
                  ) : <p className="hint">Code taiyaar ho raha hai… page refresh karke dekhein.</p>}
                </div>
                <div className="stat-grid">
                  <div className="stat"><b>{myReferrals.length}</b><span>Mere Referral Se Jude Partners</span></div>
                  <div className="stat"><b>{refEarnings.length}</b><span>Referral Bookings</span></div>
                  <div className="stat"><b>{inr(refTotal)}</b><span>Kul Referral Kamai ({REFERRAL_PCT}%)</span></div>
                </div>
                <h3>Mere Referred Partners</h3>
                {myReferrals.length === 0 ? <p className="hint">Abhi koi partner aapke link se nahi juda hai. Upar wala link WhatsApp par vendors ko bhejein — pehla referral yahin dikhega.</p> : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Partner</th><th>Shahar</th><th>Judne Ki Tareekh</th><th>Kamai Kab Tak (1 Saal)</th><th>Isse Aayi Kamai</th></tr></thead>
                    <tbody>{myReferrals.map((p) => {
                      const exp = referralExpiry(p)
                      const total = refEarnings.filter((r) => r.referredPartnerId === p.id).reduce((s, r) => s + Number(r.amount), 0)
                      return (
                        <tr key={p.id}>
                          <td><b>{p.businessName || p.name}</b><br /><span className="hint">{p.email}</span></td>
                          <td>{p.city || '—'}</td>
                          <td>{p.referralSince ? new Date(p.referralSince).toLocaleDateString('en-IN') : '—'}</td>
                          <td>{exp ? exp.toLocaleDateString('en-IN') : '—'}<br /><span className={`status ${referralActive(p) ? 'confirmed' : 'cancelled'}`}>{referralActive(p) ? 'active' : 'khatam'}</span></td>
                          <td><b>{inr(total)}</b></td>
                        </tr>
                      )
                    })}</tbody>
                  </table></div>
                )}
                <h3 style={{ marginTop: 24 }}>Referral Kamai — Entry Wise</h3>
                {refEarnings.length === 0 ? <p className="hint">Abhi koi referral kamai nahi hui hai. Referred partner ki pehli booking par yahan entry ban jayegi.</p> : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Tareekh</th><th>Referred Partner</th><th>Kamai ({REFERRAL_PCT}%)</th></tr></thead>
                    <tbody>{refEarnings.map((r) => {
                      const rp = myReferrals.find((p) => p.id === r.referredPartnerId)
                      return <tr key={r.id}><td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td><td>{rp?.businessName || rp?.name || 'Partner'}</td><td><b>{inr(r.amount)}</b></td></tr>
                    })}</tbody>
                  </table></div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div>
                <div className="form-card wide" style={{ margin: '0 0 20px' }}>
                  <h3>🛠️ Meri Sevayein (Roles)</h3>
                  <p className="hint">Aap kaunsi sevayein dete hain? Ek se zyada chun sakte hain — jaise Pandit Ji + DJ + Tent. Aapka product form, panel aur storefront website inhi sevayiyon ke hisaab se dhalta hai.</p>
                  <div className="roles-grid">
                    {CATEGORIES.map((c) => (
                      <label key={c.slug} className={`role-chip${roles.includes(c.slug) ? ' on' : ''}`}>
                        <input type="checkbox" checked={roles.includes(c.slug)} onChange={() => setRoles(roles.includes(c.slug) ? roles.filter((r) => r !== c.slug) : [...roles, c.slug])} />
                        {c.icon} {c.name}
                      </label>
                    ))}
                  </div>
                  <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={saveRoles}>{busy ? 'Save ho raha hai…' : 'Sevayein Save Karein'}</button>
                </div>
                <ProfileForm />
              </div>
            )}
            </>)}
          </div>
        </div>
      </section>
    </>
  )
}
