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
        <span>🪔 Varanasi · Lucknow · Prayagraj · Ayodhya</span>
        <span>{SITE.phone} · {SITE.email}</span>
      </div>
      <header className="header">
        <Link to="/" className="brand">
          <span className="brand-icon">🪔</span>
          <span>Ganga Aarti <em>Booking</em></span>
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
          {user ? (
            <>
              <Link className="btn btn-gold" to={dashboardPath(user)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</Link>
              <button className="btn btn-ghost" onClick={out}>Logout ({user.name.split(' ')[0]})</button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Login</Link>
              <Link className="btn btn-gold" to="/signup">Sign Up Free</Link>
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
          </div>
          <div>
            <h4>Hamari Sevayein</h4>
            {CATEGORIES.map((c) => <Link key={c.slug} to={`/services/${c.slug}`}>{c.name}</Link>)}
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link to="/packages">Wedding Packages</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/faq">Aksar Puche Sawal</Link>
            <Link to="/contact">Sampark Karein</Link>
            <Link to="/signup">Partner Banein</Link>
          </div>
          <div>
            <h4>Sampark</h4>
            <p>📍 {SITE.city}</p>
            <p>📞 {SITE.phone}</p>
            <p>✉️ {SITE.email}</p>
            <p>🕕 Subah 8 – Raat 10 (Har din)</p>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} Ganga Aarti Booking · Banaras ki shaan, aapki shaadi ka samman 🙏</p>
      </footer>
    </div>
  )
}
