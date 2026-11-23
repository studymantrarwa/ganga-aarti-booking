import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import { useAuth, dashboardPath } from '../context/AuthContext'
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
          <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>Account nahi hai? <Link to="/signup">Sign Up karein</Link></p>
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

export function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phone: '', city: '', businessName: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const u = await signUp(form)
      navigate(dashboardPath(u))
    } catch (ex) { setErr(ex.message) }
  }
  return (
    <>
      <Seo title="Sign Up | Ganga Aarti Booking — User ya Partner Account Banayein" description="Free account banayein — user bankar quotation aur booking karein, ya partner (vendor) bankar apni wedding services bechna shuru karein." path="/signup" />
      <section className="section wrap">
        <div className="form-card">
          <h2 style={{ textAlign: 'center' }}>🙏 Sign Up — Free Account</h2>
          <p className="hint" style={{ textAlign: 'center' }}>Sabse pehle register karne wala account <b>Admin</b> banta hai.</p>
          {err && <div className="err">{err}</div>}
          <form onSubmit={submit}>
            <label>Account Type</label>
            <select value={form.role} onChange={set('role')}>
              <option value="user">👨‍👩‍👧 User — Mujhe shaadi ke liye booking karni hai</option>
              <option value="partner">🏪 Partner (Vendor) — Main services deta hoon (aarti, gaadi, tent, DJ…)</option>
            </select>
            <label>{form.role === 'partner' ? 'Business / Firm Ka Naam' : 'Poora Naam'}</label>
            <input required value={form.name} onChange={set('name')} placeholder={form.role === 'partner' ? 'Jaise: Sharma Wedding Events' : 'Aapka naam'} />
            {form.role === 'partner' && (<><label>Malik / Sampark Vyakti</label><input value={form.businessName} onChange={set('businessName')} placeholder="Sampark vyakti ka naam (vaikalpik)" /></>)}
            <label>Email</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="Kam se kam 6 akshar" />
            <div className="form-row">
              <div><label>Mobile</label><input value={form.phone} onChange={set('phone')} placeholder="+91 ..." /></div>
              <div><label>Shahar</label><input value={form.city} onChange={set('city')} placeholder="Varanasi" /></div>
            </div>
            <button className="btn btn-gold" style={{ width: '100%', marginTop: 18 }}>Account Banayein</button>
          </form>
          <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>Pehle se account hai? <Link to="/login">Login karein</Link></p>
        </div>
      </section>
    </>
  )
}
