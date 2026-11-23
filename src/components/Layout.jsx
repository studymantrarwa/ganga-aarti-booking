import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, dashboardPath } from '../context/AuthContext'
import { CATEGORIES, SITE } from '../data/catalog'
import { InstallAppButton, useSettings } from '../lib/ui'

const NAV_LINKS = [
  ['/', 'Home', true],
  ['/services', 'Services'],
  ['/services#marketplace', '🛍️ Shop'],
  ['/packages', 'Packages'],
  ['/gallery', 'Gallery'],
  ['/about', 'About'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  // Page badalte hi mobile menu apne aap band — purana menu khula na rahe.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  // Asli Android app (Capacitor) ke andar bada website-header/footer nahi
  // dikhta — app ka apna saaf look (chhota header, footer gayab).
  useEffect(() => {
    if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add('native-app')
  }, [])
  const phone = settings.contact_phone || SITE.phone
  const email = settings.contact_email || SITE.email
  const whatsapp = settings.whatsapp || SITE.whatsapp
  const out = async () => { await signOut(); navigate('/') }
  const waText = encodeURIComponent('Namaste! Meri shaadi ke liye Ganga Aarti / wedding services ka free quotation chahiye.')
  // Sticky bottom bar sirf public pages par (panels mein nahi).
  const isPanel = /^\/(admin|partner|dashboard)/.test(location.pathname)
  return (
    <div className="app">
      <div className="topbar">
        <span>🪔 Varanasi · Lucknow · Prayagraj · Jaunpur · Gorakhpur · Ayodhya</span>
        <span>📞 {phone} · ✉️ {email}</span>
      </div>
      <header className="header">
        <Link to="/" className="brand">
          <span className="brand-icon">🪔</span>
          <span className="brand-text">Ganga Aarti <em>Booking</em><small>Shaadi ki poori vyavastha · Kashi se</small></span>
        </Link>
        <nav className="nav">
          {NAV_LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={!!end}>{label}</NavLink>)}
        </nav>
        <div className="header-actions">
          <InstallAppButton className="btn btn-ghost btn-sm hide-sm" />
          <a className="btn btn-ghost btn-sm hide-sm" href={`tel:${phone.replace(/\s/g, '')}`}>📞 Call Karein</a>
          {user ? (
            <>
              <Link className="btn btn-gold btn-sm" to={dashboardPath(user)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</Link>
              <button className="btn btn-ghost btn-sm" onClick={out}>Logout ({user.name.split(' ')[0]})</button>
            </>
          ) : (
            <>
              <Link className="btn btn-gold btn-sm hide-sm" to="/dashboard/quote">📋 Free Quotation</Link>
              <Link className="btn btn-ghost btn-sm" to="/login">Login</Link>
              <Link className="btn btn-maroon btn-sm" to="/signup">Sign Up Free</Link>
            </>
          )}
        </div>
        <button type="button" className="nav-toggle" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Menu band karein' : 'Menu kholein'} onClick={() => setMenuOpen((o) => !o)}>
          <span className="nav-toggle-icon" aria-hidden="true">{menuOpen ? '✖' : '☰'}</span><span>Menu</span>
        </button>
        {menuOpen && (
          <div className="mobile-menu" id="mobile-menu">
            <nav className="mobile-menu-nav" aria-label="Mobile menu">
              {NAV_LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={!!end} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
            </nav>
            <div className="mobile-menu-actions">
              {user ? (
                <>
                  <Link className="btn btn-gold" to={dashboardPath(user)} onClick={() => setMenuOpen(false)}>{user.role === 'admin' ? '🛡️ Admin Panel' : user.role === 'partner' ? '🏪 Partner Panel' : '👤 My Panel'}</Link>
                  <button className="btn btn-ghost" onClick={async () => { setMenuOpen(false); await out() }}>Logout ({user.name.split(' ')[0]})</button>
                </>
              ) : (
                <>
                  <Link className="btn btn-maroon" to="/signup" onClick={() => setMenuOpen(false)}>🙏 Sign Up Free</Link>
                  <Link className="btn btn-ghost" to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link className="btn btn-gold" to="/dashboard/quote" onClick={() => setMenuOpen(false)}>📋 Free Quotation</Link>
                </>
              )}
              <a className="btn btn-ghost" href={`tel:${phone.replace(/\s/g, '')}`}>📞 Call Karein</a>
              <InstallAppButton className="btn btn-ghost" />
            </div>
          </div>
        )}
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
            <Link to="/partner-join">Partner Banein</Link>
            <Link to="/app">📲 App Download</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/login">Login</Link>
            <Link to="/terms">Seva Ki Shartein</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/refund-policy">Refund Policy</Link>
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
            <p>📞 <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ display: 'inline', padding: 0 }}>{phone}</a></p>
            <p>✉️ <a href={`mailto:${email}`} style={{ display: 'inline', padding: 0 }}>{email}</a></p>
            <p>🕕 Subah 8 – Raat 10 (Har din)</p>
            <p>💬 <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noreferrer" style={{ display: 'inline', padding: 0 }}>WhatsApp par baat karein</a></p>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} Ganga Aarti Booking · Banaras ki shaan, aapki shaadi ka samman 🙏</p>
      </footer>
      {!isPanel && (
        <Link className="float-enquiry" to="/contact" aria-label="Free enquiry karein">
          <span className="float-enquiry-icon">💬</span>
          <span className="float-enquiry-text">Free Enquiry</span>
        </Link>
      )}
      {!isPanel && (
        <nav className="mobile-bar" aria-label="Turant sampark">
          <a href={`tel:${phone.replace(/\s/g, '')}`}>📞<span>Call Karein</span></a>
          <Link to="/dashboard/quote" className="mobile-bar-main">📋<span>Free Quotation</span></Link>
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">💬<span>WhatsApp</span></a>
          {user ? (
            <Link to={dashboardPath(user)}>{user.role === 'admin' ? '🛡️' : user.role === 'partner' ? '🏪' : '👤'}<span>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</span></Link>
          ) : (
            <Link to="/signup">🙏<span>Sign Up</span></Link>
          )}
          <InstallAppButton className="mobile-bar-btn" label={<>📲<span>App Download</span></>} />
        </nav>
      )}
    </div>
  )
}
