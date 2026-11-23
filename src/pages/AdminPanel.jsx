import { useEffect, useState } from 'react'
import Seo from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, categoryBySlug, inr } from '../data/catalog'
import { BOOKING_STATUS_HI, REFERRAL_PCT, isSupabaseMode, partnerEarning, referralExpiry, store } from '../lib/store'
import { NotificationPromptBanner, NotificationToggle, Spinner, effectiveBookingStatus, fmtDate, sortByEventDate, useToast } from '../lib/ui'
import { countDeviceTokens, getSessionAccessToken, hasOwnSubscription } from '../lib/push'

const PAY_HI = { unpaid: 'Advance baaki', advance_paid: 'Advance mil gaya', paid: 'Poora payment' }

// ── 📣 Notifications tab — Firebase (FCM) se sabko push bhejna ──────────────
// Asal bhejna server (/api/send-push) karta hai — wahan admin ki pehchan
// Supabase token se hoti hai. Demo mode mein ye tab sirf samjhata hai.
function NotificationsTab({ user }) {
  const toast = useToast()
  const [count, setCount] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', url: '/', audience: 'all' })
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState('')
  const [ownSub, setOwnSub] = useState(true)

  const refreshMeta = async () => {
    setCount(await countDeviceTokens().catch(() => 0))
    if (user) setOwnSub(await hasOwnSubscription(user.id).catch(() => false))
  }
  useEffect(() => { refreshMeta() }, [])

  if (!isSupabaseMode) {
    return (
      <div>
        <h3 style={{ marginTop: 0 }}>📣 Notifications — Offers Aur Updates Bhejein</h3>
        <p>Notifications sirf <b>live (database) mode</b> mein chalte hain. Ye site abhi <b>demo mode</b> mein khuli hai (Supabase juda nahi hai), isliye yahan se push nahi bheja ja sakta. Live site par yahi tab poori tarah kaam karega — title/message likho, kisko bhejna hai chuno, aur ek tap mein sabke phone par ghanti.</p>
        <p className="hint">Is device par apne notifications ki haalat yahan se badal sakte hain:</p>
        <NotificationToggle userId={user ? user.id : null} className="btn btn-gold btn-sm" />
      </div>
    )
  }

  const doSend = async (testOnly) => {
    if (!form.title.trim() || !form.body.trim()) { setResult('⚠️ Pehle Title aur Message likhein.'); return }
    if (!testOnly && !window.confirm(`Pakka bhejein? Ye notification ${form.audience === 'all' ? 'SABKO' : form.audience === 'user' ? 'sirf USERS ko' : 'sirf PARTNERS ko'} jayega.`)) return
    setBusy(testOnly ? 'test' : 'send')
    setResult('')
    try {
      const accessToken = await getSessionAccessToken()
      if (!accessToken) { setResult('⚠️ Session nahi mila — logout karke dobara login karein.'); setBusy(''); return }
      const resp = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: form.title.trim(), body: form.body.trim(), url: form.url.trim() || '/', audience: form.audience, testOnly }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) setResult(`⚠️ ${data.error || 'Notification nahi bheja ja paya.'}`)
      else if (testOnly && data.total === 0) setResult('⚠️ Is device/account par notifications ON nahi hain — pehle baayein menu ke neeche bane 🔔 button se is device par ON karein, phir test bhejein.')
      else {
        setResult(`✔ Bhej diya gaya — ${data.sent} logo ko gaya, ${data.failed} fail (kul ${data.total} devices).`)
        toast('Notification bhej diya gaya 📣')
        refreshMeta()
      }
    } catch { setResult('⚠️ Server se sampark nahi ho paya — net check karke dobara koshish karein.') }
    setBusy('')
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>📣 Notifications — Offers Aur Updates Bhejein</h3>
      <p>Abhi kul <b>{count === null ? '…' : count}</b> devices par notifications ON hain. Neeche title/message likhein — bhejhte hi un sabke phone par ghanti bajegi.</p>
      {!ownSub && <p className="hint">ℹ️ Aapke apne account se is device par notifications ON nahi hain — Test bhejne se pehle baayein menu ke 🔔 button se ON kar lein.</p>}
      <form className="form-card wide" style={{ margin: 0 }} onSubmit={(e) => e.preventDefault()}>
        <label>Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="🎉 Special Offer!" maxLength={80} />
        <label>Message</label>
        <textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Is hafte Ganga Aarti packages par khaas chhoot — abhi quotation maangein!" maxLength={240} />
        <label>Tap Karne Par Kahan Khule (Link)</label>
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="chip" onClick={() => setForm({ ...form, url: '/packages' })}>🎁 Offers → /packages</button>
          <button type="button" className="chip" onClick={() => setForm({ ...form, url: '/app' })}>📲 App → /app</button>
          <button type="button" className="chip" onClick={() => setForm({ ...form, url: '/' })}>🏠 Home → /</button>
        </div>
        <label style={{ marginTop: 12 }}>Kisko Bhejein</label>
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
          <option value="all">Sabko (users + partners + mehman)</option>
          <option value="user">Sirf Users (grahak)</option>
          <option value="partner">Sirf Partners</option>
        </select>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => doSend(true)}>{busy === 'test' ? 'Test bhej rahe hain…' : '🔔 Pehle Test Bhejein (sirf mujhe)'}</button>
          <button type="button" className="btn btn-gold" disabled={!!busy} onClick={() => doSend(false)}>{busy === 'send' ? 'Bhej rahe hain…' : '📣 Sabko Bhejein'}</button>
        </div>
        {result && <div className={result.startsWith('✔') ? 'ok' : 'err'} style={{ marginTop: 14 }}>{result}</div>}
      </form>
      <p className="hint" style={{ marginTop: 12 }}>Tip: Pehle hamesha Test bhejein — apne phone par dekh lein ki notification kaisa dikhta hai, phir sabko bhejein.</p>
    </div>
  )
}

export default function AdminPanel() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('dash')
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [settingsForm, setSettingsForm] = useState(null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bookings, setBookings] = useState([])
  const [commissions, setCommissions] = useState(null)
  const [pctInputs, setPctInputs] = useState({})
  const [categories, setCategories] = useState([])
  const [catInputs, setCatInputs] = useState({})
  const [packages, setPackages] = useState([])
  const [pkgForm, setPkgForm] = useState(null)
  const [prodPrices, setProdPrices] = useState({})
  const [enquiries, setEnquiries] = useState([])
  const [refEarnings, setRefEarnings] = useState([])
  const [newCat, setNewCat] = useState({ slug: '', name: '', hindi: '', price: '', unit: 'per event' })
  const [msg, setMsg] = useState('')

  const load = async () => {
    setUsers(await store.listUsers())
    setProducts(await store.listProducts({}))
    setQuotations(await store.listQuotations({ all: true }))
    setBookings(await store.listBookings({ all: true }))
    setCommissions(await store.getCommissions())
    setCategories(await store.listCategories({ includeInactive: true }))
    setPackages(await store.listPackages({ includeInactive: true }))
    setEnquiries(await store.listEnquiries().catch(() => []))
    setRefEarnings(await store.listReferralEarnings({ all: true }))
    setPayments(await store.listPayments({ all: true }).catch(() => []))
    setSettingsForm(await store.getSettings().catch(() => null))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setStatus = async (b, s) => { await store.setBookingStatus(b.id, s); toast(`Booking status: ${BOOKING_STATUS_HI[s] || s}`); load() }
  const verifyPay = async (p) => { await store.verifyPayment(p.id); toast('Payment verified ✔'); load() }
  const saveSettings = async (e) => {
    e.preventDefault()
    if (!settingsForm) return
    const flat = Number(settingsForm.manual_booking_commission)
    if (Number.isNaN(flat) || flat < 0) { setMsg('⚠️ Manual booking commission sahi rakam mein likhein (₹0 ya zyada).'); return }
    setSettingsBusy(true)
    try {
      const saved = await store.updateSettings(settingsForm)
      setSettingsForm(saved)
      setMsg('✔ Site settings save ho gayi — contact details, payment aur commission site par live update ho gaye.')
      toast('Site settings save ✔')
    } catch (ex) { setMsg(`⚠️ ${ex.message || 'Settings save nahi ho payi.'}`) }
    setSettingsBusy(false)
  }
  const delProduct = async (p) => { if (confirm(`Admin: "${p.title}" delete karein?`)) { await store.deleteProduct(p.id); load() } }
  const saveProdPrice = async (p) => {
    const v = prodPrices[p.id]
    if (v === undefined || v === '' || Number(v) <= 0) { setMsg(`⚠️ "${p.title}" ke liye sahi price (₹0 se zyada) likhkar Save karein.`); return }
    await store.updateProductPrice(p.id, v)
    setMsg(`✔ "${p.title}" ka price ${inr(v)} ho gaya.`)
    load()
  }
  const saveCat = async (c) => {
    const inp = catInputs[c.slug] || {}
    const price = inp.price !== undefined && inp.price !== '' ? Number(inp.price) : c.startingPrice
    if (!(price > 0)) { setMsg(`⚠️ ${c.name} ka starting price ₹0 se zyada hona chahiye.`); return }
    const updated = await store.saveCategory({
      ...c,
      startingPrice: price,
      unit: inp.unit || c.unit,
      active: inp.active !== undefined ? inp.active : c.active,
    })
    setCategories(updated)
    setMsg(`✔ ${c.name} ka rate update ho gaya — ab site par ${inr(price)} se shuru dikhega.`)
  }
  const PKG_EMPTY = { name: '', hindi: '', price: '', unit: 'per event', image: '/images/hero-aarti.jpg', features: '', popular: false, active: true, sortOrder: packages.length }
  const savePkg = async (e) => {
    e.preventDefault()
    const price = Number(pkgForm.price)
    if (!pkgForm.name.trim() || !(price > 0)) { setMsg('⚠️ Package ka naam aur sahi price (₹0 se zyada) bharein.'); return }
    const features = String(pkgForm.features || '').split('\n').map((s) => s.trim()).filter(Boolean)
    const updated = await store.savePackage({ ...pkgForm, price, features, sortOrder: Number(pkgForm.sortOrder || 0) })
    setPackages(updated)
    setPkgForm(null)
    setMsg(`✔ Package "${pkgForm.name}" save ho gaya — site par live hai.`)
  }
  const editPkg = (p) => setPkgForm({ ...p, features: (p.features || []).join('\n') })
  const delPkg = async (p) => { if (confirm(`Package "${p.name}" delete karein?`)) { await store.deletePackage(p.id); setMsg(`Package "${p.name}" delete ho gaya.`); load() } }
  const createCat = async (e) => {
    e.preventDefault()
    const slug = newCat.slug.trim().toLowerCase()
    const price = Number(newCat.price)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setMsg('⚠️ Slug sirf chhote akshar, number aur hyphen mein ho — jaise: "phool-sajawat".'); return }
    if (categories.some((c) => c.slug === slug)) { setMsg(`⚠️ "${slug}" slug pehle se hai — doosra slug chunein.`); return }
    if (!newCat.name.trim() || !(price > 0)) { setMsg('⚠️ Category ka naam aur sahi starting price (₹0 se zyada) bharein.'); return }
    const updated = await store.saveCategory({ slug, name: newCat.name.trim(), hindi: newCat.hindi.trim(), startingPrice: price, unit: newCat.unit, active: true })
    setCategories(updated)
    setNewCat({ slug: '', name: '', hindi: '', price: '', unit: 'per event' })
    setMsg(`✔ Nayi category "${newCat.name.trim()}" ban gayi — site par /services/${slug} par live hai.`)
  }
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
        <div className="panel-head">
          <div>
            <h2>Admin Panel</h2>
            <p className="hint">{user.name} · Admin — poora platform control</p>
          </div>
        </div>
        <NotificationPromptBanner />
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
            <div className="stat"><b>{categories.length}</b><span>Categories</span></div>
            <div className="stat"><b>{enquiries.length}</b><span>Enquiries</span></div>
            <div className="stat"><b>{inr(refEarnings.reduce((s, r) => s + Number(r.amount), 0))}</b><span>Referral Kamai (partners ko)</span></div>
            <div className="stat"><b>{inr(payments.reduce((s, p) => s + Number(p.amount), 0))}</b><span>Advance Payments Aaye</span></div>
            <div className="stat"><b>{payments.filter((p) => p.status === 'pending').length}</b><span>UPI Payments Verify Baaki</span></div>
            <div className="stat"><b>{bookings.filter((b) => b.source === 'manual').length}</b><span>Manual Bookings</span></div>
            <div className="stat"><b>{bookings.filter((b) => b.status === 'pending_partner').length}</b><span>Partner Jawab Baaki Bookings</span></div>
          </div>
        )}
        <div className="panel">
          <aside className="side">
            <span className="side-group">Manage</span>
            <button className={tab === 'dash' ? 'active' : ''} onClick={() => setTab('dash')}>Dashboard</button>
            <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Saari Bookings</button>
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>Saari Quotations</button>
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users & Partners</button>
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products Moderation</button>
            <span className="side-group">Catalog Aur Commission</span>
            <button className={tab === 'prices' ? 'active' : ''} onClick={() => setTab('prices')}>Categories & Prices</button>
            <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>Packages Editor</button>
            <button className={tab === 'commission' ? 'active' : ''} onClick={() => setTab('commission')}>Commission Control</button>
            <span className="side-group">Payments Aur System</span>
            <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payments ({payments.length})</button>
            <button className={tab === 'referrals' ? 'active' : ''} onClick={() => setTab('referrals')}>Referrals</button>
            <button className={tab === 'enquiries' ? 'active' : ''} onClick={() => setTab('enquiries')}>Enquiries ({enquiries.length})</button>
            <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Site Settings</button>
            <button className={tab === 'notify' ? 'active' : ''} onClick={() => setTab('notify')}>Notifications</button>
            <div className="push-toggle-wrap"><NotificationToggle userId={user ? user.id : null} className="btn btn-ghost btn-sm" /></div>
          </aside>
          <div>
            {loading && <Spinner />}
            {tab === 'dash' && <p>Namaste Admin 🙏 — baayein menu se bookings, quotations, users, products aur commission manage karein. <b>Category Prices</b> se har seva ka starting rate aur <b>Packages Editor</b> se Ganga Aarti packages ke price/features site par live badlein. Upar kul aankde dikh rahe hain.</p>}

            {tab === 'dash' && (
              <div style={{ marginTop: 22 }}>
                <h3>🏷️ Saari Prices — Ek Nazar Mein ({products.length} products)</h3>
                <p className="hint">Har category ka admin-set starting rate aur partners ke live products ki price range (sabse sasta – sabse mehenga). Kisi product ki price badalni ho to <b>Products Moderation</b>, category rate ke liye <b>Categories & Prices</b>, package ke liye <b>Packages Editor</b> kholein.</p>
                <div className="table-wrap"><table>
                  <thead><tr><th>Category</th><th>Starting Price (Admin-Set)</th><th>Live Products</th><th>Products Ki Price Range</th><th>Packages</th></tr></thead>
                  <tbody>{categories.map((c) => {
                    const ps = products.filter((p) => p.category === c.slug)
                    const prices = ps.map((p) => Number(p.price))
                    const pkgs = packages.filter((pk) => pk.category === c.slug)
                    return (
                      <tr key={c.slug}>
                        <td><b>{c.icon} {c.name}</b></td>
                        <td><b>{inr(c.startingPrice)}</b> <span className="hint">{c.unit}</span></td>
                        <td>{ps.length}</td>
                        <td>{prices.length ? `${inr(Math.min(...prices))} – ${inr(Math.max(...prices))}` : '—'}</td>
                        <td>{pkgs.length ? pkgs.map((pk) => `${pk.name}: ${inr(pk.price)}`).join(' · ') : '—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table></div>
              </div>
            )}

            {tab === 'bookings' && (
              bookings.length === 0 ? <p>Koi booking nahi hai.</p> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Service</th><th>Grahak → Partner</th><th>Date / Jagah</th><th>Rakam</th><th>Commission</th><th>Payment</th><th>Stage / Status</th><th>Action</th></tr></thead>
                  <tbody>{sortByEventDate(bookings).map((b) => {
                    const e = commissions ? partnerEarning(b, commissions) : { commission: 0, pct: 0 }
                    return (
                      <tr key={b.id}>
                        <td><b>{b.title}</b>{b.source === 'manual' && <span className="badge" style={{ marginLeft: 6 }}>✍️ Manual</span>}{b.source === 'storefront' && <span className="badge" style={{ marginLeft: 6 }}>🏪 Website</span>}<br /><span className="hint">{categoryBySlug(b.category)?.name}</span></td>
                        <td>{b.userName}<br /><span className="hint">→ {b.partnerName}</span></td>
                        <td>{fmtDate(b.date)}<br /><span className="hint">{b.city}{b.venue ? ` — ${b.venue}` : ''}</span></td>
                        <td>{inr(b.amount)}</td><td>{e.flat ? `${inr(e.commission)} flat` : `${inr(e.commission)} (${e.pct}%)`}</td>
                        <td><span className={`status ${b.paymentStatus === 'unpaid' ? 'pending' : 'confirmed'}`}>{PAY_HI[b.paymentStatus] || b.paymentStatus}</span>{b.paymentStatus !== 'unpaid' && <><br /><span className="hint">{inr(b.advanceAmount)} · {b.paymentMethod}</span></>}</td>
                        <td><span className={`status ${effectiveBookingStatus(b)}`}>{BOOKING_STATUS_HI[effectiveBookingStatus(b)] || b.status}</span>{b.status === 'rejected' && b.rejectReason && <><br /><span className="hint">Kaaran: {b.rejectReason}</span></>}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {['pending', 'pending_partner', 'pending_customer'].includes(b.status) && <button className="btn btn-green btn-sm" onClick={() => setStatus(b, 'confirmed')}>Confirm</button>}{' '}
                          {b.status === 'confirmed' && <button className="btn btn-maroon btn-sm" onClick={() => setStatus(b, 'completed')}>Complete</button>}{' '}
                          {!['cancelled', 'completed', 'rejected'].includes(b.status) && <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, 'cancelled')}>Cancel</button>}
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table></div>
              )
            )}

            {tab === 'payments' && (
              <div>
                <h3 style={{ marginTop: 0 }}>💳 Payments — Advance Hisaab</h3>
                <p className="hint">Grahakon ke advance payments. <b>UPI</b> wale pehle <b>Pending</b> rehte hain — grahak ki di hui Transaction ID ko apne UPI app/bank mein milaan karke <b>Verify</b> dabayein. <b>Razorpay</b> payments pehle se verified aate hain.</p>
                {payments.length === 0 ? (
                  <div className="empty-state"><p>💳 Abhi koi payment nahi aaya hai.</p><p className="hint">Jab grahak booking par advance denge, entries yahan dikhengi.</p></div>
                ) : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Tareekh</th><th>Booking / Grahak</th><th>Rakam</th><th>Madhyam</th><th>Transaction ID</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>{payments.map((p) => {
                      const bk = bookings.find((x) => x.id === p.bookingId)
                      return (
                        <tr key={p.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td><b>{bk?.title || 'Booking'}</b><br /><span className="hint">{bk?.userName || ''} · kul {bk ? inr(bk.amount) : ''}</span></td>
                          <td><b>{inr(p.amount)}</b></td>
                          <td>{p.method === 'razorpay' ? '💳 Razorpay' : '📱 UPI'}</td>
                          <td><code>{p.txnId || '—'}</code></td>
                          <td><span className={`status ${p.status === 'verified' ? 'confirmed' : 'pending'}`}>{p.status === 'verified' ? 'Verified ✔' : 'Pending — milaan baaki'}</span></td>
                          <td>{p.status === 'pending' && <button className="btn btn-green btn-sm" onClick={() => verifyPay(p)}>✔ Verify Karein</button>}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table></div>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div>
                <h3 style={{ marginTop: 0 }}>⚙️ Site Settings</h3>
                <p className="hint">Ye details poori site par live dikhti hain — header, footer, Contact page, WhatsApp button aur payments mein. Badlav save karte hi lagu ho jata hai.</p>
                {!settingsForm ? <Spinner label="Settings load ho rahi hain…" /> : (
                  <form className="form-card wide" style={{ margin: 0 }} onSubmit={saveSettings}>
                    <h3>📞 Sampark Details</h3>
                    <div className="form-row">
                      <div><label>Contact Phone</label><input value={settingsForm.contact_phone} onChange={(e) => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })} placeholder="Jaise: +91 94150 00001" /></div>
                      <div><label>Contact Email</label><input type="email" value={settingsForm.contact_email} onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })} placeholder="Jaise: namaste@example.in" /></div>
                    </div>
                    <div className="form-row">
                      <div><label>WhatsApp Number (country code ke saath, sirf digits)</label><input value={settingsForm.whatsapp} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })} placeholder="Jaise: 919415000001" /></div>
                      <div><label>Manual Booking Commission — Flat ₹</label><input type="number" min={0} value={settingsForm.manual_booking_commission} onChange={(e) => setSettingsForm({ ...settingsForm, manual_booking_commission: e.target.value })} placeholder="50" /></div>
                    </div>
                    <h3 style={{ marginTop: 22 }}>💳 Payment Settings</h3>
                    <div className="form-row">
                      <div><label>UPI ID (advance payment ke liye)</label><input value={settingsForm.upi_id} onChange={(e) => setSettingsForm({ ...settingsForm, upi_id: e.target.value })} placeholder="Jaise: aapka@okhdfcbank — khali ho to UPI option chhupa rahega" /></div>
                      <div><label>Razorpay Key ID (public — rzp_live_… / rzp_test_…)</label><input value={settingsForm.razorpay_key_id} onChange={(e) => setSettingsForm({ ...settingsForm, razorpay_key_id: e.target.value })} placeholder="Khali ho to Razorpay button nahi dikhega" /></div>
                    </div>
                    <p className="hint">⚠️ Sirf Razorpay ki <b>Key ID</b> (public) yahan daalein — <b>Secret Key kabhi nahi</b>. Secret key website ke code mein kabhi nahi jaati; asli payment verification ke liye aage chal kar server/edge function lagega.</p>
                    <button className="btn btn-gold" disabled={settingsBusy}>{settingsBusy ? 'Save ho raha hai…' : '✔ Settings Save Karein'}</button>
                  </form>
                )}
              </div>
            )}

            {tab === 'quotes' && (
              quotations.length === 0 ? <p>Koi quotation nahi hai.</p> :
              sortByEventDate(quotations).map((q) => (
                <div className="card" key={q.id} style={{ marginBottom: 14 }}>
                  <div className="body">
                    <h3>{categoryBySlug(q.category)?.icon} {q.title || categoryBySlug(q.category)?.name} <span className={`status ${q.status}`}>{q.status}</span></h3>
                    <p className="hint">👤 {q.userName} · 📅 {fmtDate(q.date)} · 📍 {q.city}{q.venue ? ` — ${q.venue}` : ''} · 👥 {q.guests}</p>
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
              <div>
                <p className="hint" style={{ marginTop: 0 }}>Kisi bhi partner ke product ka price yahin se badal sakte hain — naya price likhkar <b>Price Save</b> dabayein, site par turant update ho jayega.</p>
                <div className="table-wrap"><table>
                  <thead><tr><th>Product</th><th>Partner</th><th>Category</th><th>Price (₹) — Edit Karein</th><th>Commission / Partner Ko Milega</th><th>Action</th></tr></thead>
                  <tbody>{products.map((p) => {
                    const pct = commissions ? (commissions.byPartner[p.partnerId] != null ? Number(commissions.byPartner[p.partnerId]) : commissions.byCategory[p.category] != null ? Number(commissions.byCategory[p.category]) : Number(commissions.defaultPct)) : 0
                    const net = Number(p.price) - Math.round((Number(p.price) * pct) / 100)
                    return (
                    <tr key={p.id}><td><b>{p.title}</b>{p.active === false && <span className="badge" style={{ marginLeft: 6 }}>hidden</span>}</td><td>{p.partnerName}</td><td>{categoryBySlug(p.category)?.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="number" min={1} style={{ width: 110 }} defaultValue={p.price} onChange={(e) => setProdPrices({ ...prodPrices, [p.id]: e.target.value })} aria-label={`${p.title} ka price`} />
                          <button className="btn btn-maroon btn-sm" onClick={() => saveProdPrice(p)}>Price Save</button>
                        </div>
                        <span className="hint">{p.unit} · abhi {inr(p.price)}</span>
                      </td>
                      <td>{pct}% katkar<br /><b>{inr(net)}</b> <span className="hint">partner ko</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => delProduct(p)}>Delete</button></td></tr>
                    )
                  })}</tbody>
                </table></div>
              </div>
            )}

            {tab === 'prices' && (
              <div>
                <h3 style={{ marginTop: 0 }}>🏷️ Categories & Starting Prices</h3>
                <p className="hint">Ye wahi "₹… se shuru" rate hai jo Home, Services aur har category page par dikhta hai. Badla hua rate site par turant lagu hota hai. Kisi category ko band karne ke liye <b>Active</b> ka tick hatayein — wo site se gayab ho jayegi.</p>
                <form className="form-card wide" style={{ margin: '0 0 20px' }} onSubmit={createCat}>
                  <h3>➕ Nayi Category Banayein</h3>
                  <div className="form-row">
                    <div><label>Naam</label><input required value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Jaise: Phool Sajawat" /></div>
                    <div><label>Hindi Naam</label><input value={newCat.hindi} onChange={(e) => setNewCat({ ...newCat, hindi: e.target.value })} placeholder="फूल सजावट" /></div>
                  </div>
                  <div className="form-row">
                    <div><label>Slug (URL — chhote akshar, hyphen)</label><input required value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} placeholder="phool-sajawat" /></div>
                    <div><label>Starting Price (₹)</label><input type="number" min={1} required value={newCat.price} onChange={(e) => setNewCat({ ...newCat, price: e.target.value })} placeholder="5100" /></div>
                  </div>
                  <div className="form-row">
                    <div><label>Unit</label>
                      <select value={newCat.unit} onChange={(e) => setNewCat({ ...newCat, unit: e.target.value })}>
                        <option>per event</option><option>per day</option><option>per plate</option><option>per hour</option>
                      </select></div>
                    <div style={{ display: 'flex', alignItems: 'end' }}><button className="btn btn-gold" style={{ width: '100%' }}>Category Banayein</button></div>
                  </div>
                  <p className="hint" style={{ marginBottom: 0 }}>Nayi category site par apne page (/services/slug) ke saath turant dikhegi — partners us category mein apne products add kar sakenge.</p>
                </form>
                <div className="table-wrap"><table>
                  <thead><tr><th>Category</th><th>Abhi Ka Rate</th><th>Naya Starting Price (₹)</th><th>Unit</th><th>Active</th><th></th></tr></thead>
                  <tbody>{categories.map((c) => {
                    const inp = catInputs[c.slug] || {}
                    return (
                      <tr key={c.slug}>
                        <td><b>{c.icon} {c.name}</b><br /><span className="hint">{c.hindi}</span></td>
                        <td>{inr(c.startingPrice)} <span className="hint">{c.unit}</span></td>
                        <td><input type="number" min={1} style={{ width: 130 }} defaultValue={c.startingPrice} onChange={(e) => setCatInputs({ ...catInputs, [c.slug]: { ...inp, price: e.target.value } })} aria-label={`${c.name} ka starting price`} /></td>
                        <td>
                          <select style={{ width: 130 }} defaultValue={c.unit} onChange={(e) => setCatInputs({ ...catInputs, [c.slug]: { ...inp, unit: e.target.value } })}>
                            <option>per event</option><option>per day</option><option>per plate</option><option>per hour</option>
                          </select>
                        </td>
                        <td><input type="checkbox" style={{ width: 20, height: 20 }} defaultChecked={c.active} onChange={(e) => setCatInputs({ ...catInputs, [c.slug]: { ...inp, active: e.target.checked } })} aria-label={`${c.name} active`} /></td>
                        <td><button className="btn btn-gold btn-sm" onClick={() => saveCat(c)}>Save</button></td>
                      </tr>
                    )
                  })}</tbody>
                </table></div>
              </div>
            )}

            {tab === 'packages' && (
              <div>
                <h3 style={{ marginTop: 0 }}>🎁 Ganga Aarti Packages Editor</h3>
                <p className="hint">Ye packages Home page aur Packages page par dikhte hain. Naam, price, features (har line mein ek feature) aur active/popular yahin se badlein. <b>Most Booked</b> wala package site par highlight hota hai.</p>
                {pkgForm ? (
                  <form className="form-card wide" style={{ margin: '0 0 20px' }} onSubmit={savePkg}>
                    <h3>{pkgForm.id ? '✏️ Package Edit Karein' : '➕ Naya Package'}</h3>
                    <div className="form-row">
                      <div><label>Package Ka Naam</label><input required value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="Jaise: Family Ganga Aarti" /></div>
                      <div><label>Hindi Naam (vaikalpik)</label><input value={pkgForm.hindi || ''} onChange={(e) => setPkgForm({ ...pkgForm, hindi: e.target.value })} placeholder="पारिवारिक गंगा आरती" /></div>
                    </div>
                    <div className="form-row">
                      <div><label>Price (₹)</label><input type="number" min={1} required value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} /></div>
                      <div><label>Unit</label>
                        <select value={pkgForm.unit} onChange={(e) => setPkgForm({ ...pkgForm, unit: e.target.value })}>
                          <option>per event</option><option>per day</option><option>per plate</option><option>per hour</option>
                        </select></div>
                    </div>
                    <div className="form-row">
                      <div><label>Image URL</label><input value={pkgForm.image || ''} onChange={(e) => setPkgForm({ ...pkgForm, image: e.target.value })} placeholder="/images/hero-aarti.jpg" /></div>
                      <div><label>Sort Order (0 = pehle)</label><input type="number" min={0} value={pkgForm.sortOrder ?? 0} onChange={(e) => setPkgForm({ ...pkgForm, sortOrder: e.target.value })} /></div>
                    </div>
                    <label>Features — har line mein ek</label>
                    <textarea rows={6} value={pkgForm.features} onChange={(e) => setPkgForm({ ...pkgForm, features: e.target.value })} placeholder={'7 purohiton dwara bhavya Ganga Aarti\nPrasad samagri shamil'} />
                    <div style={{ display: 'flex', gap: 22, marginTop: 12, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}><input type="checkbox" style={{ width: 19, height: 19 }} checked={!!pkgForm.popular} onChange={(e) => setPkgForm({ ...pkgForm, popular: e.target.checked })} /> ⭐ Most Booked (highlight)</label>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}><input type="checkbox" style={{ width: 19, height: 19 }} checked={pkgForm.active !== false} onChange={(e) => setPkgForm({ ...pkgForm, active: e.target.checked })} /> Active (site par dikhe)</label>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button className="btn btn-gold">{pkgForm.id ? 'Update Karein' : 'Package Add Karein'}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setPkgForm(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <p><button className="btn btn-gold" onClick={() => setPkgForm(PKG_EMPTY)}>➕ Naya Package Add Karein</button></p>
                )}
                <div className="table-wrap"><table>
                  <thead><tr><th>Package</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{packages.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b>{p.popular && <span className="badge popular" style={{ marginLeft: 6 }}>⭐ Most Booked</span>}<br /><span className="hint">{(p.features || []).length} features · order {p.sortOrder}</span></td>
                      <td>{inr(p.price)} <span className="hint">{p.unit}</span></td>
                      <td>{p.active ? <span className="status confirmed">active</span> : <span className="status cancelled">band</span>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-maroon btn-sm" onClick={() => editPkg(p)}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => delPkg(p)}>Delete</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table></div>
                {packages.length === 0 && <p className="hint">Abhi koi package nahi hai — naya package add karein.</p>}
              </div>
            )}

            {tab === 'commission' && commissions && (
              <div>
                <h3 style={{ marginTop: 0 }}>💰 Commission Control</h3>
                <p className="hint">Platform ki kamai yahin se tay hoti hai — <b>Default %</b> sab par, <b>Category %</b> us seva par, aur <b>Partner %</b> sirf us partner par (sabse zyada prathmikta). Partner ko apne panel mein booking par commission katne ke baad ki kamai saaf dikhti hai.</p>
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

            {tab === 'referrals' && (
              <div>
                <h3 style={{ marginTop: 0 }}>🔗 Referrals — Partner Laao, Kamai Paao</h3>
                <p className="hint">Har partner ke paas apna referral code/link hai. Uske link se judne wale naye partner ki <b>har booking par {REFERRAL_PCT}%</b> referrer ko milta hai — naye partner ke judne ki tareekh se <b>poore 1 saal (12 mahine)</b> tak. Neeche saare referral jode aur unki kamai hai.</p>
                {partners.filter((p) => p.referredBy).length === 0 ? <p>Abhi koi partner referral se nahi juda hai.</p> : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Referrer (kamai wala)</th><th>Referred Partner (naya)</th><th>Judne Ki Tareekh</th><th>1 Saal Ki Expiry</th><th>Bookings</th><th>Referrer Ki Kul Kamai ({REFERRAL_PCT}%)</th></tr></thead>
                    <tbody>{partners.filter((p) => p.referredBy).map((p) => {
                      const referrer = users.find((u) => u.id === p.referredBy)
                      const mine = refEarnings.filter((r) => r.referredPartnerId === p.id && r.referrerId === p.referredBy)
                      const total = mine.reduce((s, r) => s + Number(r.amount), 0)
                      const exp = referralExpiry(p)
                      const active = exp && new Date() < exp
                      return (
                        <tr key={p.id}>
                          <td><b>{referrer?.businessName || referrer?.name || '—'}</b><br /><span className="hint">{referrer?.referralCode || ''}</span></td>
                          <td><b>{p.businessName || p.name}</b><br /><span className="hint">{p.email} · code: {p.referralCode || '—'}</span></td>
                          <td>{p.referralSince ? new Date(p.referralSince).toLocaleDateString('en-IN') : '—'}</td>
                          <td>{exp ? exp.toLocaleDateString('en-IN') : '—'}<br /><span className={`status ${active ? 'confirmed' : 'cancelled'}`}>{active ? 'active' : 'khatam'}</span></td>
                          <td>{mine.length}</td>
                          <td><b>{inr(total)}</b></td>
                        </tr>
                      )
                    })}</tbody>
                  </table></div>
                )}
                <h3 style={{ marginTop: 26 }}>Saari Referral Kamai (Ledger)</h3>
                {refEarnings.length === 0 ? <p className="hint">Abhi ledger mein koi entry nahi hai.</p> : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Tareekh</th><th>Referrer</th><th>Referred Partner</th><th>Kamai</th></tr></thead>
                    <tbody>{refEarnings.map((r) => {
                      const referrer = users.find((u) => u.id === r.referrerId)
                      const referred = users.find((u) => u.id === r.referredPartnerId)
                      return (
                        <tr key={r.id}><td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td><td>{referrer?.businessName || referrer?.name || r.referrerId}</td><td>{referred?.businessName || referred?.name || r.referredPartnerId}</td><td><b>{inr(r.amount)}</b></td></tr>
                      )
                    })}</tbody>
                  </table></div>
                )}
              </div>
            )}

            {tab === 'notify' && <NotificationsTab user={user} />}

            {tab === 'enquiries' && (
              enquiries.length === 0 ? <p>Abhi koi enquiry nahi aayi hai. Contact page se bheje gaye sandesh yahan dikhte hain.</p> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Tareekh</th><th>Naam</th><th>Mobile</th><th>Email</th><th>Sandesh</th></tr></thead>
                  <tbody>{enquiries.map((e) => (
                    <tr key={e.id}><td style={{ whiteSpace: 'nowrap' }}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '—'}</td><td><b>{e.name}</b></td><td>{e.phone}</td><td>{e.email || '—'}</td><td>{e.message}</td></tr>
                  ))}</tbody>
                </table></div>
              )
            )}
          </div>
        </div>
      </section>
    </>
  )
}
