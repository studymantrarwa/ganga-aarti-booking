import { useEffect, useMemo, useState } from 'react'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { partnerEarning, store } from '../lib/store'
import { ProfileForm } from './UserPanel'

const EMPTY = { title: '', category: 'ganga-aarti', price: '', unit: 'per event', city: 'Varanasi', description: '', image: '' }

export default function PartnerPanel() {
  const { user } = useAuth()
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [commissions, setCommissions] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [reply, setReply] = useState({})
  const [msg, setMsg] = useState('')

  const myCategories = useMemo(() => {
    const fromProducts = products.map((p) => p.category)
    return [...new Set(fromProducts)]
  }, [products])

  const load = async () => {
    const prods = await store.listProducts({ partnerId: user.id })
    setProducts(prods)
    const cats = [...new Set(prods.map((p) => p.category))]
    setQuotations(await store.listQuotations({ partnerCategories: cats.length ? cats : CATEGORIES.map((c) => c.slug) }))
    setBookings(await store.listBookings({ partnerId: user.id }))
    setCommissions(await store.getCommissions())
  }
  useEffect(() => { load() }, [])

  const saveProduct = async (e) => {
    e.preventDefault()
    await store.saveProduct({ ...form, price: Number(form.price), id: editing || undefined }, user)
    setForm(EMPTY); setEditing(null); setMsg('Product save ho gaya ✔'); load()
  }
  const edit = (p) => { setForm({ title: p.title, category: p.category, price: p.price, unit: p.unit, city: p.city, description: p.description, image: p.image }); setEditing(p.id); setTab('products') }
  const del = async (p) => { if (confirm(`"${p.title}" delete karein?`)) { await store.deleteProduct(p.id); load() } }
  const sendReply = async (q) => {
    const r = reply[q.id]
    if (!r?.price) return
    await store.replyQuotation(q.id, user, r.price, r.message || '')
    setMsg('Quotation bhej diya ✔'); load()
  }

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled')
  const gross = activeBookings.reduce((s, b) => s + Number(b.amount), 0)
  const net = commissions ? activeBookings.reduce((s, b) => s + partnerEarning(b, commissions).earning, 0) : 0
  const commissionPaid = gross - net

  return (
    <>
      <Seo title="Partner Panel | Ganga Aarti Booking" description="Partner panel — apne wedding products add karein, quotation bhejein, bookings aur kamai (commission ke baad) dekhein." path="/partner" />
      <section className="section wrap">
        <h2>🏪 Partner Panel — {user.businessName || user.name}</h2>
        {msg && <div className="ok">{msg}</div>}
        <div className="stat-grid">
          <div className="stat"><b>{products.length}</b><span>Mere Products</span></div>
          <div className="stat"><b>{quotations.filter((q) => q.status === 'open').length}</b><span>Khule Quotation Requests</span></div>
          <div className="stat"><b>{bookings.length}</b><span>Total Bookings</span></div>
          <div className="stat"><b>{inr(gross)}</b><span>Kul Booking Value</span></div>
          <div className="stat"><b>{inr(net)}</b><span>Meri Kamai (commission ke baad)</span></div>
          <div className="stat"><b>{inr(commissionPaid)}</b><span>Platform Commission</span></div>
        </div>
        <div className="panel">
          <aside className="side">
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>📦 Mere Products</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>💬 Quotation Requests</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>📅 Bookings Aur Kamai</button>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>👤 Profile</button>
          </aside>
          <div>
            {tab === 'products' && (
              <>
                <form className="form-card wide" style={{ margin: '0 0 20px' }} onSubmit={saveProduct}>
                  <h3>{editing ? '✏️ Product Edit Karein' : '➕ Naya Product / Service Add Karein'}</h3>
                  <label>Title</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Jaise: Royal Mandap Package, Innova Crysta…" />
                  <div className="form-row">
                    <div><label>Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                      </select></div>
                    <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div><label>Price (₹)</label><input type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                    <div><label>Unit</label>
                      <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                        <option>per event</option><option>per day</option><option>per plate</option><option>per hour</option>
                      </select></div>
                  </div>
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Kya-kya shamil hai, khaasiyat…" />
                  <label>Image URL (vaikalpik)</label>
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/hero-aarti.jpg ya https://…" />
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button className="btn btn-gold">{editing ? 'Update Karein' : 'Product Add Karein'}</button>
                    {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancel</button>}
                  </div>
                </form>
                <div className="grid grid-2">
                  {products.map((p) => (
                    <article className="card" key={p.id}>
                      {p.image ? <div className="ph"><img src={p.image} alt={p.title} loading="lazy" /></div> : <div className="ph">{categoryBySlug(p.category)?.icon}</div>}
                      <div className="body">
                        <span className="badge">{categoryBySlug(p.category)?.name}</span>
                        <h3>{p.title}</h3>
                        <p>{p.description}</p>
                        <p className="price">{inr(p.price)} <small>{p.unit} · 📍 {p.city}</small></p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-maroon btn-sm" onClick={() => edit(p)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(p)}>Delete</button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {products.length === 0 && <p>Abhi koi product nahi. Upar form se pehla product add karein — usi category ke quotation requests aapko dikhne lagenge.</p>}
                </div>
              </>
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? <p>Abhi koi quotation request nahi hai. Apni category ke products add karein taaki requests dikhein.</p> :
              quotations.map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 16 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{q.status}</span></h3>
                    <p className="hint">👤 {q.userName} · 📅 {q.date} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests} mehmaan</p>
                    {q.notes && <p>📝 {q.notes}</p>}
                    {q.replies.map((r) => (
                      <div className="reply-box" key={r.id}><b>{r.partnerName}</b> — {inr(r.price)}<p style={{ margin: '4px 0' }}>{r.message}</p></div>
                    ))}
                    {q.status === 'open' && (
                      <div className="form-row" style={{ marginTop: 10 }}>
                        <input type="number" min={0} placeholder="Aapka rate (₹)" value={reply[q.id]?.price || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], price: e.target.value } })} />
                        <input placeholder="Sandesh (kya-kya shamil hai)" value={reply[q.id]?.message || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], message: e.target.value } })} />
                      </div>
                    )}
                    {q.status === 'open' && <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} onClick={() => sendReply(q)}>Quotation Bhejein</button>}
                  </div>
                </div>
              ))
            )}

            {tab === 'bookings' && (
              bookings.length === 0 ? <p>Abhi koi booking nahi mili hai.</p> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Service</th><th>Grahak</th><th>Date / Jagah</th><th>Rakam</th><th>Commission</th><th>Meri Kamai</th><th>Status</th></tr></thead>
                  <tbody>{bookings.map((b) => {
                    const e = commissions ? partnerEarning(b, commissions) : { pct: 0, earning: b.amount }
                    return (
                      <tr key={b.id}>
                        <td><b>{b.title}</b></td><td>{b.userName}</td>
                        <td>{b.date}<br /><span className="hint">{b.city}{b.venue ? ` — ${b.venue}` : ''}</span></td>
                        <td>{inr(b.amount)}</td><td>{e.pct}%</td><td><b>{inr(e.earning)}</b></td>
                        <td><span className={`status ${b.status}`}>{b.status}</span></td>
                      </tr>
                    )
                  })}</tbody>
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
