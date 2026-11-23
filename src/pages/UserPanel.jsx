import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { store } from '../lib/store'

const STATUS_HI = { open: 'Khula hai — rates aa rahe hain', accepted: 'Booking ban gayi ✔', closed: 'Band', pending: 'Partner ki pushti baaki', confirmed: 'Pakki ✔', cancelled: 'Cancel', completed: 'Sampann ✔' }

export default function UserPanel({ tab: initialTab = 'quotes' }) {
  const { user } = useAuth()
  const [tab, setTab] = useState(initialTab)
  const [params] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    category: params.get('category') || 'ganga-aarti',
    title: params.get('title') || '',
    date: '', city: 'Varanasi', venue: '', guests: 200, notes: '',
  })
  const load = async () => {
    setQuotations(await store.listQuotations({ userId: user.id }))
    setBookings(await store.listBookings({ userId: user.id }))
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setTab(initialTab) }, [initialTab])

  const submitQuote = async (e) => {
    e.preventDefault()
    const cat = categoryBySlug(form.category)
    await store.createQuotation({ ...form, guests: Number(form.guests), title: form.title || cat?.name }, user)
    setMsg('🙏 Quotation bhej di gayi hai! Partners jald hi apne rate bhejenge — yahin "Meri Quotations" mein dikhenge.')
    setForm({ ...form, title: '', date: '', venue: '', notes: '' })
    setTab('quotes'); load()
  }
  const accept = async (q, r) => {
    await store.acceptReply(q.id, r.id, user)
    setMsg(`✔ Booking ban gayi! ${r.partnerName} — ${inr(r.price)}. Status "Meri Bookings" mein dekhein.`)
    load()
  }
  const cancelBooking = async (b) => { await store.setBookingStatus(b.id, 'cancelled'); load() }

  return (
    <>
      <Seo title="My Panel | Ganga Aarti Booking" description="User panel — quotation maangein, partners ke rates dekhein, bookings aur profile manage karein." path="/dashboard" />
      <section className="section wrap">
        <h2>Namaste, {user.name} 🙏</h2>
        {msg && <div className="ok">{msg}</div>}
        <div className="panel">
          <aside className="side">
            <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>📋 Naya Quotation</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>💬 Meri Quotations ({quotations.length})</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>📅 Meri Bookings ({bookings.length})</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>👤 Profile</button>
          </aside>
          <div>
            {tab === 'new' && (
              <form className="form-card wide" style={{ margin: 0 }} onSubmit={submitQuote}>
                <h3>Free Quotation Maangein</h3>
                <label>Service Chunein</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name} — {inr(c.startingPrice)} se shuru</option>)}
                </select>
                <label>Package / Vishesh Mang (vaikalpik)</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Jaise: Family Ganga Aarti, Innova Crysta…" />
                <div className="form-row">
                  <div><label>Shaadi Ki Date</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Marriage lawn / hotel ka naam" /></div>
                </div>
                <label>Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Koi khaas baat — samay, vishesh vidhi, budget aadi" />
                <button className="btn btn-gold" style={{ marginTop: 14 }}>Quotation Bhejein</button>
              </form>
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? <p>Abhi koi quotation nahi. <button className="btn btn-gold btn-sm" onClick={() => setTab('new')}>Pehla Quotation Maangein</button></p> :
              quotations.map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 16 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{STATUS_HI[q.status] || q.status}</span></h3>
                    <p className="hint">📅 {q.date} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests} mehmaan</p>
                    {q.notes && <p>📝 {q.notes}</p>}
                    {q.replies.length === 0 ? <p className="hint">Partners ke rate ka intezaar hai…</p> :
                      q.replies.map((r) => (
                        <div className="reply-box" key={r.id}>
                          <b>{r.partnerName}</b> — <span className="price">{inr(r.price)}</span>
                          <p style={{ margin: '4px 0' }}>{r.message}</p>
                          {q.status === 'open' && <button className="btn btn-green btn-sm" onClick={() => accept(q, r)}>✔ Accept — Booking Banayein</button>}
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}

            {tab === 'bookings' && (
              bookings.length === 0 ? <p>Abhi koi booking nahi hai.</p> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Service</th><th>Partner</th><th>Date / Jagah</th><th>Rakam</th><th>Status</th><th></th></tr></thead>
                  <tbody>{bookings.map((b) => (
                    <tr key={b.id}>
                      <td><b>{b.title}</b></td><td>{b.partnerName}</td>
                      <td>{b.date}<br /><span className="hint">{b.city}{b.venue ? ` — ${b.venue}` : ''}</span></td>
                      <td>{inr(b.amount)}</td>
                      <td><span className={`status ${b.status}`}>{STATUS_HI[b.status] || b.status}</span></td>
                      <td>{(b.status === 'pending' || b.status === 'confirmed') && <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b)}>Cancel</button>}</td>
                    </tr>))}
                  </tbody>
                </table></div>
              )
            )}

            {tab === 'profile' && <ProfileForm />}
          </div>
        </div>
      </section>
    </>
  )
}

export function ProfileForm() {
  const { user, refresh } = useAuth()
  const [form, setForm] = useState({ name: user.name, phone: user.phone, city: user.city, businessName: user.businessName || '' })
  const [pw, setPw] = useState({ old: '', next: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const save = async (e) => { e.preventDefault(); await store.updateProfile(user.id, form); await refresh(); setMsg('Profile update ho gayi ✔') }
  const changePw = async (e) => {
    e.preventDefault(); setErr(''); setMsg('')
    try { await store.changePassword(user.id, pw.old, pw.next); setMsg('Password badal gaya ✔'); setPw({ old: '', next: '' }) }
    catch (ex) { setErr(ex.message) }
  }
  return (
    <div className="form-card wide" style={{ margin: 0 }}>
      <h3>👤 Meri Profile</h3>
      <p className="hint">Email: {user.email} · Role: {user.role}{user.businessName ? ` · ${user.businessName}` : ''}</p>
      {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
      <form onSubmit={save}>
        <label>Naam</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="form-row">
          <div><label>Mobile</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Shahar</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>
        <button className="btn btn-maroon" style={{ marginTop: 14 }}>Save Karein</button>
      </form>
      <hr style={{ borderColor: 'var(--line)', margin: '24px 0' }} />
      <form onSubmit={changePw}>
        <h3>🔑 Password Badlein</h3>
        <div className="form-row">
          <div><label>Purana Password</label><input type="password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></div>
          <div><label>Naya Password</label><input type="password" required minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 14 }}>Password Badlein</button>
      </form>
    </div>
  )
}
