import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ChatBox from '../components/ChatBox'
import { ProductCard, SkeletonGrid } from '../components/ProductCard'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { sendTargetedPush } from '../lib/push'
import { BOOKING_STATUS_HI, advanceFor, bookingThreadKey, quotationThreadKey, store } from '../lib/store'
import { NotificationPromptBanner, NotificationToggle, Spinner, effectiveBookingStatus, fmtDate, isPastDate, sortByEventDate, todayStr, useSettings, useToast } from '../lib/ui'

const STATUS_HI = { open: 'Khula hai — rates aa rahe hain', accepted: 'Booking ban gayi ✔', closed: 'Band', ...BOOKING_STATUS_HI }
const PAY_HI = { unpaid: '💳 Advance baaki hai', advance_paid: '💳 Advance mil gaya ✔', paid: '💳 Poora payment ✔' }

// Jin cards par USER ko khud action lena hai (booking ki Final Confirmation
// baaki, ya quotation ke aaye hue rate par Accept karna baaki) — ve card
// peeli border + halki peeli background se alag chamakte hain taaki user ki
// nazar seedha un par jaye.
const ATTENTION_STYLE = { border: '2px solid #e39a2d', background: '#fffaf1' }

// Razorpay checkout script loader (public key id only — the SECRET key kabhi
// client code mein nahi aata; asli signature verification ke liye production
// mein server / Supabase Edge Function lagega).
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function BookingPayment({ booking, user, settings, onDone }) {
  const toast = useToast()
  const [txn, setTxn] = useState('')
  const [busy, setBusy] = useState(false)
  if (booking.status === 'cancelled' || booking.status === 'completed') return null
  if (booking.paymentStatus === 'paid') return <p className="hint" style={{ margin: '8px 0 0' }}>💳 Poora payment ho chuka hai ✔</p>
  if (booking.paymentStatus === 'advance_paid') {
    return <p className="hint" style={{ margin: '8px 0 0' }}>💳 Advance <b>{inr(booking.advanceAmount)}</b> mil gaya hai ✔ ({booking.paymentMethod === 'razorpay' ? 'Razorpay' : 'UPI'}) — baaki rakam karyakram ke din seva ke baad.</p>
  }
  const advance = advanceFor(booking.amount)
  const upiId = (settings.upi_id || '').trim()
  const rzpKey = (settings.razorpay_key_id || '').trim()

  const payUpi = async () => {
    if (!txn.trim()) { toast('Pehle UPI payment ki Transaction / Ref ID likhein.', 'err'); return }
    setBusy(true)
    try {
      await store.recordPayment({ bookingId: booking.id, amount: advance, method: 'upi', txnId: txn.trim(), status: 'pending' }, user)
      toast('Advance bhej diya ✔ — admin UPI ID milaan karke pushti karenge.')
      onDone()
    } catch (ex) { toast(ex.message || 'Payment दर्ज nahi ho paya.', 'err') }
    setBusy(false)
  }
  const payRazorpay = async () => {
    setBusy(true)
    const ok = await loadRazorpayScript()
    if (!ok || !window.Razorpay) { toast('Razorpay load nahi ho paya — net check karke dobara koshish karein.', 'err'); setBusy(false); return }
    const rzp = new window.Razorpay({
      key: rzpKey,
      amount: advance * 100, // paise
      currency: 'INR',
      name: 'Ganga Aarti Booking',
      description: `Advance — ${booking.title}`,
      prefill: { name: user.name, email: user.email, contact: user.phone || '' },
      theme: { color: '#7b1e1e' },
      handler: async (resp) => {
        try {
          await store.recordPayment({ bookingId: booking.id, amount: advance, method: 'razorpay', txnId: resp.razorpay_payment_id, status: 'verified' }, user)
          toast('Razorpay advance payment safal ✔')
          onDone()
        } catch (ex) { toast(ex.message || 'Payment दर्ज nahi ho paya.', 'err') }
        setBusy(false)
      },
      modal: { ondismiss: () => setBusy(false) },
    })
    rzp.open()
  }

  return (
    <div className="reply-box" style={{ marginTop: 10 }}>
      <b>💳 Advance Pay Karein — {inr(advance)}</b>
      <p className="hint" style={{ margin: '4px 0 10px' }}>Booking pakki rakhne ke liye sirf 20% advance ({inr(advance)}) — baaki {inr(Number(booking.amount) - advance)} karyakram ke din.</p>
      {upiId ? (
        <div style={{ marginBottom: rzpKey ? 14 : 0 }}>
          <p style={{ margin: '0 0 6px' }}><b>Option 1 — UPI:</b> Is UPI ID par {inr(advance)} bhejein:<br /><code className="upi-id">{upiId}</code></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ flex: '1 1 220px' }} placeholder="Apni UPI Transaction / Ref ID likhein (jaise: 412345678901)" value={txn} onChange={(e) => setTxn(e.target.value)} />
            <button className="btn btn-green btn-sm" disabled={busy} onClick={payUpi}>{busy ? 'Bhej rahe hain…' : '✔ Maine Pay Kar Diya'}</button>
          </div>
          <p className="hint" style={{ margin: '6px 0 0' }}>Payment ke baad UPI app mein mili 12-digit wali Ref/UTR ID yahan daalein — admin milaan karke pushti karenge.</p>
        </div>
      ) : (
        <p className="hint" style={{ margin: '0 0 10px' }}>ℹ️ UPI se advance ki suvidha abhi taiyaar ho rahi hai (admin UPI ID jald judega). Tab tak booking aise hi pakki hai — partner sampark karenge.</p>
      )}
      {rzpKey && (
        <div>
          <p style={{ margin: '0 0 6px' }}><b>Option 2 — Card / Netbanking / UPI (Razorpay):</b></p>
          <button className="btn btn-maroon btn-sm" disabled={busy} onClick={payRazorpay}>{busy ? 'Rukiye…' : `💳 Razorpay Se ${inr(advance)} Pay Karein`}</button>
        </div>
      )}
    </div>
  )
}

// ── Flipkart "My Orders" pattern ka order card thumbnail ────────────────────
// Booking/quotation record par apni photo nahi hoti — category ki photo hi
// uski pehchan hai (product page par bhi yahi fallback chalta hai). Photo na
// ho to category ke naam ka pehla akshar.
function OrderThumb({ category, title }) {
  const cat = categoryBySlug(category)
  const img = cat?.image
  if (img) return <div className="order-thumb"><img src={img} alt="" loading="lazy" /></div>
  return <div className="order-thumb order-thumb-fallback" aria-hidden="true">{(title || cat?.name || 'G').trim().charAt(0).toUpperCase()}</div>
}

// Booking filter chips (Flipkart Orders jaisi) — sirf maujooda status /
// effective status se derive hota hai, koi naya logic nahi.
const BOOKING_FILTERS = [
  ['all', 'Sabhi'],
  ['upcoming', 'Aane Wali'],
  ['confirmed', 'Pakki'],
  ['completed', 'Poori Hui'],
  ['cancelled', 'Cancelled'],
]
function bookingMatchesFilter(b, f) {
  const eff = effectiveBookingStatus(b)
  if (f === 'upcoming') return ['pending_partner', 'pending_customer', 'confirmed'].includes(b.status) && eff !== 'completed'
  if (f === 'confirmed') return eff === 'confirmed'
  if (f === 'completed') return eff === 'completed'
  if (f === 'cancelled') return ['cancelled', 'rejected'].includes(b.status)
  return true
}

export default function UserPanel({ tab: initialTab = 'quotes' }) {
  const { user } = useAuth()
  const toast = useToast()
  const settings = useSettings()
  // My Bookings Flipkart ke "My Orders" ki tarah BOOKINGS par khulta hai —
  // grahak ko sabse pehle apni bookings dikhti hain, Shop dusra item hai.
  // /dashboard/quote (tab='new') seedha quotation form par hi khulta hai —
  // baaki har entry ka pehla view Meri Bookings hai.
  const landingTab = (t) => (t === 'new' ? 'new' : 'bookings')
  const [tab, setTab] = useState(() => landingTab(initialTab))
  const [params] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [shopCat, setShopCat] = useState('all')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [reviews, setReviews] = useState([])
  const [reviewOpen, setReviewOpen] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [cats, setCats] = useState(CATEGORIES)
  const [msg, setMsg] = useState('')
  const [openChat, setOpenChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    category: params.get('category') || 'ganga-aarti',
    title: params.get('title') || '',
    date: '', city: 'Varanasi', venue: '', guests: 200, notes: '',
  })
  const load = async () => {
    setQuotations(await store.listQuotations({ userId: user.id }))
    setBookings(await store.listBookings({ userId: user.id }))
    setReviews(await store.listReviews().catch(() => []))
    const rows = await store.listCategories().catch(() => null)
    if (rows && rows.length) setCats(rows)
    setLastUpdated(new Date())
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  // ── Auto-refresh: partner ke updates (booking accept/reject, quotation par
  // rate, status badlav) khule hue panel mein BINA manual refresh ke dikhne
  // ke liye wahi purana load() dobara chalta hai — (a) jab tab/window wapas
  // focus mein aaye (visibilitychange / focus) aur (b) har 30 second mein.
  // Koi naya store call nahi; unmount par saare listener/interval saaf.
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load })
  const refreshingRef = useRef(false)
  useEffect(() => {
    const refresh = async () => {
      if (refreshingRef.current) return
      refreshingRef.current = true
      try { await loadRef.current() } catch (err) { /* refresh fail ho to purana data hi dikhta rahega */ }
      refreshingRef.current = false
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])
  useEffect(() => { setTab(landingTab(initialTab)) }, [initialTab])
  // Shop (products) — marketplace wala hi data flow: saare active products.
  useEffect(() => {
    let live = true
    store.listProducts({ activeOnly: true })
      .then((rows) => { if (live) { setProducts(rows || []); setProductsLoading(false) } })
      .catch(() => { if (live) setProductsLoading(false) })
    return () => { live = false }
  }, [])

  const submitQuote = async (e) => {
    e.preventDefault()
    if (!form.date || isPastDate(form.date)) { toast('⚠️ Sahi date chunein — shaadi ki date aaj ya aage ki honi chahiye.', 'err'); return }
    if (!Number(form.guests) || Number(form.guests) < 1) { toast('⚠️ Mehmaanon ki sankhya sahi bharein (1 ya zyada).', 'err'); return }
    setBusy(true)
    const cat = cats.find((c) => c.slug === form.category) || categoryBySlug(form.category)
    try {
      await store.createQuotation({ ...form, guests: Number(form.guests), title: form.title || cat?.name }, user)
      setMsg('🙏 Quotation bhej di gayi hai! Partners jald hi apne rate bhejenge — yahin "Meri Quotations" mein dikhenge.')
      toast('Quotation bhej di gayi ✔')
      setForm({ ...form, title: '', date: '', venue: '', notes: '' })
      setTab('quotes'); load()
    } catch (ex) { toast(ex.message || 'Quotation nahi bheja ja paya.', 'err') }
    setBusy(false)
  }
  const accept = async (q, r) => {
    setBusy(true)
    try {
      await store.acceptReply(q.id, r.id, user)
      setMsg(`✔ Booking ban gayi! ${r.partnerName} — ${inr(r.price)}. Advance payment "Meri Bookings" mein kar sakte hain.`)
      toast('Booking ban gayi ✔')
      load()
    } catch (ex) { toast(ex.message || 'Booking nahi ban payi.', 'err') }
    setBusy(false)
  }
  const cancelBooking = async (b) => { await store.setBookingStatus(b.id, 'cancelled'); toast('Booking cancel ho gayi.'); load() }
  const finalConfirm = async (b) => {
    setBusy(true)
    try {
      await store.setBookingStatus(b.id, 'confirmed')
      // Event notification → partner ko pakki booking ki khabar (fire-and-forget).
      sendTargetedPush({ toUserId: b.partnerId, title: '🎉 Booking Pakki Ho Gayi', body: `${user.name} ne booking final confirm kar di — ${b.title}`, url: '/partner' })
      setMsg(`✔ Booking pakki ho gayi! ${b.title} — ab neeche advance payment karke booking surakshit karein.`)
      toast('Booking pakki ✔ — ab advance pay kar sakte hain')
      load()
    } catch (ex) { toast(ex.message || 'Confirm nahi ho paya.', 'err') }
    setBusy(false)
  }
  // Review sirf pakki (confirmed) ya sampann (completed) booking par — ek
  // booking par ek hi review (booking_id se UI mein hi check ho jata hai).
  const submitReview = async (e, b) => {
    e.preventDefault()
    setBusy(true)
    try {
      await store.addReview({ partnerId: b.partnerId, bookingId: b.id, rating: reviewForm.rating, comment: reviewForm.comment }, user)
      toast('Review mil gaya — dhanyavaad! ⭐')
      setReviewOpen(null)
      setReviewForm({ rating: 5, comment: '' })
      load()
    } catch (ex) { toast(ex.message || 'Review nahi bheja ja paya.', 'err') }
    setBusy(false)
  }

  const shopProducts = shopCat === 'all' ? products : products.filter((p) => p.category === shopCat)
  const visibleBookings = sortByEventDate(bookings).filter((b) => bookingMatchesFilter(b, bookingFilter))
  // Freshness indicator — Bookings/Quotations ke header mein chhota muted
  // text: panel kab last update hua, taaki user ko pata chale data taaza hai.
  const freshnessNote = lastUpdated ? (
    <p className="hint" style={{ margin: '0 0 12px' }}>Aakhri update: {lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} · Partner ke naye updates bina refresh kiye yahin apne aap dikhte hain</p>
  ) : null

  return (
    <>
      <Seo title="My Bookings | Ganga Aarti Booking" description="My Bookings — apni bookings aur quotations dekhein, advance payment karein, products book karein aur profile manage karein." path="/dashboard" />
      <section className="section wrap">
        <div className="panel-head">
          <div>
            <h2>My Bookings</h2>
            <p className="hint">Namaste, {user.name} · Grahak</p>
          </div>
        </div>
        <NotificationPromptBanner />
        {msg && <div className="ok">{msg}</div>}
        <div className="panel">
          <aside className="side">
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Meri Bookings ({bookings.length})</button>
            <button className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>Products — Shop</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>Meri Quotations ({quotations.length})</button>
            <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>Naya Quotation</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
            <Link className="side-shop" to="/wishlist">Meri Wishlist</Link>
            <div className="push-toggle-wrap"><NotificationToggle userId={user.id} className="btn btn-ghost btn-sm" /></div>
          </aside>
          <div>
            {tab === 'shop' && (
              <>
                <div className="panel-shop-head">
                  <h3>Saare Products</h3>
                  <p className="hint">Partners ke products — photo, rating aur saaf rate ke saath. Pasand aaye to product kholkar seedha book karein.</p>
                </div>
                <div className="order-filters" role="tablist" aria-label="Category chunein">
                  <button type="button" className={`o-chip${shopCat === 'all' ? ' on' : ''}`} onClick={() => setShopCat('all')}>Sabhi</button>
                  {cats.map((c) => (
                    <button type="button" key={c.slug} className={`o-chip${shopCat === c.slug ? ' on' : ''}`} onClick={() => setShopCat(c.slug)}>{c.name}</button>
                  ))}
                </div>
                {productsLoading ? (
                  <div className="shop-grid"><SkeletonGrid count={6} /></div>
                ) : shopProducts.length === 0 ? (
                  <div className="empty-state"><p>Is category mein abhi koi product nahi hai — doosri category dekhein.</p></div>
                ) : (
                  <div className="shop-grid">{shopProducts.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}</div>
                )}
              </>
            )}

            {tab !== 'shop' && (loading ? <Spinner /> : (<>
            {(tab === 'quotes' || tab === 'bookings') && freshnessNote}
            {tab === 'new' && (
              <form className="form-card wide" style={{ margin: 0 }} onSubmit={submitQuote}>
                <h3>Free Quotation Maangein</h3>
                <label>Service Chunein</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {cats.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name} — {inr(c.startingPrice)} se shuru</option>)}
                </select>
                <label>Package / Vishesh Mang (vaikalpik)</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Jaise: Family Ganga Aarti, Innova Crysta…" />
                <div className="form-row">
                  <div><label>Shaadi Ki Date</label><input type="date" required min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Jaise: 300" /></div>
                </div>
                <div className="form-row">
                  <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
                  <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Marriage lawn / hotel ka naam" /></div>
                </div>
                <label>Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Koi khaas baat — samay, vishesh vidhi, budget aadi" />
                <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Bhej rahe hain…' : 'Quotation Bhejein'}</button>
              </form>
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? (
                <div className="empty-state">
                  <p>📋 Abhi koi quotation nahi hai.</p>
                  <button className="btn btn-gold" onClick={() => setTab('new')}>📋 Pehla Quotation Maangein — Free Hai</button>
                </div>
              ) :
              sortByEventDate(quotations).map((q) => (
                <article className="order-card" key={q.id} style={q.status === 'open' && q.replies.length > 0 ? ATTENTION_STYLE : undefined}>
                  <div className="order-top">
                    <OrderThumb category={q.category} title={q.title || categoryBySlug(q.category)?.name} />
                    <div className="order-main">
                      <div className="order-title-row">
                        <h3 className="order-title">{q.title || categoryBySlug(q.category)?.name}</h3>
                        <span className={`o-pill ${q.status}`}>{STATUS_HI[q.status] || q.status}</span>
                      </div>
                      <p className="order-meta">{fmtDate(q.date)} · {q.city}{q.venue ? ` — ${q.venue}` : ''} · {q.guests} mehmaan</p>
                      {q.source === 'storefront' && <p className="order-meta">Partner Website se bheja gaya</p>}
                      {q.notes && <p className="order-notes">{q.notes}</p>}
                    </div>
                  </div>
                  {q.replies.length === 0 ? <p className="hint" style={{ margin: '10px 0 0' }}>Partners ke rate ka intezaar hai… Partner ke rate ke baad chat khulegi.</p> :
                    q.replies.map((r) => (
                      <div className="reply-box" key={r.id}>
                        <b>{r.partnerName}</b> — <span className="price">{inr(r.price)}</span>
                        <p style={{ margin: '4px 0' }}>{r.message}</p>
                        {q.status === 'open' && <button className="btn btn-green btn-sm" disabled={busy} onClick={() => accept(q, r)}>✔ Accept — Booking Banayein</button>}
                        <div className="chat-toggle-row">
                          <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(openChat === `q:${q.id}:${r.partnerId}` ? null : `q:${q.id}:${r.partnerId}`)}>💬 {r.partnerName} Se Chat</button>
                        </div>
                        {openChat === `q:${q.id}:${r.partnerId}` && (
                          <ChatBox threadKey={quotationThreadKey(q.id)} quotationId={q.id} otherId={r.partnerId} otherName={r.partnerName} />
                        )}
                      </div>
                    ))}
                </article>
              ))
            )}

            {tab === 'bookings' && (
              bookings.length === 0 ? (
                <div className="empty-state">
                  <p>📅 Abhi koi booking nahi hai.</p>
                  <button className="btn btn-gold" onClick={() => setTab('new')}>📋 Quotation Maangkar Booking Karein</button>
                </div>
              ) : (
                <>
                  <div className="order-filters" role="tablist" aria-label="Bookings filter karein">
                    {BOOKING_FILTERS.map(([key, label]) => (
                      <button type="button" key={key} className={`o-chip${bookingFilter === key ? ' on' : ''}`} onClick={() => setBookingFilter(key)}>
                        {label} ({bookings.filter((b) => bookingMatchesFilter(b, key)).length})
                      </button>
                    ))}
                  </div>
                  {visibleBookings.length === 0 ? (
                    <div className="empty-state"><p>Is filter mein koi booking nahi hai.</p></div>
                  ) : visibleBookings.map((b) => (
                    <article className="order-card" key={b.id} style={b.status === 'pending_customer' ? ATTENTION_STYLE : undefined}>
                      <div className="order-top">
                        <OrderThumb category={b.category} title={b.title} />
                        <div className="order-main">
                          <div className="order-title-row">
                            <h3 className="order-title">{b.title}</h3>
                            <span className={`o-pill ${effectiveBookingStatus(b)}`}>{STATUS_HI[effectiveBookingStatus(b)] || b.status}</span>
                          </div>
                          <p className="order-meta">{b.partnerName} · {fmtDate(b.date)} · {b.city}{b.venue ? ` — ${b.venue}` : ''}</p>
                          <p className="order-amount">Kul Rakam: <b className="price">{inr(b.amount)}</b> · <span className={`o-pill pay ${b.paymentStatus === 'unpaid' ? 'pending' : 'confirmed'}`}>{PAY_HI[b.paymentStatus] || b.paymentStatus}</span></p>
                        </div>
                      </div>
                      {['pending', 'pending_partner', 'pending_customer', 'confirmed'].includes(b.status) && (
                        <div className="order-actions">
                          <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b)}>Booking Cancel</button>
                        </div>
                      )}
                      {b.status === 'pending_partner' && <p className="hint" style={{ margin: '8px 0 0' }}>⏳ Partner ke jawab ka intezaar hai — ve Accept karenge to aapko Final Confirmation ke liye button milega.</p>}
                      {b.status === 'pending_customer' && (
                        <div className="reply-box" style={{ marginTop: 10 }}>
                          <b>🎉 Partner ne booking Accept kar li hai!</b>
                          <p className="hint" style={{ margin: '4px 0 10px' }}>Aakhri step — neeche button dabakar apni taraf se Final Confirm karein. Uske baad advance payment khul jayega.</p>
                          <button className="btn btn-green" disabled={busy} onClick={() => finalConfirm(b)}>✅ Final Confirm Karein</button>
                        </div>
                      )}
                      {b.status === 'rejected' && (
                        <div className="err" style={{ marginTop: 10 }}>
                          🙏 Maaf karein — partner ne ye booking mana kar di hai.
                          {b.rejectReason ? <><br />Kaaran: <b>{b.rejectReason}</b></> : null}
                          <br />Doosri date ya doosra partner chun sakte hain — <button className="btn btn-gold btn-sm" style={{ marginLeft: 6 }} onClick={() => setTab('new')}>Naya Quotation Maangein</button>
                        </div>
                      )}
                      {b.status === 'confirmed' && <BookingPayment booking={b} user={user} settings={settings} onDone={load} />}
                      {effectiveBookingStatus(b) === 'completed' && b.paymentStatus !== 'unpaid' && <p className="hint" style={{ margin: '8px 0 0' }}>💳 Advance {inr(b.advanceAmount)} ({b.paymentMethod === 'razorpay' ? 'Razorpay' : 'UPI'}) mil gaya tha ✔</p>}
                      {(effectiveBookingStatus(b) === 'confirmed' || effectiveBookingStatus(b) === 'completed') && (() => {
                        const myReview = reviews.find((r) => r.bookingId === b.id)
                        if (myReview) return <p className="hint" style={{ margin: '10px 0 0' }}>⭐ Review diya — dhanyavaad! ({myReview.rating}★)</p>
                        return (
                          <div style={{ marginTop: 10 }}>
                            <button className="btn btn-gold btn-sm" onClick={() => { setReviewOpen(reviewOpen === b.id ? null : b.id); setReviewForm({ rating: 5, comment: '' }) }}>⭐ Review Dein</button>
                            {reviewOpen === b.id && (
                              <form className="reply-box" style={{ marginTop: 10 }} onSubmit={(e) => submitReview(e, b)}>
                                <b>{b.partnerName} ke liye apna anubhav batayein</b>
                                <div className="star-input" role="radiogroup" aria-label="Rating chunein">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button type="button" key={n} className={n <= reviewForm.rating ? 'on' : ''} onClick={() => setReviewForm({ ...reviewForm, rating: n })} aria-label={`${n} star`}>★</button>
                                  ))}
                                </div>
                                <textarea rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Apna anubhav likhein…" style={{ width: '100%' }} />
                                <button className="btn btn-green btn-sm" disabled={busy} style={{ marginTop: 8 }}>{busy ? 'Bhej rahe hain…' : 'Review Bhejein'}</button>
                              </form>
                            )}
                          </div>
                        )
                      })()}
                      <div className="chat-toggle-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(openChat === `b:${b.id}` ? null : `b:${b.id}`)}>💬 {b.partnerName} Se Chat Karein</button>
                      </div>
                      {openChat === `b:${b.id}` && (
                        <ChatBox threadKey={bookingThreadKey(b.id)} bookingId={b.id} otherId={b.partnerId} otherName={b.partnerName} />
                      )}
                    </article>
                  ))}
                </>
              )
            )}

            {tab === 'profile' && <ProfileForm />}
            </>))}
          </div>
        </div>
      </section>
    </>
  )
}

export function ProfileForm() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, phone: user.phone, city: user.city, businessName: user.businessName || '', whatsapp: user.whatsapp || '' })
  const [pw, setPw] = useState({ old: '', next: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await store.updateProfile(user.id, form); await refresh(); setMsg('Profile update ho gayi ✔'); toast('Profile update ho gayi ✔') }
    catch (ex) { setErr(ex.message) }
    setBusy(false)
  }
  const changePw = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true)
    try { await store.changePassword(user.id, pw.old, pw.next); setMsg('Password badal gaya ✔'); toast('Password badal gaya ✔'); setPw({ old: '', next: '' }) }
    catch (ex) { setErr(ex.message) }
    setBusy(false)
  }
  return (
    <div className="form-card wide" style={{ margin: 0 }}>
      <h3>👤 Meri Profile</h3>
      <p className="hint">Email: {user.email} · Role: {user.role}{user.businessName ? ` · ${user.businessName}` : ''}</p>
      {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
      <form onSubmit={save}>
        <label>Naam</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aapka poora naam" />
        <div className="form-row">
          <div><label>Mobile</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." /></div>
          <div><label>Shahar</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
        </div>
        {user.role === 'partner' && (
          <>
            <label>📱 WhatsApp Number</label>
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Jaise: 94150 00001" />
            <p className="hint" style={{ margin: '4px 0 0' }}>Aapki storefront website (🌐 Meri Website) par grahak is number par seedha WhatsApp karenge. Khali ho to Mobile number hi istemal hoga.</p>
          </>
        )}
        <button className="btn btn-maroon" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Save ho raha hai…' : 'Save Karein'}</button>
      </form>
      <hr style={{ borderColor: 'var(--line)', margin: '24px 0' }} />
      <form onSubmit={changePw}>
        <h3>🔑 Password Badlein</h3>
        <div className="form-row">
          <div><label>Purana Password</label><input type="password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></div>
          <div><label>Naya Password</label><input type="password" required minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="Kam se kam 6 akshar" /></div>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 14 }} disabled={busy}>Password Badlein</button>
      </form>
    </div>
  )
}
