import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import { useAuth, dashboardPath } from '../context/AuthContext'
import { CATEGORIES } from '../data/catalog'
import { DEMO_LOGINS, isSupabaseMode } from '../lib/store'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const u = await signIn(email, password)
      navigate(params.get('next') || dashboardPath(u))
    } catch (ex) { setErr(ex.message) }
  }
  return (
    <>
      <Seo title="Login | Ganga Aarti Booking" description="Ganga Aarti Booking par login karein — apni quotations, bookings aur partner panel dekhein." path="/login" />
      <section className="section wrap">
        <div className="form-card">
          <h2 style={{ textAlign: 'center' }}>🪔 Login</h2>
          {err && <div className="err">{err}</div>}
          <form onSubmit={submit}>
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button className="btn btn-gold" style={{ width: '100%', marginTop: 18 }}>Login Karein</button>
          </form>
          <Link className="btn btn-ghost" to="/signup" style={{ width: '100%', marginTop: 16 }}>🙏 Account Nahi Hai? Free Sign Up Karein</Link>
          <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>Sign up bilkul free hai — User bankar booking karein ya Partner bankar apni sevayein jodein.</p>
          {!isSupabaseMode && (
            <div className="reply-box">
              <b>Demo Mode</b> — ye login turant kaam karenge:
              {DEMO_LOGINS.map((d) => <p key={d.email} style={{ margin: '4px 0' }}>{d.label}:<br /><code>{d.email}</code> / <code>{d.password}</code></p>)}
              <p className="hint">Note: Sign up se banaya gaya PEHLA account Admin banega.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

// ── /signup — sirf CHOICE page ──────────────────────────────────────────────
// User aur Partner ka sign up ab alag-alag page par hai (/signup/user aur
// /signup/partner) taaki koi confuse na ho. Referral link (?ref=) sirf
// partners ke liye hota hai — ref ke saath aane par seedha partner wale
// page par bhej dete hain, code wahan apne aap bhar jata hai.
export function SignupChoice() {
  const [params] = useSearchParams()
  const ref = params.get('ref')
  if (ref) return <Navigate to={`/signup/partner?ref=${encodeURIComponent(ref)}`} replace />
  return (
    <>
      <Seo title="Sign Up | Ganga Aarti Booking — User ya Partner Account Banayein" description="Free account banayein — user bankar quotation aur booking karein, ya partner (vendor) bankar apni wedding services bechna shuru karein." path="/signup" />
      <section className="section wrap">
        <div className="form-card wide" style={{ margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center' }}>🙏 Sign Up — Aap Kaun Hain?</h2>
          <p className="hint" style={{ textAlign: 'center' }}>Apna sahi vikalp chunein — dono ka sign up alag hai, dono bilkul free hain.</p>
          <div className="role-cards signup-choice">
            <Link className="role-card" to="/signup/user">
              <span className="role-card-icon" aria-hidden="true">👤</span>
              <span><b>User (Grahak)</b><small>Shaadi ki booking ke liye — quotation maangein, rate compare karein, booking pakki karein</small></span>
            </Link>
            <Link className="role-card" to="/signup/partner">
              <span className="role-card-icon" aria-hidden="true">🏪</span>
              <span><b>Partner (Vendor)</b><small>Apni seva jodne ke liye — aarti, pandit, gaadi, tent, DJ… apne products bechiye</small></span>
            </Link>
          </div>
          <Link className="btn btn-ghost" to="/login" style={{ width: '100%', marginTop: 16 }}>Pehle Se Account Hai? Login Karein</Link>
        </div>
      </section>
    </>
  )
}

// ── Asli sign up form — role FIXED milta hai (/signup/user ya
// /signup/partner se); is page par role badalne ka koi card nahi hai.
export function Signup({ fixedRole = 'user' }) {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isPartner = fixedRole === 'partner'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: fixedRole, phone: '', city: 'Varanasi', businessName: '', referralCode: params.get('ref') || '', roles: [], whatsapp: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggleRole = (slug) => setForm({ ...form, roles: form.roles.includes(slug) ? form.roles.filter((r) => r !== slug) : [...form.roles, slug] })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const u = await signUp(form)
      navigate(dashboardPath(u))
    } catch (ex) { setErr(ex.message) }
  }
  return (
    <>
      <Seo
        title={isPartner ? 'Partner Sign Up | Ganga Aarti Booking — Apni Seva Bechiye' : 'Customer Sign Up | Ganga Aarti Booking — Shaadi Ki Booking Ke Liye'}
        description={isPartner ? 'Partner (vendor) bankar free account banayein — apni wedding services jodein, quotation aur booking paayein.' : 'User bankar free account banayein — shaadi ke liye quotation maangein, rate compare karein aur booking pakki karein.'}
        path={isPartner ? '/signup/partner' : '/signup/user'}
      />
      <section className="section wrap">
        <div className="form-card">
          <h2 style={{ textAlign: 'center' }}>{isPartner ? '🏪 Partner Sign Up — Apni Seva Bechne Ke Liye' : '👤 Customer Sign Up — Booking Ke Liye'}</h2>
          <p className="hint" style={{ textAlign: 'center' }}>
            {isPartner
              ? <>Galti se aa gaye? Booking karni hai to <Link to="/signup/user">Customer Sign Up</Link> karein.</>
              : <>Seva bechni hai? <Link to="/signup/partner">Partner Sign Up</Link> karein.</>}
          </p>
          <p className="hint" style={{ textAlign: 'center' }}>Sabse pehle register karne wala account <b>Admin</b> banta hai.</p>
          {err && <div className="err">{err}</div>}
          <form onSubmit={submit}>
            <label>{form.role === 'partner' ? 'Business / Firm Ka Naam' : 'Poora Naam'}</label>
            <input required value={form.name} onChange={set('name')} placeholder={form.role === 'partner' ? 'Jaise: Sharma Wedding Events' : 'Aapka naam'} />
            {form.role === 'partner' && (<><label>Malik / Sampark Vyakti</label><input value={form.businessName} onChange={set('businessName')} placeholder="Sampark vyakti ka naam (vaikalpik)" /></>)}
            {form.role === 'partner' && (
              <fieldset className="roles-box">
                <legend>🛠️ Aap Kaunsi Sevayein Denge? Ek Se Zyada Chun Sakte Hain</legend>
                <div className="roles-grid">
                  {CATEGORIES.map((c) => (
                    <label key={c.slug} className={`role-chip${form.roles.includes(c.slug) ? ' on' : ''}`}>
                      <input type="checkbox" checked={form.roles.includes(c.slug)} onChange={() => toggleRole(c.slug)} />
                      {c.icon} {c.name}
                    </label>
                  ))}
                </div>
                <p className="hint" style={{ margin: '6px 0 0' }}>Jaise aap Pandit Ji bhi hain aur DJ bhi — dono chun lein. Panel mein aapki sevayein isi hisaab se dikhengi; baad mein Profile se badal bhi sakte hain.</p>
              </fieldset>
            )}
            <label>Email</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="Kam se kam 6 akshar" />
            <div className="form-row">
              <div><label>Mobile</label><input value={form.phone} onChange={set('phone')} placeholder="+91 ..." /></div>
              <div><label>Shahar</label><input value={form.city} onChange={set('city')} placeholder="Varanasi" /></div>
            </div>
            {form.role === 'partner' && (
              <>
                <label>📱 WhatsApp Number</label>
                <input value={form.whatsapp} onChange={set('whatsapp')} placeholder="Jaise: 94150 00001 — khali chhodein to Mobile hi WhatsApp hoga" />
                <p className="hint" style={{ margin: '4px 0 0' }}>Aapki storefront website par grahak is number par seedha WhatsApp kar sakenge.</p>
              </>
            )}
            {form.role === 'partner' && (
              <>
                <label>Referral Code (vaikalpik)</label>
                <input value={form.referralCode} onChange={set('referralCode')} placeholder="Jaise: GAB-KASHI" style={{ textTransform: 'uppercase' }} />
                <p className="hint" style={{ margin: '4px 0 0' }}>
                  {params.get('ref')
                    ? '🎉 Aap kisi partner ke referral link se aaye hain — code apne aap bhar gaya hai.'
                    : 'Kisi partner ne aapko bulaya hai? Unka referral code yahan daalein.'}
                </p>
              </>
            )}
            <button className="btn btn-gold" style={{ width: '100%', marginTop: 18 }}>Account Banayein</button>
          </form>
          <Link className="btn btn-ghost" to="/login" style={{ width: '100%', marginTop: 16 }}>Pehle Se Account Hai? Login Karein</Link>
        </div>
      </section>
    </>
  )
}
