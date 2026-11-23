import { useEffect, useState } from 'react'
import Seo from '../components/Seo'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { partnerEarning, store } from '../lib/store'

export default function AdminPanel() {
  const [tab, setTab] = useState('dash')
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [commissions, setCommissions] = useState(null)
  const [pctInputs, setPctInputs] = useState({})
  const [msg, setMsg] = useState('')

  const load = async () => {
    setUsers(await store.listUsers())
    setProducts(await store.listProducts({}))
    setQuotations(await store.listQuotations({ all: true }))
    setBookings(await store.listBookings({ all: true }))
    setCommissions(await store.getCommissions())
  }
  useEffect(() => { load() }, [])

  const setStatus = async (b, s) => { await store.setBookingStatus(b.id, s); load() }
  const delProduct = async (p) => { if (confirm(`Admin: "${p.title}" delete karein?`)) { await store.deleteProduct(p.id); load() } }
  const savePct = async (scope, key) => {
    const v = pctInputs[`${scope}:${key}`]
    if (v === undefined || v === '') return
    setCommissions(await store.setCommission(scope, key, v))
    setMsg(`Commission update ho gaya ✔ (${scope} ${key} = ${v}%)`)
    load()
  }

  const partners = users.filter((u) => u.role === 'partner')
  const customers = users.filter((u) => u.role === 'user')
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled')
  const revenue = activeBookings.reduce((s, b) => s + Number(b.amount), 0)
  const commissionEarned = commissions ? activeBookings.reduce((s, b) => s + partnerEarning(b, commissions).commission, 0) : 0

  return (
    <>
      <Seo title="Admin Panel | Ganga Aarti Booking" description="Admin panel — saari bookings, quotations, users, partners, products aur commission settings." path="/admin" />
      <section className="section wrap">
        <h2>🛠️ Admin Panel</h2>
        {msg && <div className="ok">{msg}</div>}
        {tab === 'dash' && (
          <div className="stat-grid">
            <div className="stat"><b>{users.length}</b><span>Total Users</span></div>
            <div className="stat"><b>{partners.length}</b><span>Partners</span></div>
            <div className="stat"><b>{customers.length}</b><span>Customers</span></div>
            <div className="stat"><b>{products.length}</b><span>Products</span></div>
            <div className="stat"><b>{quotations.length}</b><span>Quotations</span></div>
            <div className="stat"><b>{bookings.length}</b><span>Total Bookings</span></div>
            <div className="stat"><b>{inr(revenue)}</b><span>Kul Revenue (active bookings)</span></div>
            <div className="stat"><b>{inr(commissionEarned)}</b><span>Platform Commission Kamai</span></div>
          </div>
        )}
        <div className="panel">
          <aside className="side">
            <button className={tab === 'dash' ? 'active' : ''} onClick={() => setTab('dash')}>📊 Dashboard</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>📅 Saari Bookings</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>💬 Saari Quotations</button>
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👥 Users & Partners</button>
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>📦 Products Moderation</button>
            <button className={tab === 'commission' ? 'active' : ''} onClick={() => setTab('commission')}>💰 Commission Settings</button>
          </aside>
          <div>
            {tab === 'dash' && <p>Namaste Admin 🙏 — baayein menu se bookings, quotations, users, products aur commission manage karein. Upar kul aankde dikh rahe hain.</p>}

            {tab === 'bookings' && (
              bookings.length === 0 ? <p>Koi booking nahi hai.</p> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Service</th><th>Grahak → Partner</th><th>Date / Jagah</th><th>Rakam</th><th>Commission</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{bookings.map((b) => {
                    const e = commissions ? partnerEarning(b, commissions) : { commission: 0, pct: 0 }
                    return (
                      <tr key={b.id}>
                        <td><b>{b.title}</b><br /><span className="hint">{categoryBySlug(b.category)?.name}</span></td>
                        <td>{b.userName}<br /><span className="hint">→ {b.partnerName}</span></td>
                        <td>{b.date}<br /><span className="hint">{b.city}{b.venue ? ` — ${b.venue}` : ''}</span></td>
                        <td>{inr(b.amount)}</td><td>{inr(e.commission)} ({e.pct}%)</td>
                        <td><span className={`status ${b.status}`}>{b.status}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {b.status === 'pending' && <button className="btn btn-green btn-sm" onClick={() => setStatus(b, 'confirmed')}>Confirm</button>}{' '}
                          {b.status === 'confirmed' && <button className="btn btn-maroon btn-sm" onClick={() => setStatus(b, 'completed')}>Complete</button>}{' '}
                          {b.status !== 'cancelled' && b.status !== 'completed' && <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, 'cancelled')}>Cancel</button>}
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table></div>
              )
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? <p>Koi quotation nahi hai.</p> :
              quotations.map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 14 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{q.status}</span></h3>
                    <p className="hint">👤 {q.userName} · 📅 {q.date} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests}</p>
                    {q.replies.map((r) => <div className="reply-box" key={r.id}><b>{r.partnerName}</b> — {inr(r.price)}<p style={{ margin: '4px 0' }}>{r.message}</p></div>)}
                    {q.replies.length === 0 && <p className="hint">Abhi koi reply nahi.</p>}
                  </div>
                </div>
              ))
            )}

            {tab === 'users' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Naam</th><th>Email</th><th>Role</th><th>Mobile</th><th>Shahar / Business</th></tr></thead>
                <tbody>{users.map((u) => (
                  <tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td><span className="badge">{u.role}</span></td><td>{u.phone || '—'}</td><td>{u.city || '—'}{u.businessName ? ` · ${u.businessName}` : ''}</td></tr>
                ))}</tbody>
              </table></div>
            )}

            {tab === 'products' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Product</th><th>Partner</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
                <tbody>{products.map((p) => (
                  <tr key={p.id}><td><b>{p.title}</b></td><td>{p.partnerName}</td><td>{categoryBySlug(p.category)?.name}</td><td>{inr(p.price)} {p.unit}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => delProduct(p)}>Delete</button></td></tr>
                ))}</tbody>
              </table></div>
            )}

            {tab === 'commission' && commissions && (
              <div>
                <div className="form-card wide" style={{ margin: '0 0 20px' }}>
                  <h3>Default Commission</h3>
                  <p className="hint">Har booking par lagne wala default commission % (jab category/partner ka alag rate na ho).</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="number" min={0} max={90} defaultValue={commissions.defaultPct} onChange={(e) => setPctInputs({ ...pctInputs, 'default:default': e.target.value })} />
                    <button className="btn btn-gold" onClick={() => savePct('default', 'default')}>Save</button>
                  </div>
                </div>
                <h3>Category Ke Hisab Se Commission %</h3>
                <div className="table-wrap"><table>
                  <thead><tr><th>Category</th><th>Abhi Ka %</th><th>Naya %</th><th></th></tr></thead>
                  <tbody>{CATEGORIES.map((c) => (
                    <tr key={c.slug}><td>{c.icon} {c.name}</td>
                      <td>{commissions.byCategory[c.slug] ?? commissions.defaultPct}%{commissions.byCategory[c.slug] == null ? ' (default)' : ''}</td>
                      <td><input type="number" min={0} max={90} style={{ width: 100 }} placeholder={String(commissions.byCategory[c.slug] ?? '')} onChange={(e) => setPctInputs({ ...pctInputs, [`category:${c.slug}`]: e.target.value })} /></td>
                      <td><button className="btn btn-maroon btn-sm" onClick={() => savePct('category', c.slug)}>Save</button></td></tr>
                  ))}</tbody>
                </table></div>
                <h3 style={{ marginTop: 26 }}>Partner Ke Hisab Se Commission % (sabse zyada prathmikta)</h3>
                <div className="table-wrap"><table>
                  <thead><tr><th>Partner</th><th>Abhi Ka %</th><th>Naya %</th><th></th></tr></thead>
                  <tbody>{partners.map((p) => (
                    <tr key={p.id}><td><b>{p.businessName || p.name}</b><br /><span className="hint">{p.email}</span></td>
                      <td>{commissions.byPartner[p.id] != null ? `${commissions.byPartner[p.id]}% (partner rate)` : 'Category/default rate'}</td>
                      <td><input type="number" min={0} max={90} style={{ width: 100 }} placeholder={String(commissions.byPartner[p.id] ?? '')} onChange={(e) => setPctInputs({ ...pctInputs, [`partner:${p.id}`]: e.target.value })} /></td>
                      <td><button className="btn btn-maroon btn-sm" onClick={() => savePct('partner', p.id)}>Save</button></td></tr>
                  ))}</tbody>
                </table></div>
                <p className="hint" style={{ marginTop: 12 }}>Note: Partner rate &gt; Category rate &gt; Default rate. Badla hua commission partner ki kamai aur admin totals mein turant lagu hota hai.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
