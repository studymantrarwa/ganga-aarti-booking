import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatBox from '../components/ChatBox'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { sendTargetedPush } from '../lib/push'
import { BOOKING_STATUS_HI, advanceFor, bookingThreadKey, quotationThreadKey, store } from '../lib/store'
import { NotificationPromptBanner, NotificationToggle, Spinner, useSettings, useToast } from '../lib/ui'

const STATUS_HI = { open: 'Khula hai — rates aa rahe hain', accepted: 'Booking ban gayi ✔', closed: 'Band', ...BOOKING_STATUS_HI }
const PAY_HI = { unpaid: '💳 Advance baaki hai', advance_paid: '💳 Advance mil gaya ✔', paid: '💳 Poora payment ✔' }

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

export default function UserPanel({ tab: initialTab = 'quotes' }) {
  const { user } = useAuth()
  const toast = useToast()
  const settings = useSettings()
  const [tab, setTab] = useState(initialTab)
  const [params] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [cats, setCats] = useState(CATEGORIES)
  const [msg, setMsg] = useState('')
  const [openChat, setOpenChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    category: params.get('category') || 'ganga-aarti',
    title: params.get('title') || '',
    date: '', city: 'Varanasi', venue: '', guests: 200, notes: '',
  })
  const load = async () => {
    setQuotations(await store.listQuotations({ userId: user.id }))
    setBookings(await store.listBookings({ userId: user.id }))
    const rows = await store.listCategories().catch(() => null)
    if (rows && rows.length) setCats(rows)
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setTab(initialTab) }, [initialTab])

  const submitQuote = async (e) => {
    e.preventDefault()
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

  return (
    <>
      <Seo title="My Panel | Ganga Aarti Booking" description="User panel — quotation maangein, partners ke rates dekhein, bookings, advance payment aur profile manage karein." path="/dashboard" />
      <section className="section wrap">
        <h2>Namaste, {user.name} 🙏</h2>
        <NotificationPromptBanner />
        {msg && <div className="ok">{msg}</div>}
        <div className="panel">
          <aside className="side">
            <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>📋 Naya Quotation</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>💬 Meri Quotations ({quotations.length})</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>📅 Meri Bookings ({bookings.length})</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>👤 Profile</button>
            <div className="push-toggle-wrap"><NotificationToggle userId={user.id} className="btn btn-ghost btn-sm" /></div>
          </aside>
          <div>
            {loading ? <Spinner /> : (<>
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
                  <div><label>Shaadi Ki Date</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
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
              quotations.map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 16 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{STATUS_HI[q.status] || q.status}</span>{q.source === 'storefront' && <span className="badge" style={{ marginLeft: 6 }}>🏪 Partner Website Se</span>}</h3>
                    <p className="hint">📅 {q.date} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests} mehmaan</p>
                    {q.notes && <p>📝 {q.notes}</p>}
                    {q.replies.length === 0 ? <p className="hint">Partners ke rate ka intezaar hai… 💬 Partner ke rate ke baad chat khulegi.</p> :
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
                  </div>
                </div>
              ))
            )}

            {tab === 'bookings' && (
              bookings.length === 0 ? (
                <div className="empty-state">
                  <p>📅 Abhi koi booking nahi hai.</p>
                  <button className="btn btn-gold" onClick={() => setTab('new')}>📋 Quotation Maangkar Booking Karein</button>
                </div>
              ) :
              bookings.map((b) => (
                <div className="card" key={b.id} style={{ marginBottom: 16 }}>
                  <div className="body">
                    <h3>{categoryBySlug(b.category)?.icon} {b.title} <span className={`status ${b.status}`}>{STATUS_HI[b.status] || b.status}</span></h3>
                    <p className="hint">🏪 {b.partnerName} · 📅 {b.date} · 📍 {b.city}{b.venue ? ` — ${b.venue}` : ''}</p>
                    <p style={{ margin: '4px 0' }}>Kul Rakam: <b className="price">{inr(b.amount)}</b> · <span className={`status ${b.paymentStatus === 'unpaid' ? 'pending' : 'confirmed'}`}>{PAY_HI[b.paymentStatus] || b.paymentStatus}</span>
                      {['pending', 'pending_partner', 'pending_customer', 'confirmed'].includes(b.status) && <button className="btn btn-danger btn-sm" style={{ marginLeft: 10 }} onClick={() => cancelBooking(b)}>Booking Cancel</button>}
                    </p>
                    {b.status === 'pending_partner' && <p className="hint" style={{ margin: '6px 0 0' }}>⏳ Partner ke jawab ka intezaar hai — ve Accept karenge to aapko Final Confirmation ke liye button milega.</p>}
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
                    {b.status === 'completed' && b.paymentStatus !== 'unpaid' && <p className="hint" style={{ margin: '8px 0 0' }}>💳 Advance {inr(b.advanceAmount)} ({b.paymentMethod === 'razorpay' ? 'Razorpay' : 'UPI'}) mil gaya tha ✔</p>}
                    <div className="chat-toggle-row">
                      <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(openChat === `b:${b.id}` ? null : `b:${b.id}`)}>💬 {b.partnerName} Se Chat Karein</button>
                    </div>
                    {openChat === `b:${b.id}` && (
                      <ChatBox threadKey={bookingThreadKey(b.id)} bookingId={b.id} otherId={b.partnerId} otherName={b.partnerName} />
                    )}
                  </div>
                </div>
              ))
            )}

            {tab === 'profile' && <ProfileForm />}
            </>)}
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
