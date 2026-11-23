import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, dashboardPath } from '../context/AuthContext'
import { CATEGORIES, SITE } from '../data/catalog'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const out = async () => { await signOut(); navigate('/') }
  return (
    <div className="app">
      <div className="topbar">
        <span>🪔 Varanasi · Lucknow · Prayagraj · Jaunpur · Gorakhpur · Ayodhya</span>
        <span>📞 {SITE.phone} · ✉️ {SITE.email}</span>
      </div>
      <header className="header">
        <Link to="/" className="brand">
          <span className="brand-icon">🪔</span>
          <span className="brand-text">Ganga Aarti <em>Booking</em><small>Shaadi ki poori vyavastha · Kashi se</small></span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/packages">Packages</NavLink>
          <NavLink to="/gallery">Gallery</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
        <div className="header-actions">
          <a className="btn btn-ghost btn-sm hide-sm" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>📞 Call Karein</a>
          {user ? (
            <>
              <Link className="btn btn-gold btn-sm" to={dashboardPath(user)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</Link>
              <button className="btn btn-ghost btn-sm" onClick={out}>Logout ({user.name.split(' ')[0]})</button>
            </>
          ) : (
            <>
              <Link className="btn btn-gold btn-sm" to="/dashboard/quote">📋 Free Quotation</Link>
              <Link className="btn btn-ghost btn-sm" to="/login">Login</Link>
              <Link className="btn btn-maroon btn-sm hide-sm" to="/signup">Sign Up Free</Link>
            </>
          )}
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h4>🪔 Ganga Aarti Booking</h4>
            <p>Shaadi mein Ganga Aarti aur poori wedding vyavastha — Pandit Ji, gaadi, tent, DJ, catering, photography, band baja. Ek hi jagah, sahi rate, pakki booking.</p>
            <p className="footer-trust">🛡️ Verified Partners · 💰 Saaf Rate, Koi Chhupa Charge Nahi · 🕕 Samay Par Seva</p>
            <Link className="btn btn-gold btn-sm" to="/dashboard/quote" style={{ marginTop: 10 }}>📋 Free Quotation Maangein</Link>
          </div>
          <div>
            <h4>Hamari Sevayein</h4>
            {CATEGORIES.map((c) => <Link key={c.slug} to={`/services/${c.slug}`}>{c.icon} {c.name}</Link>)}
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/services">Saari Sevayein</Link>
            <Link to="/packages">Wedding Packages</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/about">Hamare Baare Mein</Link>
            <Link to="/faq">Aksar Puche Sawal</Link>
            <Link to="/signup">Partner Banein</Link>
            <Link to="/login">Login</Link>
          </div>
          <div>
            <h4>Seva Kshetra</h4>
            <Link to="/services">📍 Varanasi (Mukhyalaya)</Link>
            <Link to="/services">📍 Lucknow</Link>
            <Link to="/services">📍 Prayagraj</Link>
            <Link to="/services">📍 Jaunpur</Link>
            <Link to="/services">📍 Gorakhpur</Link>
            <Link to="/services">📍 Ayodhya</Link>
          </div>
          <div>
            <h4>Sampark</h4>
            <p>📍 {SITE.city}</p>
            <p>📞 <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} style={{ display: 'inline', padding: 0 }}>{SITE.phone}</a></p>
            <p>✉️ <a href={`mailto:${SITE.email}`} style={{ display: 'inline', padding: 0 }}>{SITE.email}</a></p>
            <p>🕕 Subah 8 – Raat 10 (Har din)</p>
            <p>💬 WhatsApp par bhi uplabdh — number upar diya hai</p>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} Ganga Aarti Booking · Banaras ki shaan, aapki shaadi ka samman 🙏</p>
      </footer>
      <Link className="float-enquiry" to="/contact" aria-label="Free enquiry karein">
        <span className="float-enquiry-icon">💬</span>
        <span className="float-enquiry-text">Free Enquiry</span>
      </Link>
    </div>
  )
}
