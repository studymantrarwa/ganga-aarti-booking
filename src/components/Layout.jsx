import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, dashboardPath } from '../context/AuthContext'
import { CATEGORIES, SITE, categoryBySlug, inr } from '../data/catalog'
import { store } from '../lib/store'
import { getWishlist, onWishlistChange } from '../lib/localLists'
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
  search: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>),
}

// ── Header search (Flipkart pattern) ────────────────────────────────────────
// Bada central search bar — type karte hi live suggestions: pehle matching
// categories, phir matching products (photo, partner, shahar, price).
// Keyboard-safe: ↑/↓ se chunein, Enter se kholein, Esc se band karein.
// Submit par /services?q=… (listing page) khulta hai.
function HeaderSearch({ cats }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [term, setTerm] = useState('')
  const [products, setProducts] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)

  useEffect(() => { store.listProducts({ activeOnly: true }).then((rows) => setProducts(rows || [])).catch(() => {}) }, [])
  // Page badalte hi search saaf + dropdown band.
  useEffect(() => { setOpen(false); setTerm(''); setActive(-1) }, [location.pathname])

  const needle = term.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!needle) return []
    const catHits = cats
      .filter((c) => c.name.toLowerCase().includes(needle) || (c.hindi || '').includes(term.trim()))
      .slice(0, 3)
      .map((c) => ({ kind: 'cat', key: `cat-${c.slug}`, label: c.name, sub: 'Category', to: `/services?cat=${c.slug}` }))
    const prodHits = (products || [])
      .filter((p) => [p.title, p.partnerName, p.city, categoryBySlug(p.category)?.name].some((s) => String(s || '').toLowerCase().includes(needle)))
      .slice(0, 6)
      .map((p) => ({
        kind: 'prod', key: `prod-${p.id}`, label: p.title,
        sub: `${p.partnerName}${p.city ? ` · ${p.city}` : ''}`,
        price: p.price, img: (p.images && p.images[0]) || p.imageUrl || p.image || categoryBySlug(p.category)?.image,
        to: `/product/${p.id}`,
      }))
    return [...catHits, ...prodHits]
  }, [needle, term, cats, products])

  const go = (item) => {
    if (item) { navigate(item.to); setOpen(false); setTerm('') }
  }
  const submit = (e) => {
    e.preventDefault()
    if (active >= 0 && suggestions[active]) return go(suggestions[active])
    if (needle) { navigate(`/services?q=${encodeURIComponent(term.trim())}`); setOpen(false) }
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  return (
    <div className="header-search" ref={boxRef}>
      <form role="search" onSubmit={submit}>
        <span className="header-search-icon">{BAR_ICONS.search}</span>
        <input
          type="search"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onKeyDown={onKey}
          placeholder="Search for services, packages and more"
          aria-label="Services aur products khojein"
          autoComplete="off"
        />
      </form>
      {open && needle && (
        <div className="search-suggest" role="listbox" aria-label="Search suggestions">
          {suggestions.length === 0 ? (
            <p className="search-suggest-empty">Kuchh nahi mila — Enter dabakar saare results dekhein</p>
          ) : suggestions.map((s, i) => (
            <button
              type="button" key={s.key} role="option" aria-selected={i === active}
              className={`search-suggest-item${i === active ? ' on' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); go(s) }}
              onMouseEnter={() => setActive(i)}
            >
              {s.kind === 'prod'
                ? (s.img ? <img src={s.img} alt="" loading="lazy" /> : <span className="search-suggest-thumb" aria-hidden="true">{s.label.charAt(0)}</span>)
                : <span className="search-suggest-thumb" aria-hidden="true">{s.label.charAt(0)}</span>}
              <span className="search-suggest-text"><b>{s.label}</b><small>{s.sub}</small></span>
              {s.price != null && <span className="search-suggest-price">{inr(s.price)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category strip (Flipkart pattern) ───────────────────────────────────────
// Header ke neeche horizontally scrollable patti — har category ki chhoti
// photo + naam; tap par /services?cat=<slug> (filtered listing).
function CategoryStrip({ cats }) {
  const location = useLocation()
  const activeCat = location.pathname === '/services' ? (new URLSearchParams(location.search).get('cat') || '') : ''
  return (
    <nav className="cat-strip" aria-label="Categories">
      <div className="cat-strip-track">
        <Link to="/services" className={`cat-strip-item${location.pathname === '/services' && !activeCat ? ' on' : ''}`}>
          <span className="cat-strip-thumb cat-strip-all" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></svg>
          </span>
          <span>All Services</span>
        </Link>
        {cats.map((c) => {
          const img = c.image || categoryBySlug(c.slug)?.image
          return (
            <Link key={c.slug} to={`/services?cat=${c.slug}`} className={`cat-strip-item${activeCat.split(',').includes(c.slug) ? ' on' : ''}`}>
              {img
                ? <img className="cat-strip-thumb" src={img} alt="" loading="lazy" />
                : <span className="cat-strip-thumb cat-strip-all" aria-hidden="true">{c.name.charAt(0)}</span>}
              <span>{c.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Header / footer ke liye store-driven categories (admin ke badlav yahan bhi
// dikhte hain); store khaali ho to static catalog fallback.
function useHeaderCategories() {
  const [cats, setCats] = useState(CATEGORIES)
  useEffect(() => { store.listCategories().then((rows) => { if (rows && rows.length) setCats(rows) }).catch(() => {}) }, [])
  return cats
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const settings = useSettings()
  const cats = useHeaderCategories()
  const [menuOpen, setMenuOpen] = useState(false)
  // Wishlist count — localStorage list se live sync (heart dabate hi header
  // aur menu dono ka number badal jata hai). Wishlist bina login ke bhi
  // chalti hai, isliye link mehmanon ko bhi dikhta hai.
  const [wishCount, setWishCount] = useState(() => getWishlist().length)
  useEffect(() => onWishlistChange((list) => setWishCount(list.length)), [])
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
        <HeaderSearch cats={cats} />
        <div className="header-actions">
          <Link className="header-login-link" to="/wishlist">Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}</Link>
          {user ? (
            <>
              <button className="header-login-link" onClick={out}>Logout ({user.name.split(' ')[0]})</button>
              <Link className="btn btn-maroon btn-sm" to={dashboardPath(user)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Bookings'}</Link>
            </>
          ) : (
            <>
              <Link className="header-login-link" to="/login">Login</Link>
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
              <NavLink to="/wishlist" onClick={() => setMenuOpen(false)}>Meri Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}</NavLink>
              <NavLink to="/dashboard/quote" onClick={() => setMenuOpen(false)}>Free Quotation</NavLink>
            </nav>
            <div className="mobile-menu-actions">
              {user ? (
                <>
                  <Link className="btn btn-maroon" to={dashboardPath(user)} onClick={() => setMenuOpen(false)}>{user.role === 'admin' ? 'Admin Panel' : user.role === 'partner' ? 'Partner Panel' : 'My Bookings'}</Link>
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
      <CategoryStrip cats={cats} />
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
            <h4>Links</h4>
            <Link to="/about">Hamare Baare Mein</Link>
            <Link to="/partner-join">Partner Banein</Link>
            <Link to="/app">App Download</Link>
            <Link to="/contact">Sampark Karein</Link>
          </div>
          <div>
            <h4>Madad</h4>
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
