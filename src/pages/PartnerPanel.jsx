import { useEffect, useMemo, useState } from 'react'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, SITE, categoryBySlug, inr } from '../data/catalog'
import { REFERRAL_PCT, commissionPct, partnerEarning, referralActive, referralExpiry, store } from '../lib/store'
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
  const [err, setErr] = useState('')
  const [refCode, setRefCode] = useState(user.referralCode || '')
  const [myReferrals, setMyReferrals] = useState([])
  const [refEarnings, setRefEarnings] = useState([])
  const [copied, setCopied] = useState(false)

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
    const me = await store.ensureReferralCode(user).catch(() => user)
    if (me && me.referralCode) setRefCode(me.referralCode)
    const allUsers = await store.listUsers().catch(() => [])
    setMyReferrals(allUsers.filter((u) => u.role === 'partner' && u.referredBy === user.id))
    setRefEarnings(await store.listReferralEarnings({ referrerId: user.id }))
  }
  useEffect(() => { load() }, [])

  const saveProduct = async (e) => {
    e.preventDefault()
    setErr(''); setMsg('')
    const price = Number(form.price)
    if (!form.title.trim()) { setErr('Product ka title bharein.'); return }
    if (!price || price <= 0) { setErr('⚠️ Price ₹0 se zyada hona chahiye — yahi rate customers ko dikhega.'); return }
    await store.saveProduct({ ...form, price, id: editing || undefined }, user)
    setForm(EMPTY); setEditing(null); setMsg('Product save ho gaya ✔'); load()
  }
  const edit = (p) => { setForm({ title: p.title, category: p.category, price: p.price, unit: p.unit, city: p.city, description: p.description, image: p.image }); setEditing(p.id); setTab('products'); setErr('') }
  const del = async (p) => { if (confirm(`"${p.title}" delete karein?`)) { await store.deleteProduct(p.id); load() } }
  const sendReply = async (q) => {
    const r = reply[q.id]
    if (!r?.price || Number(r.price) <= 0) { setErr('⚠️ Quotation ke liye sahi rate (₹0 se zyada) bharein.'); return }
    setErr('')
    await store.replyQuotation(q.id, user, r.price, r.message || '')
    setMsg('Quotation bhej diya ✔'); load()
  }

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled')
  const gross = activeBookings.reduce((s, b) => s + Number(b.amount), 0)
  const net = commissions ? activeBookings.reduce((s, b) => s + partnerEarning(b, commissions).earning, 0) : 0
  const commissionPaid = gross - net
  const myPct = (category) => commissionPct(commissions, category, user.id)
  const netOf = (amount, category) => { const pct = myPct(category); return { pct, net: Number(amount) - Math.round((Number(amount) * pct) / 100) } }
  const refLink = refCode ? `${SITE.origin}/signup?ref=${refCode}` : ''
  const refTotal = refEarnings.reduce((s, r) => s + Number(r.amount), 0)
  const copyRefLink = async () => {
    try { await navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(() => setCopied(false), 2200) }
    catch { setErr('Copy nahi ho paya — link ko select karke khud copy kar lein.') }
  }

  return (
    <>
      <Seo title="Partner Panel | Ganga Aarti Booking" description="Partner panel — apne wedding products add karein, quotation bhejein, bookings aur kamai (commission ke baad) dekhein." path="/partner" />
      <section className="section wrap">
        <h2>🏪 Partner Panel — {user.businessName || user.name}</h2>
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="err">{err}</div>}
        <div className="stat-grid">
          <div className="stat"><b>{products.length}</b><span>Mere Products</span></div>
          <div className="stat"><b>{quotations.filter((q) => q.status === 'open').length}</b><span>Khule Quotation Requests</span></div>
          <div className="stat"><b>{bookings.length}</b><span>Total Bookings</span></div>
          <div className="stat"><b>{inr(gross)}</b><span>Kul Booking Value</span></div>
          <div className="stat"><b>{inr(net)}</b><span>Meri Kamai (commission ke baad)</span></div>
          <div className="stat"><b>{inr(commissionPaid)}</b><span>Platform Commission</span></div>
          <div className="stat"><b>{commissions?.byPartner?.[user.id] != null ? `${commissions.byPartner[user.id]}%` : 'Category anusaar'}</b><span>Mera Commission Rate</span></div>
          <div className="stat"><b>{inr(refTotal)}</b><span>Referral Kamai ({REFERRAL_PCT}%)</span></div>
        </div>
        <div className="panel">
          <aside className="side">
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>📦 Mere Products</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>💬 Quotation Requests</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>📅 Bookings Aur Kamai</button>
            <button className={tab === 'referrals' ? 'active' : ''} onClick={() => setTab('referrals')}>🔗 Referrals ({myReferrals.length})</button>
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
                  <div className="price-field">
                    <label htmlFor="partner-price">💰 Price — Yahi Rate Customers Ko Dikhega</label>
                    <div className="form-row" style={{ alignItems: 'end' }}>
                      <div className="price-input">
                        <span aria-hidden="true">₹</span>
                        <input id="partner-price" type="number" min={1} step={1} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Jaise: 21000" />
                      </div>
                      <div><label>Unit</label>
                        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                          <option>per event</option><option>per day</option><option>per plate</option><option>per hour</option>
                        </select></div>
                    </div>
                    <p className="hint" style={{ margin: '6px 0 0' }}>Saaf aur sahi rate likhein — customer pehle yahi price dekhkar quotation maangta hai. Price ₹0 se zyada hona chahiye.</p>
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
                        {commissions && <p className="hint" style={{ margin: 0 }}>💰 Commission {netOf(p.price, p.category).pct}% katne ke baad aapko ≈ <b>{inr(netOf(p.price, p.category).net)}</b> milega</p>}
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
                      <div className="reply-box" key={r.id}><b>{r.partnerName}</b> — {inr(r.price)}
                        {r.partnerId === user.id && commissions && <span className="hint"> · commission {netOf(r.price, q.category).pct}% ke baad aapko ≈ {inr(netOf(r.price, q.category).net)}</span>}
                        <p style={{ margin: '4px 0' }}>{r.message}</p></div>
                    ))}
                    {q.status === 'open' && (
                      <div className="form-row" style={{ marginTop: 10 }}>
                        <input type="number" min={1} placeholder="Aapka rate (₹)" value={reply[q.id]?.price || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], price: e.target.value } })} />
                        <input placeholder="Sandesh (kya-kya shamil hai)" value={reply[q.id]?.message || ''} onChange={(e) => setReply({ ...reply, [q.id]: { ...reply[q.id], message: e.target.value } })} />
                      </div>
                    )}
                    {q.status === 'open' && reply[q.id]?.price && Number(reply[q.id].price) > 0 && commissions && (
                      <p className="hint" style={{ margin: '6px 0 0' }}>💰 Is rate par commission {netOf(reply[q.id].price, q.category).pct}% katne ke baad aapko ≈ <b>{inr(netOf(reply[q.id].price, q.category).net)}</b> milega</p>
                    )}
                    {q.status === 'open' && <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} onClick={() => sendReply(q)}>Quotation Bhejein</button>}
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
                  {' '}Neeche har booking mein commission katne ke baad ki <b>asal kamai</b> dikh rahi hai.
                </div>
              )}
              {bookings.length === 0 ? <p>Abhi koi booking nahi mili hai.</p> : (
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
              )}
              </>
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
                        <button type="button" className="btn btn-gold" style={{ whiteSpace: 'nowrap' }} onClick={copyRefLink}>{copied ? '✔ Copy Ho Gaya' : '📋 Copy Karein'}</button>
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

            {tab === 'profile' && <ProfileForm />}
          </div>
        </div>
      </section>
    </>
  )
}
