import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, dashboardPath } from '../context/AuthContext'
import { CATEGORIES, SITE } from '../data/catalog'
import { useSettings } from '../lib/ui'

const NAV_LINKS = [
  ['/', 'Home', true],
  ['/services', 'Services'],
  ['/services#marketplace', 'Shop'],
  ['/packages', 'Packages'],
  ['/gallery', 'Gallery'],
  ['/about', 'About'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
]

// Mobile bottom navigation ke liye halke stroke SVG icons (emoji nahi —
// premium blueprint: navigation mein saaf icons, ek hi rang).
const barIconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const BAR_ICONS = {
  home: (<svg {...barIconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.8V21h14V9.8" /><path d="M9.5 21v-6h5v6" /></svg>),
  services: (<svg {...barIconProps}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></svg>),
  shop: (<svg {...barIconProps}><path d="M5.2 8h13.6l-1.1 12.1a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4L5.2 8Z" /><path d="M8.6 10.5V6.8a3.4 3.4 0 0 1 6.8 0v3.7" /></svg>),
  packages: (<svg {...barIconProps}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17" /><path d="M8 3v4" /><path d="M16 3v4" /></svg>),
  account: (<svg {...barIconProps}><circle cx="12" cy="8" r="3.6" /><path d="M4.6 20.4c1.3-3.3 4.1-4.9 7.4-4.9s6.1 1.6 7.4 4.9" /></svg>),
}

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
        <span>Varanasi · Lucknow · Prayagraj · Jaunpur · Gorakhpur · Ayodhya</span>
        <span>{phone} · {email}</span>
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
          {user ? (
            <>
              <Link className="btn btn-maroon btn-sm" to={dashboardPath(user)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</Link>
              <button className="btn btn-ghost btn-sm" onClick={out}>Logout ({user.name.split(' ')[0]})</button>
            </>
          ) : (
            <>
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
              <NavLink to="/dashboard/quote" onClick={() => setMenuOpen(false)}>Free Quotation</NavLink>
            </nav>
            <div className="mobile-menu-actions">
              {user ? (
                <>
                  <Link className="btn btn-maroon" to={dashboardPath(user)} onClick={() => setMenuOpen(false)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Panel'}</Link>
                  <button className="btn btn-ghost" onClick={async () => { setMenuOpen(false); await out() }}>Logout ({user.name.split(' ')[0]})</button>
                </>
              ) : (
                <>
                  <Link className="btn btn-maroon" to="/signup" onClick={() => setMenuOpen(false)}>Sign Up Free</Link>
                  <Link className="btn btn-ghost" to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="footer-grid footer-grid-compact">
          <div>
            <h4>Ganga Aarti Booking</h4>
            <p>Shaadi mein Ganga Aarti aur poori wedding vyavastha — ek hi jagah, sahi rate, pakki booking.</p>
            <p>Phone: <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ display: 'inline', padding: 0 }}>{phone}</a></p>
            <p>Email: <a href={`mailto:${email}`} style={{ display: 'inline', padding: 0 }}>{email}</a></p>
            <p><a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noreferrer" style={{ display: 'inline', padding: 0 }}>WhatsApp par baat karein</a></p>
          </div>
          <div>
            <h4>Sevayein</h4>
            {CATEGORIES.slice(0, 5).map((c) => <Link key={c.slug} to={`/services/${c.slug}`}>{c.name}</Link>)}
            <Link to="/services">Saari Sevayein →</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">Hamare Baare Mein</Link>
            <Link to="/packages">Wedding Packages</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/faq">Aksar Puche Sawal</Link>
            <Link to="/partner-join">Partner Banein</Link>
            <Link to="/app">App Download</Link>
          </div>
          <div>
            <h4>Madad</h4>
            <Link to="/contact">Sampark Karein</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/terms">Seva Ki Shartein</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </div>
        </div>
        <p className="copy">© {new Date().getFullYear()} Ganga Aarti Booking · Varanasi, Uttar Pradesh</p>
      </footer>
      {!isPanel && (
        <nav className="mobile-bar" aria-label="Main navigation">
          <NavLink to="/" end>{BAR_ICONS.home}<span>Home</span></NavLink>
          <NavLink to="/services">{BAR_ICONS.services}<span>Services</span></NavLink>
          <NavLink to="/services#marketplace">{BAR_ICONS.shop}<span>Shop</span></NavLink>
          <NavLink to="/packages">{BAR_ICONS.packages}<span>Packages</span></NavLink>
          <NavLink to={user ? dashboardPath(user) : '/login'}>{BAR_ICONS.account}<span>Account</span></NavLink>
        </nav>
      )}
    </div>
  )
}
