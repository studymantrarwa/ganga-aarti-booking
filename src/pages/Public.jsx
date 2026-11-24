import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { ProductCard, RatingPill, SkeletonGrid, Stars, WishlistHeart, useReviews } from '../components/ProductCard'
import { getRecent, getWishlist, onWishlistChange, pushRecent } from '../lib/localLists'
import Seo, { breadcrumbLd, faqLd, serviceLd } from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { AARTI_PACKAGES, CATEGORIES, GALLERY, GENERAL_FAQS, PANDIT_PACKAGES, SITE, TESTIMONIALS, categoryBySlug, inr } from '../data/catalog'
import { roleMeta, store, waNumber } from '../lib/store'
import { summarize } from '../lib/ratings'
import { InstallAppButton, NotificationToggle, Spinner, fmtDate, isPastDate, todayStr, useSettings, useToast } from '../lib/ui'

export function CategoryVisual({ cat, h }) {
  if (cat.image) return <div className="ph" style={h ? { height: h } : undefined}><img src={cat.image} alt={cat.name} loading="lazy" /></div>
  return <div className="ph" style={h ? { height: h } : undefined} aria-hidden="true">{cat.icon}</div>
}

// ── Store-driven data (admin-editable prices/packages) ───────────────────────
// Initial state is the static catalog so the page paints instantly; the store
// (DB in Supabase mode, seeded local state in demo mode) then takes over.
export function useCategories() {
  const [cats, setCats] = useState(CATEGORIES)
  useEffect(() => { store.listCategories().then((rows) => { if (rows && rows.length) setCats(rows) }).catch(() => {}) }, [])
  return cats
}
export function useAartiPackages() {
  const [pkgs, setPkgs] = useState(AARTI_PACKAGES)
  useEffect(() => { store.listPackages().then((rows) => { if (rows && rows.length) setPkgs(rows) }).catch(() => {}) }, [])
  return pkgs
}

// Animated number counter — counts up when scrolled into view.
export function Counter({ to, decimals = 0, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf
    const run = () => {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return }
      const t0 = performance.now()
      const dur = 1500
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur)
        setVal(to * (1 - Math.pow(1 - p, 3)))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    if (!('IntersectionObserver' in window)) { run(); return }
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { run(); io.disconnect() } }) }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [to])
  const text = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-IN')
  return <span ref={ref}>{text}{suffix}</span>
}

// Testimonials — halka auto-advancing slider (hover par rukta hai, dots se
// badal sakte hain; reduced-motion par auto-play band).
export function TestimonialsSlider() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((v) => (v + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(t)
  }, [paused])
  const t = TESTIMONIALS[i]
  return (
    <div className="testi-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="testi testi-slide" key={t.name}>
        <div className="stars" aria-label="5 star rating">★★★★★</div>
        <p>“{t.text}”</p>
        <b>{t.name}</b> · {t.city} <span className="chip">{t.service}</span>
      </div>
      <div className="testi-dots" role="tablist" aria-label="Anubhav chunein">
        {TESTIMONIALS.map((x, di) => (
          <button key={x.name} className={di === i ? 'on' : ''} onClick={() => setI(di)} aria-label={`${x.name} ka anubhav`} />
        ))}
      </div>
    </div>
  )
}

const MARQUEE_ITEMS = ['🪔 Ganga Aarti', '🙏 Pandit Ji', '🚗 Wedding Cars', '🎪 Tent & Decoration', '🎧 DJ & Sound', '🍛 Catering', '📸 Photography', '🥁 Band Baja', '📍 Varanasi', '📍 Lucknow', '📍 Prayagraj', '📍 Ayodhya', '📍 Gorakhpur', '📍 Jaunpur']
export function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((t, i) => <span key={i}>{t}<i>✦</i></span>)}
      </div>
    </div>
  )
}

const CARD_BADGES = {
  'ganga-aarti': '⭐ Sabse Lokpriya',
  'pandit-ji': '🙏 10+ Saal Anubhav',
  catering: '🍛 Satvik Vikalp Uplabdh',
}

export function CategoryCard({ cat }) {
  const badge = CARD_BADGES[cat.slug]
  return (
    <article className="card mkt-card">
      <div className="card-media">
        <CategoryVisual cat={cat} />
        {badge && <span className="badge popular card-badge">{badge}</span>}
        <span className="price-chip">{inr(cat.startingPrice)} <small>se shuru</small></span>
      </div>
      <div className="body">
        <h3>{cat.icon} {cat.name} <span className="hint">({cat.hindi})</span></h3>
        <p>{cat.tagline}</p>
        <p className="price"><span className="price-label">Rate</span>{inr(cat.startingPrice)} <small>se shuru · {cat.unit}</small></p>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-maroon btn-sm" to={`/services/${cat.slug}`}>Details Dekhein</Link>
          <Link className="btn btn-gold btn-sm" to={`/dashboard/quote?category=${cat.slug}`}>Free Quotation</Link>
        </div>
      </div>
    </article>
  )
}

export function PackageCard({ pkg }) {
  return (
    <article className={`card mkt-card pkg-card${pkg.popular ? ' pkg-popular popular' : ''}`}>
      {pkg.image ? <div className="ph"><img src={pkg.image} alt={pkg.name} loading="lazy" /></div> : null}
      <div className="body">
        <div className="pkg-badge-row">{pkg.popular && <span className="badge popular">⭐ Sabse Lokpriya</span>}</div>
        <h3>{pkg.name}{pkg.hindi ? <span className="hint"> · {pkg.hindi}</span> : ''}</h3>
        {pkg.tagline ? <p className="hint" style={{ fontSize: '.92rem' }}>{pkg.tagline}</p> : null}
        <p className="price">{inr(pkg.price)} <small>{pkg.unit}</small></p>
        <ul className="ticks">{pkg.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <div style={{ marginTop: 'auto' }}>
          <Link className="btn btn-gold" to={`/dashboard/quote?category=${pkg.category}&title=${encodeURIComponent(pkg.name)}`}>Abhi Book Karein</Link>
        </div>
      </div>
    </article>
  )
}

// ── DescBlock — Flipkart pattern: lamba vivaran pehle BAND (collapsed) ─────
// Sirf chhota intro (~180 akshar, saaf kata hua) dikhta hai; "Aur Padhein ▾"
// dabane par poora vivaran alag paragraphs mein khulta hai, "Kam Dekhein ▴"
// se wapas band. Chhota vivaran (≤300 akshar) bina toggle ke poora dikhta
// hai. Product page aur Service page dono par ek hi treatment — khula
// text-wall kahin nahi.
const cleanCut = (text, n) => {
  if (text.length <= n) return { text, more: false }
  const slice = text.slice(0, n)
  const sp = slice.lastIndexOf(' ')
  return { text: slice.slice(0, sp > 40 ? sp : n), more: true }
}

export function DescBlock({ text, heading = 'Vivaran (Description)' }) {
  const [open, setOpen] = useState(false)
  const paras = String(text || '').split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (!paras.length) return null
  const full = paras.join(' ')
  const isLong = full.length > 300 || paras.length > 2
  if (!isLong) {
    return (
      <div className="desc-block">
        <h3 className="desc-head">{heading}</h3>
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    )
  }
  const cut = cleanCut(full, 180)
  return (
    <div className="desc-block">
      <h3 className="desc-head">{heading}</h3>
      {open ? (
        <div className="desc-more">
          {paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : (
        <p>{cut.text}{cut.more ? '…' : ''}</p>
      )}
      <button type="button" className="read-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Kam Dekhein ▴' : 'Aur Padhein ▾'}
      </button>
    </div>
  )
}

// ── Recently Viewed shelf (Home) — localStorage 'gab_recent' se ───────────
// Sirf tab dikhta hai jab is device par kuchh dekha gaya ho.
export function RecentlyViewedShelf() {
  const [items, setItems] = useState([])
  const [pending, setPending] = useState(false)
  const reviews = useReviews()
  useEffect(() => {
    const ids = getRecent()
    if (!ids.length) return
    setPending(true)
    store.listProducts({ activeOnly: true })
      .then((rows) => {
        const byId = new Map((rows || []).map((p) => [p.id, p]))
        setItems(ids.map((id) => byId.get(id)).filter(Boolean))
        setPending(false)
      })
      .catch(() => setPending(false))
  }, [])
  if (!items.length && !pending) return null
  return (
    <section className="section" style={{ background: '#fff' }}>
      <div className="wrap">
        <SecHead eyebrow="Recently Viewed" title="Haal Hi Mein Dekhe" lead="Jo products aapne abhi-abhi dekhe the — yahin se seedha wapas un par jayein." />
        <div className="shelf-grid">
          {pending && !items.length ? <SkeletonGrid count={4} /> : items.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
        </div>
      </div>
    </section>
  )
}

// ── Wishlist page — /wishlist ───────────────────────────────────────────────
// localStorage 'gab_wishlist' ke ids wale products, shared ProductCard ke
// saath. Heart hatate hi card yahan se bhi turant gayab (event sync).
export function WishlistPage() {
  const [ids, setIds] = useState(() => getWishlist())
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const reviews = useReviews()
  useEffect(() => onWishlistChange((list) => setIds(list)), [])
  useEffect(() => {
    store.listProducts({ activeOnly: true })
      .then((rows) => { setProducts(rows || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean)
  return (
    <>
      <Seo title="Meri Wishlist | Ganga Aarti Booking" description="Aapke pasandeeda wedding products — wishlist mein save kiye gaye Ganga Aarti, Pandit Ji, gaadi, tent, DJ aur doosre partner products." path="/wishlist" />
      <div className="page-head"><h1>Meri Wishlist</h1><p>Pasandeeda products ek jagah — dil (heart) dabakar save karein, jab chahein book karein.</p></div>
      <section className="section wrap">
        {loading ? <div className="shop-grid listing-grid"><SkeletonGrid count={4} /></div> : items.length === 0 ? (
          <div className="empty-state">
            <p>Aapki wishlist abhi khaali hai.</p>
            <p className="hint">Kisi bhi product par dil (heart) wala nishan dabayein — wo yahan save ho jayega taaki baad mein aaram se book kar sakein.</p>
            <Link className="btn btn-maroon" to="/services">Products Dekhein</Link>
          </div>
        ) : (
          <div className="shop-grid listing-grid">
            {items.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
          </div>
        )}
      </section>
    </>
  )
}

// ── Shop listing (/services) — Flipkart pattern ────────────────────────────
// LEFT filter sidebar (mobile par drawer), upar result count + sort, aur
// saari state URL query params mein (?q= ?cat= ?price= ?rating= ?sort=)
// taaki har filtered view ka link share ho sake. Pagination "Load More"
// se — ek baar mein 24 products (scalability).
const PRICE_RANGES = [
  ['all', 'Saari Keematein'],
  ['u5', '₹5,000 se kam'],
  ['5-15', '₹5,000 – ₹15,000'],
  ['15-50', '₹15,000 – ₹50,000'],
  ['a50', '₹50,000 se zyada'],
]
const inPriceRange = (price, range) => {
  const p = Number(price) || 0
  if (range === 'u5') return p < 5000
  if (range === '5-15') return p >= 5000 && p <= 15000
  if (range === '15-50') return p > 15000 && p <= 50000
  if (range === 'a50') return p > 50000
  return true
}
const RATING_FILTERS = [
  ['all', 'Saari Ratings'],
  ['4', '4★ & above'],
  ['3', '3★ & above'],
]
const SHOP_SORTS = [
  ['popularity', 'Popularity'],
  ['price-asc', 'Price: Kam → Zyada'],
  ['price-desc', 'Price: Zyada → Kam'],
  ['rating', 'Rating'],
]
const PAGE_SIZE = 24

export function ShopListing({ cats }) {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const reviews = useReviews()
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [drawer, setDrawer] = useState(false)

  const q = params.get('q') || ''
  const catSel = (params.get('cat') || '').split(',').map((x) => x.trim()).filter(Boolean)
  const price = params.get('price') || 'all'
  const ratingMin = params.get('rating') || 'all'
  const sort = params.get('sort') || 'popularity'
  const [qInput, setQInput] = useState(q)

  useEffect(() => {
    let live = true
    store.listProducts({ activeOnly: true })
      .then((rows) => { if (live) { setProducts(rows || []); setLoading(false) } })
      .catch(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  // Filter/search/sort badalte hi "Load More" pehli khidki par wapas.
  const paramsKey = params.toString()
  useEffect(() => { setVisible(PAGE_SIZE) }, [paramsKey])
  // Header search se naya q aaye to listing ka input bhi sync rahe.
  useEffect(() => { setQInput(q) }, [q])
  // Search input → URL param, ~250ms debounce ke baad.
  useEffect(() => {
    if (qInput === q) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (qInput.trim()) next.set('q', qInput.trim()); else next.delete('q')
      setParams(next, { preventScrollReset: true })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '' || v === 'all' || (k === 'sort' && v === 'popularity')) next.delete(k)
      else next.set(k, v)
    })
    setParams(next, { preventScrollReset: true })
  }
  const toggleCat = (slug) => {
    const list = catSel.includes(slug) ? catSel.filter((c) => c !== slug) : [...catSel, slug]
    update({ cat: list.length ? list.join(',') : null })
  }
  const clearAll = () => { setQInput(''); setParams({}, { preventScrollReset: true }) }
  const activeCount = catSel.length + (price !== 'all' ? 1 : 0) + (ratingMin !== 'all' ? 1 : 0) + (q ? 1 : 0)

  const needle = q.trim().toLowerCase()
  const filtered = (products || [])
    .filter((p) => !catSel.length || catSel.includes(p.category))
    .filter((p) => inPriceRange(p.price, price))
    .filter((p) => {
      if (ratingMin === 'all') return true
      const r = summarize(reviews, p.partnerId)
      return r.count > 0 && r.avg >= Number(ratingMin)
    })
    .filter((p) => !needle || [p.title, p.partnerName, p.city, p.description, categoryBySlug(p.category)?.name].some((x) => String(x || '').toLowerCase().includes(needle)))
    .sort((a, b) => {
      if (sort === 'price-asc') return Number(a.price) - Number(b.price)
      if (sort === 'price-desc') return Number(b.price) - Number(a.price)
      const ra = summarize(reviews, a.partnerId)
      const rb = summarize(reviews, b.partnerId)
      if (sort === 'rating') return (rb.avg - ra.avg) || (rb.count - ra.count)
      // popularity — zyada reviews, phir rating, phir naye pehle
      return (rb.count - ra.count) || (rb.avg - ra.avg) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })

  const filterPanel = (
    <div className="filter-panel">
      <div className="filter-panel-head">
        <b>Filters</b>
        {activeCount > 0 && <button type="button" className="filter-clear" onClick={clearAll}>Clear All</button>}
      </div>
      <div className="filter-group">
        <h4>Categories</h4>
        {cats.map((c) => (
          <label className="filter-opt" key={c.slug}>
            <input type="checkbox" checked={catSel.includes(c.slug)} onChange={() => toggleCat(c.slug)} />
            <span>{c.name}</span>
            <span className="hint">({(products || []).filter((p) => p.category === c.slug).length})</span>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <h4>Price</h4>
        {PRICE_RANGES.map(([v, label]) => (
          <label className="filter-opt" key={v}>
            <input type="radio" name="price-range" checked={price === v} onChange={() => update({ price: v })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="filter-group">
        <h4>Customer Ratings</h4>
        {RATING_FILTERS.map(([v, label]) => (
          <label className="filter-opt" key={v}>
            <input type="radio" name="rating-min" checked={ratingMin === v} onChange={() => update({ rating: v })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <section className="section" id="marketplace" style={{ paddingTop: 30 }}>
      <div className="wrap">
        <div className="listing-layout">
          <aside className="listing-side">{filterPanel}</aside>
          <div className="listing-main">
            <div className="listing-topbar">
              <button type="button" className="btn btn-ghost btn-sm filters-btn" onClick={() => setDrawer(true)}>Filters{activeCount ? ` (${activeCount})` : ''}</button>
              <input type="search" className="listing-search" placeholder="Product, partner ya shahar khojein…" value={qInput} onChange={(e) => setQInput(e.target.value)} aria-label="Products khojein" />
              <span className="listing-count">{loading ? 'Load ho raha hai…' : `${filtered.length} products mile`}</span>
              <label className="listing-sort"><span>Sort By</span>
                <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort karein">
                  {SHOP_SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
            </div>
            {loading ? <div className="shop-grid listing-grid"><SkeletonGrid count={8} /></div> : filtered.length === 0 ? (
              <div className="empty-state">
                <p>Koi product nahi mila — filters ya search badal kar dekhein.</p>
                {activeCount > 0 && <button type="button" className="btn btn-maroon btn-sm" onClick={clearAll}>Saare Filters Saaf Karein</button>}
              </div>
            ) : (
              <>
                <div className="shop-grid listing-grid">
                  {filtered.slice(0, visible).map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
                </div>
                {visible < filtered.length && (
                  <p style={{ textAlign: 'center', marginTop: 26 }}>
                    <button type="button" className="btn btn-maroon" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Aur Products Dekhein ({filtered.length - visible} aur)</button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {drawer && (
        <div className="filter-drawer-backdrop" onClick={() => setDrawer(false)}>
          <div className="filter-drawer" role="dialog" aria-label="Filters" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="filter-drawer-close" aria-label="Filters band karein" onClick={() => setDrawer(false)}>✕</button>
            {filterPanel}
            <button type="button" className="btn btn-maroon" style={{ width: '100%', marginTop: 14 }} onClick={() => setDrawer(false)}>{filtered.length} Products Dekhein</button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Home page ke section headers — ek hi professional treatment:
// chhota gold eyebrow, badi heading aur gold divider ornament.
export function SecHead({ eyebrow, title, lead }) {
  return (
    <div className="sec-head">
      {eyebrow && <span className="sec-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  )
}

// ── Home page ki "Popular Products" shelf — marketplace wala hi data flow
// (store.listProducts + partner-level ratings), sirf top 8 products.
export function FeaturedShelf() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const reviews = useReviews()
  useEffect(() => { store.listProducts({ activeOnly: true }).then((rows) => { setProducts(rows || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  const top = [...(products || [])].sort((a, b) => {
    const ra = summarize(reviews, a.partnerId)
    const rb = summarize(reviews, b.partnerId)
    return (rb.avg - ra.avg) || (rb.count - ra.count) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  }).slice(0, 8)
  if (!top.length && !loading) return null
  return (
    <section className="section" style={{ background: '#fff' }}>
      <div className="wrap">
        <SecHead eyebrow="Marketplace" title="Popular Services" lead="Partners ke sabse pasandeeda products — photo, rating aur saaf rate ke saath. Bina login ke dekhiye, pasand aaye to seedha book karein." />
        {loading && !top.length ? <div className="shelf-grid"><SkeletonGrid count={4} /></div> : (
        <div className="shelf-grid">
          {top.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
        </div>
        )}
        <p style={{ textAlign: 'center', marginTop: 24 }}><Link className="btn btn-maroon" to="/services">View All — Sabhi Products Dekhein →</Link></p>
      </div>
    </section>
  )
}

export function Home() {
  const { user } = useAuth()
  const cats = useCategories()
  const pkgs = useAartiPackages()
  const settings = useSettings()
  const phone = settings.contact_phone || SITE.phone
  const whatsapp = settings.whatsapp || SITE.whatsapp
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: SITE.name, url: SITE.origin,
    telephone: phone, email: settings.contact_email || SITE.email, priceRange: '₹₹',
    address: { '@type': 'PostalAddress', addressLocality: 'Varanasi', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' },
    areaServed: ['Varanasi', 'Lucknow', 'Prayagraj', 'Jaunpur', 'Ayodhya', 'Gorakhpur'],
    description: 'Wedding mein Ganga Aarti booking aur poori shaadi vyavastha — Pandit Ji, gaadi, tent decoration, DJ, catering, photography, band baja.',
  }
  const waText = encodeURIComponent('Namaste! Meri shaadi ke liye Ganga Aarti / wedding services ka free quotation chahiye.')
  return (
    <>
      <Seo title="Ganga Aarti Wedding Booking | Shaadi Mein Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ — Varanasi"
        description="Ganga aarti wedding booking Varanasi mein — shaadi mein Maa Ganga ki divya aarti, shaadi ke liye Pandit Ji, wedding car, tent decoration, DJ, catering, photography aur band baja. Free quotation paayein, pakki booking karein."
        path="/" image="/images/hero-aarti.jpg" jsonLd={ld} />
      <section className="hero hero-v2">
        <div className="hero-photo" aria-hidden="true">
          <img src="/images/hero-aarti.jpg" alt="" />
          <img className="hero-photo-b" src="/images/couple-aarti.jpg" alt="" />
        </div>
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-inner">
          <h1>Shaadi Mein <span className="hl">Ganga Aarti</span> —<br />Aur Poori Wedding Vyavastha, Ek Hi Jagah</h1>
          <p>Dulha-dulhan ke liye Maa Ganga ka aashirwad, venue par bhavya aarti, saath mein Pandit Ji, gaadi, tent, DJ, catering, photography aur band baja — free quotation ke saath pakki booking.</p>
          <div className="hero-card">
            <div className="hero-card-text">
              <b>Apni shaadi ka rate jaanna hai?</b>
              <span>Free quotation maangein — koi charge nahi, koi zabardasti nahi. Partners apne best rate yahin bhejenge.</span>
            </div>
            <div className="hero-card-actions">
              <Link className="btn btn-maroon" to="/dashboard/quote">Free Quotation Maangein</Link>
            </div>
          </div>
          <div className="trust-chips" aria-label="Bharosa">
            <span>🛡️ Verified Partners</span>
            <span>💰 Saaf Rate, Koi Chhupa Charge Nahi</span>
            <span>🕕 Samay Par Seva</span>
          </div>
          <a className="scroll-hint" href="#home-services" aria-label="Neeche sevayein dekhein"><span className="scroll-arrow">⌄</span>Neeche Dekhein</a>
        </div>
      </section>

      <section className="trust-strip" aria-label="Bharosa aur uplabdhiyan">
        <div className="wrap trust-grid">
          <div className="trust-item"><span className="trust-icon">🪔</span><div><b><Counter to={500} suffix="+" /> Shaadiyan</b><span>Khushi se sampann</span></div></div>
          <div className="trust-item"><span className="trust-icon">⭐</span><div><b><Counter to={4.9} decimals={1} /> / 5 Rating</b><span>Parivaaron ka bharosa</span></div></div>
          <div className="trust-item"><span className="trust-icon">🛡️</span><div><b>Verified Partners</b><span>Sirf anubhavi vendors</span></div></div>
          <div className="trust-item"><span className="trust-icon">💰</span><div><b>Saaf Rate</b><span>Koi chhupa charge nahi</span></div></div>
          <div className="trust-item"><span className="trust-icon">📍</span><div><b>Varanasi + 5 Shahar</b><span>Lucknow, Prayagraj, Ayodhya…</span></div></div>
        </div>
      </section>

      <section className="section wrap">
        <SecHead eyebrow="Saari Sevayein" title="Har Seva, Ek Hi Jagah" lead="Kisi bhi photo par tap karein — us seva ke rate, details aur verified partners turant milenge." />
        <div className="cat-tiles">
          {cats.map((c) => (
            <Link key={c.slug} className="cat-tile" to={`/services/${c.slug}`} aria-label={`${c.name} — ${inr(c.startingPrice)} se shuru`}>
              {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <span className="cat-tile-icon" aria-hidden="true">{c.icon}</span>}
              <span className="cat-tile-shade" aria-hidden="true" />
              <span className="cat-tile-body">
                <b>{c.icon} {c.name}</b>
                <small>{inr(c.startingPrice)} se shuru · {c.unit}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {pkgs.length > 0 && (
        <section className="section" style={{ background: '#fdf8ec' }}>
          <div className="wrap">
            <SecHead eyebrow="Aarti Packages" title="Ganga Aarti Wedding Packages" lead="Venue par ya Varanasi ke ghat par — purohiton ki team ke saath Maa Ganga ki bhavya aarti. Saaf rate, koi chhupa charge nahi." />
            <div className="grid grid-3">
              {pkgs.map((p, i) => <Reveal key={p.id} className="reveal-cell" delay={i * 90}><PackageCard pkg={p} /></Reveal>)}
            </div>
            <p style={{ textAlign: 'center', marginTop: 22 }}><Link className="btn btn-maroon" to="/packages">View All — Saare Packages Dekhein</Link></p>
          </div>
        </section>
      )}


      <section className="section wrap" id="home-services">
        <SecHead eyebrow="Hamari Sevayein" title="Shaadi Ka Har Kaam, Ek Hi Jagah" lead="Ganga Aarti hamari pehchan hai, lekin shaadi ka har intezam hum karte hain. Har seva ke liye verified local partners, saaf rate aur quotation pehle — booking baad mein." />
        {cats.length === 0 ? <p className="lead">Sevayein jald hi uplabdh hongi — tab tak <Link to="/contact">sampark karein</Link>.</p> : (
          <div className="grid grid-4">
            {cats.map((c, i) => <Reveal key={c.slug} className="reveal-cell" delay={(i % 4) * 70}><CategoryCard cat={c} /></Reveal>)}
          </div>
        )}
      </section>

      <FeaturedShelf />

      <RecentlyViewedShelf />

      <section className="section wrap">
        <SecHead eyebrow="Aasan Process" title="Booking Kaise Hoti Hai?" lead="Shaadi ki taiyaari aasan — sirf 4 step mein." />
        <Reveal><div className="steps">
          <div className="step"><div className="num">1</div><h3>Free Quotation Bhejein</h3><p>Service chunein, shaadi ki date, shahar aur mehmaanon ki sankhya batayein — bilkul free, koi charge nahi.</p></div>
          <div className="step"><div className="num">2</div><h3>Rate Compare Karein</h3><p>Partners aapko apne rate aur details bhejenge. Pasand wala chunein, koi zabardasti nahi.</p></div>
          <div className="step"><div className="num">3</div><h3>Booking Pakki Karein</h3><p>Quotation accept karte hi booking ban jayegi. Status My Bookings mein live dikhega.</p></div>
          <div className="step"><div className="num">4</div><h3>Nishchint Shaadi 🎉</h3><p>Team samay par pahunchti hai aur saara intezam sambhalti hai — aap bas aashirwad aur khushiyon mein shaamil hon.</p></div>
        </div></Reveal>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <SecHead eyebrow="Bharosa Aur Parampara" title="Kyoon Chunein Ganga Aarti Booking?" lead="Shaadi zindagi ka sabse khaas din hota hai — isliye har intezam mein bharosa, parampara aur saaf-suthra kaam hi hamari pehchan hai." />
          <Reveal><div className="grid grid-3">
            <div className="why-item"><span className="why-icon">💰</span><h3>Saaf Rate, Koi Chhupa Charge Nahi</h3><p>Har seva ka rate pehle quotation mein likh kar milta hai. Jo rate pakka, wahi antim — baad mein koi extra maang nahi.</p></div>
            <div className="why-item"><span className="why-icon">🛡️</span><h3>Sirf Verified Partners</h3><p>Har pandit, decorator, driver aur vendor pehle jaanch-parakh ke baad hi platform par aata hai. Anubhav aur vyavhaar dono pakke.</p></div>
            <div className="why-item"><span className="why-icon">🪔</span><h3>Asli Kashi Ki Parampara</h3><p>Ganga Aarti aur vivah vidhi poori Vedic parampara se hoti hai — Kashi ke anubhavi purohiton ke saath, bina koi kami ke.</p></div>
            <div className="why-item"><span className="why-icon">📋</span><h3>Pehle Quotation, Phir Booking</h3><p>Compare karein, sawal puche, phir faisla lein. Pasand aaye tabhi booking pakki — koi zabardasti ya advance ka dabav nahi.</p></div>
            <div className="why-item"><span className="why-icon">🕕</span><h3>Samay Ki Poori Pabandi</h3><p>Muhurat ek baar nikal jaye to wapas nahi aata — hamari har team karyakram se pehle pahunch kar taiyaari poori karti hai.</p></div>
            <div className="why-item"><span className="why-icon">🤝</span><h3>Ek Jagah Poori Vyavastha</h3><p>Aarti se vidaai tak — pandit, gaadi, tent, DJ, khana, photo, band — 8 sevayein ek hi platform par, ek hi sampark mein.</p></div>
          </div></Reveal>
        </div>
      </section>

      <section className="section" style={{ background: '#fdf8ec' }}>
        <div className="wrap">
          <SecHead eyebrow="Parivaaron Ki Zubaani" title="Parivaaron Ke Anubhav" lead="500+ parivaaron ne apni shaadi ka sabse khaas din humare saath manaaya." />
          <Reveal><TestimonialsSlider /></Reveal>
        </div>
      </section>

      <section className="section wrap">
        <SecHead eyebrow="Gallery" title="Hamare Karyakramon Ki Jhalak" lead="Asli shaadiyon, asli intezamon ki tasveerein — aarti se lekar vidaai tak." />
        <Reveal><div className="gallery-grid">
          {GALLERY.map((g) => <figure key={g.src}><img src={g.src} alt={g.caption} loading="lazy" /><figcaption>{g.caption}</figcaption></figure>)}
        </div></Reveal>
        <p style={{ textAlign: 'center', marginTop: 22 }}><Link className="btn btn-maroon" to="/gallery">Poori Gallery Dekhein</Link></p>
      </section>

      <section className="section wrap">
        <Reveal>
          <div className="app-banner">
            <div>
              <h2>📲 Ab Ganga Aarti Booking Ka App Bhi Hai!</h2>
              <p>Bina Play Store, seedha yahin se install karein — home screen par 🪔 icon aa jayega, app pehle se tez khulega aur bilkul app jaisa anubhav milega. Koi badi file download nahi hoti.</p>
            </div>
            <div className="partner-cta">
              <InstallAppButton className="btn btn-gold" />
              <Link className="btn btn-ghost" to="/app">Install Ka Tareeka</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section wrap">
        <SecHead eyebrow="Sawal-Jawab" title="Aksar Puche Jaane Wale Sawal" />
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {GENERAL_FAQS.slice(0, 4).map(([q, a]) => <div className="faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
          <p style={{ textAlign: 'center' }}><Link className="btn btn-maroon" to="/faq">Saare Sawal Dekhein</Link></p>
        </div>
      </section>

      <section className="partner-band">
        <div className="wrap partner-inner">
          <p className="partner-line"><b>Partner Banein</b> — Pandit Ji, decorator, car owner, DJ, caterer, photographer ya band wale hain? Platform par apni seva jodein, seedha quotation paayein aur pakki booking lein. Commission sirf pakki booking par — sign up bilkul free hai.</p>
          <Link className="btn btn-gold" to="/partner-join">Partner Banein</Link>
        </div>
      </section>
    </>
  )
}

export function Services() {
  const cats = useCategories()
  return (
    <>
      <Seo title="Wedding Services Varanasi | Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ, Catering — Ganga Aarti Booking"
        description="Shaadi ki saari sevayein ek jagah — Ganga Aarti, Pandit Ji, wedding car, tent & decoration, DJ sound, catering, photography aur band baja booking Varanasi aur UP mein. Rate aur quotation online paayein."
        path="/services" jsonLd={breadcrumbLd([['Home', '/'], ['Services', '/services']])} />
      <div className="page-head"><h1>Shaadi Ki Saari Sevayein</h1><p>Verified partners ke products — photo, rating aur saaf rate ke saath. Filter karke apne budget ki seva chunein; bina login ke sab dekhiye, pasand aaye to seedha book karein.</p></div>
      <ShopListing cats={cats} />
    </>
  )
}

export function ServicePage() {
  const { slug } = useParams()
  const cats = useCategories()
  const cat = cats.find((c) => c.slug === slug) || categoryBySlug(slug)
  const [products, setProducts] = useState([])
  const [pLoading, setPLoading] = useState(true)
  const reviews = useReviews()
  useEffect(() => { if (cat) { setPLoading(true); store.listProducts({ category: cat.slug, activeOnly: true }).then((rows) => { setProducts(rows || []); setPLoading(false) }).catch(() => setPLoading(false)) } }, [slug])
  if (!cat) return <div className="wrap section"><h2>Service nahi mili</h2><p><Link to="/services">Saari sevayein dekhein</Link></p></div>
  const jsonLd = [serviceLd(cat), faqLd(cat.faqs), breadcrumbLd([['Home', '/'], ['Services', '/services'], [cat.name, `/services/${cat.slug}`]])]
  return (
    <>
      <Seo title={`${cat.name} Booking Varanasi | ${cat.keywords} — Ganga Aarti Booking`}
        description={`${cat.description.slice(0, 155)}… Rate ${inr(cat.startingPrice)} se shuru. Free quotation paayein.`}
        path={`/services/${cat.slug}`} image={cat.image || '/images/hero-aarti.jpg'} jsonLd={jsonLd} />
      <div className="page-head"><h1>{cat.icon} {cat.name} — Shaadi Ke Liye Booking</h1><p>{cat.tagline}</p></div>
      <section className="section wrap">
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div>
            {cat.image ? <img src={cat.image} alt={`${cat.name} — wedding booking Varanasi`} style={{ borderRadius: 16, boxShadow: 'var(--shadow)' }} /> : <CategoryVisual cat={cat} h={260} />}
          </div>
          <div>
            <p className="price" style={{ fontSize: '1.7rem' }}>{inr(cat.startingPrice)} <small>se shuru · {cat.unit}</small></p>
            <DescBlock text={cat.description} />
            <h3>Khaas Baatein (Highlights)</h3>
            <ul className="ticks">{cat.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <Link className="btn btn-gold" to={`/dashboard/quote?category=${cat.slug}`}>Free Quotation Maangein</Link>
              <Link className="btn btn-ghost" to="/packages">Packages Dekhein</Link>
            </div>
          </div>
        </div>
      </section>
      {(pLoading || products.length > 0) && (
        <section className="section" style={{ background: '#fdf3da', paddingTop: 36 }}>
          <div className="wrap">
            <h2>Partners Ke {cat.name} Offers</h2>
            <div className="shop-grid">
              {pLoading ? <SkeletonGrid count={4} /> : products.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
            </div>
          </div>
        </section>
      )}
      <section className="section wrap">
        <h2>{cat.name} — Aksar Puche Sawal</h2>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {cat.faqs.map(([q, a]) => <div className="faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
        </div>
        <h2 style={{ marginTop: 40 }}>Doosri Sevayein Bhi Dekhein</h2>
        <div className="grid grid-4">
          {cats.filter((c) => c.slug !== cat.slug).slice(0, 4).map((c) => <CategoryCard key={c.slug} cat={c} />)}
        </div>
      </section>
    </>
  )
}

export function Packages() {
  const pkgs = useAartiPackages()
  return (
    <>
      <Seo title="Wedding Packages | Ganga Aarti ₹11,000 Se, Pandit Ji ₹5,100 Se — Ganga Aarti Booking"
        description="Ganga Aarti wedding packages — Shubh Aarti ₹11,000, Family Ganga Aarti ₹21,000, Grand Wedding Aarti ₹51,000. Pandit Ji packages ₹5,100 se. Saari details aur booking online."
        path="/packages" jsonLd={breadcrumbLd([['Home', '/'], ['Packages', '/packages']])} />
      <div className="page-head"><h1>Wedding Packages</h1><p>Saaf rate, koi chhupa charge nahi. Package chunein aur quotation ke saath booking pakki karein.</p></div>
      <section className="section wrap">
        <h2>🪔 Ganga Aarti Packages</h2>
        {pkgs.length === 0 ? <p className="lead">Packages jald hi uplabdh honge — tab tak <Link to="/dashboard/quote">free quotation</Link> maangein.</p> : (
          <div className="grid grid-3">{pkgs.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
        )}
        <h2 style={{ marginTop: 48 }}>🙏 Pandit Ji Packages</h2>
        <div className="grid grid-3">{PANDIT_PACKAGES.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
        <p className="lead" style={{ marginTop: 36 }}>Gaadi, tent, DJ, catering, photography aur band baja ke liye <Link to="/services">services page</Link> par jaakar free quotation maangein — partners apne best rate bhejenge.</p>
      </section>
    </>
  )
}

export function Gallery() {
  return (
    <>
      <Seo title="Gallery | Shaadi Mein Ganga Aarti, Mandap, Gaadi — Ganga Aarti Booking"
        description="Hamare karyakramon ki jhalak — shaadi mein Ganga Aarti, dulha-dulhan ki aarti, vivah puja, mandap sajawat, vidaai gaadi aur sangeet DJ."
        path="/gallery" />
      <div className="page-head"><h1>Gallery</h1><p>Hamare intezamon ki kuchh jhalkiyan</p></div>
      <section className="section wrap">
        <div className="gallery-grid">
          {GALLERY.map((g) => <figure key={g.src}><img src={g.src} alt={g.caption} loading="lazy" /><figcaption>{g.caption}</figcaption></figure>)}
        </div>
      </section>
    </>
  )
}

export function About() {
  return (
    <>
      <Seo title="About Us | Ganga Aarti Booking — Varanasi Ka Wedding Services Platform"
        description="Ganga Aarti Booking Varanasi se shuru hua platform hai jo shaadiyon mein Ganga Aarti aur poori wedding vyavastha — pandit, gaadi, tent, DJ, catering — ek jagah deta hai."
        path="/about" jsonLd={breadcrumbLd([['Home', '/'], ['About', '/about']])} />
      <div className="page-head"><h1>Hamare Baare Mein</h1><p>Kashi ki parampara, aaj ki suvidha</p></div>
      <section className="section wrap" style={{ maxWidth: 860 }}>
        <p><b>Ganga Aarti Booking</b> ki shuruaat ek saral vichaar se hui — jab koi parivaar apni shaadi mein Maa Ganga ki aarti karana chahta hai, to use purohit, samagri aur vyavastha ke liye idhar-udhar bhatakna padta hai. Humne wahi divya anubhav aapke wedding venue tak pahunchane ka kaam shuru kiya.</p>
        <p>Aaj hum sirf aarti hi nahi, shaadi ki <b>poori vyavastha</b> dete hain — Pandit Ji, gaadi, tent aur sajawat, DJ, catering, photography aur band baja. Varanasi ke sthaniya, verified partners ke saath hum rate pehle quotation mein saaf batate hain, taaki parivaar bina mol-bhaav ke tanav ke shaadi ka anand le sake.</p>
        <h3>Hamare Vaade</h3>
        <ul className="ticks">
          <li>Saaf rate — quotation pehle, booking baad mein</li>
          <li>Samay ki pabandi — har team samay par</li>
          <li>Vedic vidhi aur parampara ka samman</li>
          <li>Sirf verified aur anubhavi partners</li>
        </ul>
        <p style={{ marginTop: 20 }}><Link className="btn btn-gold" to="/dashboard/quote">Apni Shaadi Ke Liye Quotation Maangein</Link></p>
      </section>
    </>
  )
}

export function Faq() {
  const all = [...GENERAL_FAQS, ...CATEGORIES.flatMap((c) => c.faqs)]
  return (
    <>
      <Seo title="FAQ | Ganga Aarti Wedding Booking Ke Sawal-Jawab — Ganga Aarti Booking"
        description="Ganga Aarti wedding booking, pandit ji, gaadi, tent, DJ aur catering booking se jude saare aam sawalon ke jawab — rate, advance, cancel aur partner banne ki jaankari."
        path="/faq" jsonLd={faqLd(all)} />
      <div className="page-head"><h1>Aksar Puche Jaane Wale Sawal</h1><p>Booking se pehle man ke saare sawal, saaf jawab</p></div>
      <section className="section wrap" style={{ maxWidth: 860 }}>
        {all.map(([q, a]) => <div className="faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
      </section>
    </>
  )
}

export function Contact() {
  const settings = useSettings()
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await store.addEnquiry(form).catch(() => {})
    setBusy(false)
    setDone(true)
  }
  return (
    <>
      <Seo title="Contact | Ganga Aarti Booking — Varanasi" description="Ganga Aarti Booking se sampark karein — shaadi mein Ganga Aarti, pandit ji, gaadi, tent, DJ booking ke liye call ya message karein. Varanasi, UP." path="/contact" />
      <div className="page-head"><h1>Sampark Karein</h1><p>Hum subah 8 se raat 10 baje tak uplabdh hain</p></div>
      <section className="section wrap">
        <div className="form-card">
          <p>📞 <b>{settings.contact_phone || SITE.phone}</b><br />✉️ <b>{settings.contact_email || SITE.email}</b><br />📍 {SITE.city}</p>
          {done ? <div className="ok">🙏 Dhanyavaad! Aapka sandesh mil gaya hai. Hum jald hi sampark karenge.</div> : (
            <form onSubmit={submit}>
              <label>Naam</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aapka naam" />
              <label>Mobile Number</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
              <label>Email (vaikalpik)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              <label>Sandesh</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Shaadi ki date, shahar aur kis seva ki jaankari chahiye…" />
              <button className="btn btn-gold" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{busy ? 'Bhej rahe hain…' : 'Sandesh Bhejein'}</button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}

function PolicyShell({ title, desc, path, h1, sub, children }) {
  return (
    <>
      <Seo title={title} description={desc} path={path} jsonLd={breadcrumbLd([['Home', '/'], [h1, path]])} />
      <div className="page-head"><h1>{h1}</h1><p>{sub}</p></div>
      <section className="section wrap policy" style={{ maxWidth: 860 }}>{children}</section>
    </>
  )
}

export function Terms() {
  return (
    <PolicyShell title="Seva Ki Shartein (Terms of Service) | Ganga Aarti Booking" desc="Ganga Aarti Booking ki seva shartein — booking, quotation, commission, partner ki zimmedariyan aur platform ki bhoomika." path="/terms" h1="Seva Ki Shartein" sub="Website aur sevaon ke upyog ke niyam — saral bhasha mein">
      <h3>1. Platform Ki Bhoomika</h3>
      <p>Ganga Aarti Booking ek online madhyam (facilitator) hai jo grahakon (users) ko sthaniya wedding service dene walon (partners) se jodta hai. Aarti, puja, gaadi, tent, DJ, catering, photography, band baja jaisi asal sevayein sambandhit partner deta hai — platform quotation maangne, rate compare karne, booking banane aur sampark ki suvidha deta hai.</p>
      <h3>2. Quotation Aur Booking</h3>
      <p>Quotation bilkul free hai aur usse koi bandhan nahi banta. Booking tab pakki mani jaati hai jab (k) quotation mein partner ke rate ko grahak accept kare, ya (kh) direct booking par partner Accept kare aur grahak Final Confirm kare. Booking ki date, jagah aur rakam wahi hogi jo booking mein likhi hai — badlav ke liye dono pakshon ki sahmati zaroori hai.</p>
      <h3>3. Rate Aur Payment</h3>
      <p>Rate pehle se saaf dikhaya jata hai; platform koi chhupa charge nahi lagata. Booking surakshit rakhne ke liye 20% advance liya ja sakta hai; baaki rakam karyakram ke din seva ke baad di jaati hai. Advance aur refund ke niyam <Link to="/refund-policy">Refund Policy</Link> mein hain.</p>
      <h3>4. Partner Ki Zimmedariyan</h3>
      <p>Partner apni di gayi jaankari (rate, photo, varnan) ki sachchai, samay par upasthiti aur seva ki gunvatta ke liye zimmedar hai. Galat jaankari, baar-baar mana karna ya grahak se durvyavhaar par platform partner ko hata sakta hai.</p>
      <h3>5. Grahak Ki Zimmedariyan</h3>
      <p>Grahak sahi date, jagah aur sampark jaankari de, aur pakki booking ko bina kaaran aakhri samay par na tode. Cancel ke niyam Refund Policy mein saaf diye hain.</p>
      <h3>6. Commission</h3>
      <p>Platform pakki booking par partner se commission leta hai — pratishat (%) wala commission booking se pehle partner ko uske panel mein saaf dikhta hai, aur partner ki khud daali hui offline (manual) booking par sirf ek nishchit flat rakam (abhi ₹50) lagti hai. Commission ke alawa koi anya shulk nahi hai.</p>
      <h3>7. Vivad Aur Sampark</h3>
      <p>Koi samasya ho to pehle <Link to="/contact">Contact page</Link> se humse baat karein — hum dono pakshon ki baat sunkar uchit hal nikalne ki poori koshish karenge. Ye shartein samay-samay par bina soochna ke badli ja sakti hain; nayi shartein website par lagte hi lagu hongi.</p>
    </PolicyShell>
  )
}

export function Privacy() {
  return (
    <PolicyShell title="Privacy Policy | Ganga Aarti Booking" desc="Ganga Aarti Booking privacy policy — kaunsi jaankari li jaati hai, uska upyog, suraksha aur aapke adhikar." path="/privacy" h1="Privacy Policy" sub="Aapki jaankari, aapka adhikar — saaf aur saral shabdon mein">
      <h3>1. Hum Kaunsi Jaankari Lete Hain</h3>
      <p>Account banate samay: naam, email, mobile number, shahar aur (partners ke liye) business ka naam. Booking/quotation ke samay: karyakram ki date, jagah, mehmaanon ki sankhya aur aapke notes. Payment ke samay: sirf payment ki pushti ke liye transaction ID — aapke card/UPI ke gupt vivaran humare paas kabhi nahi aate, wo seedha payment provider (jaise Razorpay / aapka UPI app) sambhalta hai.</p>
      <h3>2. Jaankari Ka Upyog</h3>
      <p>Sirf in kaamon ke liye: quotation aur booking chalana, partner ko aapki booking ki details dena (taaki wo seva de sake), payment ki pushti, aur seva sudharna. Aapki jaankari vigyapan ke liye kisi teesre paksh ko bechi nahi jaati.</p>
      <h3>3. Kiske Saath Baant-te Hain</h3>
      <p>Sirf usi partner ke saath jisse aapki booking/quotation judi hai (naam, shahar, date, karyakram ki details), aur takneeki seva dene walon ke saath (hosting/database/payment provider) — utna hi jitna seva chalane ke liye zaroori hai.</p>
      <h3>4. Suraksha</h3>
      <p>Jaankari surakshit database mein rakhi jaati hai aur password kabhi saade roop mein nahi rakha jaata. Phir bhi internet par koi bhi vyavastha 100% suraksha ki guarantee nahi de sakti — apna password kisi ke saath na baantein.</p>
      <h3>5. Aapke Adhikar</h3>
      <p>Aap apni profile jaankari apne account (My Bookings → Profile) se kabhi bhi badal sakte hain. Apna account ya jaankari hatani ho to <Link to="/contact">Contact page</Link> se likhein — hum uchit samay mein kaarravaai karenge.</p>
    </PolicyShell>
  )
}

export function RefundPolicy() {
  return (
    <PolicyShell title="Refund Aur Cancellation Policy | Ganga Aarti Booking" desc="Advance refund ke niyam — partner reject/cancel par 100% refund; grahak cancel par din ke hisaab se slab." path="/refund-policy" h1="Refund Aur Cancellation Policy" sub="Advance wapas kab aur kitna milega — pehle se saaf">
      <h3>1. Partner Reject Ya Cancel Kare</h3>
      <p>Agar partner booking ko reject karta hai ya apni taraf se cancel karta hai, to diya gaya advance <b>poora (100%)</b> wapas milega — bina koi katauti.</p>
      <h3>2. Grahak Cancel Kare — Din Ke Hisaab Se Slab</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Cancel Kab Kiya</th><th>Advance Refund</th></tr></thead>
        <tbody>
          <tr><td>Karyakram se <b>15 din ya zyada</b> pehle</td><td><b>100%</b> — poora advance wapas</td></tr>
          <tr><td>Karyakram se <b>7–14 din</b> pehle</td><td><b>50%</b> — aadha advance wapas</td></tr>
          <tr><td>Karyakram se <b>7 din se kam</b> pehle</td><td>Advance wapas nahi — partner ne woh date doosron ke liye band kar di hoti hai</td></tr>
        </tbody>
      </table></div>
      <h3>3. Booking Abhi Pakki Nahi Hui Ho</h3>
      <p>Agar booking abhi confirmation ke charan mein hai (partner ya grahak ki pushti baaki) aur payment bhi nahi hua, to cancel par kuchh nahi katata — koi rakam li hi nahi gayi hoti.</p>
      <h3>4. Refund Ka Samay Aur Tareeka</h3>
      <p>Manzoor refund aam taur par <b>5–7 kaam ke dinon</b> mein usi madhyam se wapas hota hai jisse payment hua tha (UPI/Razorpay). Koi samasya ho to apni booking ki details ke saath <Link to="/contact">sampark karein</Link>.</p>
      <h3>5. Vishesh Paristhiti</h3>
      <p>Barish, prakritik aapda ya sarkari rok jaisi aniyantrit paristhiti mein dono paksh milkar nayi date tay kar sakte hain — aisi sthiti mein advance nayi date par lagu rahega.</p>
    </PolicyShell>
  )
}

// ── /user — User (grahak) ka entry page ─────────────────────────────────────
// User aur Partner ke raste ab bilkul alag hain: grahak yahan se apne panel
// tak jaata hai, partner /partner-join se. Is page par sirf 3 line ki
// samjhais + sahi buttons — koi confusion nahi.
export function UserHub() {
  const { user } = useAuth()
  return (
    <>
      <Seo title="My Bookings | Ganga Aarti Booking — Grahakon Ke Liye" description="My Bookings — grahakon ke liye entry: free quotation maangein, partners ke rate compare karein, booking pakki karein aur advance payment karein. Sign up ya login yahin se." path="/user" />
      <div className="page-head"><h1>👤 My Bookings — Grahakon Ke Liye</h1><p>Aapki bookings aur quotations — ek hi jagah</p></div>
      <section className="section wrap">
        <div className="form-card wide" style={{ margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Yahan Kya Hota Hai?</h3>
          <p className="lead" style={{ margin: '6px auto 16px' }}>
            1. <b>Free quotation</b> maangein — partners apne rate bhejenge.<br />
            2. Rate compare karke pasand wala accept karein — <b>booking pakki</b>.<br />
            3. My Bookings mein hi booking ka status, chat aur <b>advance payment</b> sambhalein.
          </p>
          {user?.role === 'user' ? (
            <Link className="btn btn-gold" to="/dashboard">My Bookings Dekhein</Link>
          ) : user?.role === 'partner' ? (
            <>
              <p className="hint">Aap Partner account se login hain.</p>
              <Link className="btn btn-gold" to="/partner">Partner Panel Kholein</Link>
            </>
          ) : user?.role === 'admin' ? (
            <Link className="btn btn-gold" to="/admin">Admin Panel Kholein</Link>
          ) : (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-gold" to="/signup/user">Sign Up (User) — Free</Link>
              <Link className="btn btn-ghost" to="/login">Login</Link>
            </div>
          )}
          <p className="hint" style={{ marginTop: 14 }}>Seva bechni hai, booking nahi karni? Aapke liye alag page hai — <Link to="/partner-join">Partner Banein</Link>.</p>
        </div>
      </section>
    </>
  )
}

export function PartnerJoin() {
  const settings = useSettings()
  const { user } = useAuth()
  const flat = Number(settings.manual_booking_commission) || 50
  return (
    <>
      <Seo title="Partner Banein | Apni Wedding Services Bechiye — Ganga Aarti Booking" description="Pandit Ji, decorator, gaadi, DJ, caterer, photographer, band wale — free partner banein, apni storefront website paayein, manual booking par sirf ₹50 commission, referral se 5% kamai 1 saal tak." path="/partner-join" image="/images/partner-join.jpg" jsonLd={breadcrumbLd([['Home', '/'], ['Partner Banein', '/partner-join']])} />
      <div className="page-head"><h1>🤝 Partner Banein — Apna Business Badhayein</h1><p>Pandit Ji, decorator, gaadi wale, DJ, caterer, photographer, band wale — sabka swagat hai</p></div>
      <section className="wrap" style={{ paddingTop: 26 }}>
        <img src="/images/partner-join.jpg" alt="Ganga Aarti Booking ke partners — wedding services" style={{ width: '100%', borderRadius: 16, boxShadow: 'var(--shadow)', maxHeight: 380, aspectRatio: '21 / 9', backgroundColor: '#EDE9E3', objectFit: 'cover', display: 'block' }} />
      </section>
      <section className="section wrap">
        <div className="grid grid-3">
          <div className="why-item"><span className="why-icon">🆓</span><h3>Join Karna Bilkul Free</h3><p>Koi registration fees nahi, koi monthly charge nahi. Commission sirf tab, jab pakki booking mile.</p></div>
          <div className="why-item"><span className="why-icon">🌐</span><h3>Aapki Apni Storefront Website</h3><p>Har partner ko apne naam ka link milta hai — jaise <b>/p/aapka-naam</b>. Us par sirf aapke products dikhte hain; wahan se aayi quotation/booking seedha aapko milti hai, hisaab aapke panel mein.</p></div>
          <div className="why-item"><span className="why-icon">🛠️</span><h3>Ek Se Zyada Sevayein (Multi-Role)</h3><p>Pandit Ji bhi hain aur DJ bhi? Dono chun lein. Aapka panel har seva ke hisaab se apne aap dhal jata hai.</p></div>
          <div className="why-item"><span className="why-icon">✍️</span><h3>Manual Booking Par Sirf {inr(flat)}</h3><p>Apne purane grahak ki offline booking panel mein daalein — commission pratishat nahi, sirf flat {inr(flat)}. Baaki poori rakam aapki.</p></div>
          <div className="why-item"><span className="why-icon">🔗</span><h3>Referral Se 5% Kamai — 1 Saal</h3><p>Doosre vendors ko apne referral link se jodein. Unki har booking par aapko <b>5%</b> milega — unke judne se <b>pure 1 saal</b> tak.</p></div>
          <div className="why-item"><span className="why-icon">💰</span><h3>Saaf Commission, Koi Chhupa Charge Nahi</h3><p>Har booking par commission kitna katega aur aapko kitna milega — panel mein pehle se saaf dikhta hai.</p></div>
        </div>
        <div className="form-card wide" style={{ marginTop: 34, textAlign: 'center' }}>
          <h3>🚀 Aaj Hi Shuru Karein — 2 Minute Mein</h3>
          <p className="lead" style={{ margin: '6px auto 14px' }}>Partner Sign Up par apni sevayein tick karein, pehla product add karein — bas, aapki dukaan online!</p>
          {user?.role === 'partner' ? (
            <Link className="btn btn-gold" to="/partner">Mera Partner Panel Kholein</Link>
          ) : (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-gold" to="/signup/partner">Partner Sign Up — Bilkul Free</Link>
              <Link className="btn btn-ghost" to="/login">Pehle Se Account Hai? Login Karein</Link>
            </div>
          )}
          <p className="hint" style={{ marginTop: 12 }}>🎉 Kisi partner ne aapko bulaya hai? Sign up form mein unka <b>referral code</b> zaroor daalein — unhe referral kamai milegi, aapko kuchh extra nahi lagega.</p>
        </div>
      </section>
    </>
  )
}

export function AppDownload() {
  const { user } = useAuth()
  return (
    <>
      <Seo title="App Download | Ganga Aarti Booking — Android App (APK) Download Karein" description="Ganga Aarti Booking ka asli Android app seedha website se download karein (APK) — Chrome ki zaroorat nahi, notifications app ke apne system se. Ya bina download kiye home screen par lagayein — Android aur iPhone dono ke aasan steps." path="/app" image="/images/hero-aarti.jpg" jsonLd={breadcrumbLd([['Home', '/'], ['App Download', '/app']])} />
      <div className="page-head"><h1>📲 Ganga Aarti Booking App</h1><p>Asli Android app download karein — ya bina download kiye home screen par lagayein</p></div>
      <section className="section wrap">
        <div className="form-card wide" style={{ margin: '0 auto 34px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.6rem', lineHeight: 1 }} aria-hidden="true">🪔</div>
          <h3 style={{ marginTop: 8 }}>Ganga Aarti Booking — Android App</h3>
          <p className="hint" style={{ margin: '4px auto 10px' }}>Version 1.0 · 3.8 MB · Android 8.0+</p>
          <p className="lead" style={{ margin: '6px auto 16px' }}>Ye <b>asli Android app</b> hai — browser ya Chrome ki zaroorat nahi. Ek baar install kar lein, phir notifications bhi app ke <b>apne system</b> se aayengi — offers, quotation ke jawab aur booking updates seedha ghanti bankar, bilkul doosre apps ki tarah.</p>
          <a className="btn btn-maroon" style={{ fontSize: '1.05rem', padding: '14px 34px' }} href="/app/ganga-aarti-booking.apk" download>Android App Download Karein</a>
          <p className="hint" style={{ marginTop: 16, textAlign: 'left' }}><b>Install ke aasan steps:</b><br />1. Upar wala <b>Download</b> button dabayein — app ki file download ho jayegi.<br />2. Download hui file kholein. Phone <b>"Unknown apps / Install unknown apps"</b> ki anumati maange to <b>Allow</b> karein — ye aapki apni official app hai, bilkul surakshit hai.<br />3. <b>Install</b> dabayein — app home screen par 🪔 icon ke saath aa jayega.<br />4. App kholein aur <b>wahi account</b> use karein jo website par hai — aapki saari bookings aur quotations waisi ki waisi dikhengi.</p>
        </div>

        <div className="grid grid-3">
          <div className="why-item"><span className="why-icon">⚡</span><h3>Tez Khulta Hai</h3><p>Ek baar install ho jaye to app pehle se kahin tez khulta hai — shaadi ki taiyaari ke beech baar-baar browser kholne ki jhanjhat nahi.</p></div>
          <div className="why-item"><span className="why-icon">🪔</span><h3>Home Screen Par Icon</h3><p>Aapke phone ki home screen par 🪔 wala apna icon rahega — ek tap mein seedha quotation, booking aur My Bookings.</p></div>
          <div className="why-item"><span className="why-icon">📱</span><h3>App Jaisa Anubhav</h3><p>Poori screen par, bina browser ki patti ke — bilkul kisi app ki tarah saaf aur aasan. Wahi account, wahi bookings, wahi My Bookings.</p></div>
        </div>

        <div className="form-card wide" style={{ marginTop: 34, textAlign: 'center' }}>
          <h3>Bina Download Kiye — Website Ko Hi App Banayein</h3>
          <p className="lead" style={{ margin: '6px auto 14px' }}>APK na download karna ho to website ko hi home screen par app bankar laga sakte hain. Android phone par neeche wala button dabate hi install ka sawal aa jayega. iPhone par button aapko steps dikhayega — bas 3 tap ka kaam hai.</p>
          <InstallAppButton className="btn btn-gold" />
          <p className="hint" style={{ marginTop: 12 }}>Button kaam na kare to neeche diye gaye haath wale steps apnayein — 1 minute se kam lagega.</p>
        </div>

        <div className="form-card wide" style={{ marginTop: 34, textAlign: 'center' }}>
          <h3>🔔 Notifications ON Karein — Offers Aur Booking Updates Sabse Pehle</h3>
          <p className="lead" style={{ margin: '6px auto 14px' }}>Jab bhi koi khaas offer aayega, aapke quotation ka jawab milega ya booking update hogi — seedha aapke phone par ghanti bajegi. Ek baar ON karein, phir kabhi koi khabar chhutegi nahi.</p>
          <NotificationToggle userId={user ? user.id : null} className="btn btn-gold" />
          <p className="hint" style={{ marginTop: 12 }}>iPhone par notifications ke liye pehle app ko home screen par lagayein (upar wale steps), phir yahi button dabayein. Band karna ho to yahi button dobara dabane se OFF ho jayega.</p>
        </div>

        <div className="policy" style={{ maxWidth: 860, margin: '34px auto 0' }}>
          <h3>🤖 Android (Chrome) Par Install — Steps</h3>
          <p>1. Ye page Chrome browser mein kholein (aap shayad pehle se yahin hain).<br />2. Upar <b>"Bina Download Kiye"</b> wale hisse mein diye gaye button ko dabayein — install ka sawal aate hi <b>Install</b> chunein.<br />3. Agar button se sawal na aaye to Chrome ke upar-dahine kone ke <b>⋮ (teen bindu) menu</b> ko kholein aur <b>"App install karein"</b> ya <b>"Home screen par jodein"</b> chunein.<br />4. Bas! Home screen par 🪔 Ganga Aarti ka icon aa jayega.</p>
          <h3>🍎 iPhone (Safari) Par Install — Steps</h3>
          <p>1. Ye page <b>Safari</b> browser mein kholein (iPhone par install sirf Safari se hota hai).<br />2. Neeche bane <b>Share</b> button (⬆️ wala nishan) ko dabayein.<br />3. Neeche scroll karke <b>"Home Screen par jodein" (Add to Home Screen)</b> chunein, phir <b>Add</b> dabayein.<br />4. Home screen par app ka icon aa jayega — wahi se seedha khulega.</p>
          <h3>ℹ️ Ek Saaf Baat</h3>
          <p>App paane ke do tareeke hain aur dono yahi page deta hai: <b>(1) Asli Android app</b> — upar wale button se APK file download karke install karein; ye Play Store par nahi hai, isliye pehli baar phone "unknown sources" ki anumati maang sakta hai. Iske notifications app ke apne system se aate hain. <b>(2) Home-screen wala tareeka (PWA)</b> — wahi website aapke phone par app bankar lag jaati hai; koi file download nahi hoti, phone ki jagah bhi bahut kam ghirti hai, aur website par jo bhi naya badlav hoga wo isme apne aap dikhega. Dono mein account, quotation, booking aur payment — sab kuchh bilkul ek jaisa hi chalega.</p>
        </div>
      </section>
    </>
  )
}

export function NotFound() {
  return (
    <div className="wrap section" style={{ textAlign: 'center' }}>
      <h1>🪔 Page Nahi Mila</h1>
      <p>Ye page maujood nahi hai. <Link to="/">Home par wapas jayein</Link> ya <Link to="/services">sevayein dekhein</Link>.</p>
    </div>
  )
}

// ── Product page — /product/:id ─────────────────────────────────────────────
// Client-rendered (prerender list mein NAHI hai — SPA fallback shell deta
// hai). Poora page BINA LOGIN ke khulta hai — photo, rating, reviews sab
// public. Login sirf tab manga jata hai jab grahak booking form submit
// kare ("Pehle Login Karein" button, login ke baad wapas yahi page).
// Booking storefront wali hi store.createBooking call hai — partner ko
// jawab dena hota hai (status 'pending_partner'), source yahan 'website'.
export function ProductPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [partner, setPartner] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ date: '', city: 'Varanasi', venue: '', guests: 200 })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [photoIdx, setPhotoIdx] = useState(0)
  const [variantIdx, setVariantIdx] = useState(-1) // -1 = base (Standard) price

  useEffect(() => {
    let live = true
    setPhotoIdx(0)
    setVariantIdx(-1)
    ;(async () => {
      const rows = await store.listProducts({ activeOnly: true }).catch(() => [])
      const p = (rows || []).find((x) => x.id === id)
      if (!live) return
      if (!p) { setNotFound(true); setLoading(false); return }
      setProduct(p)
      pushRecent(p.id)
      const [par, revs] = await Promise.all([
        store.getPartnerById(p.partnerId).catch(() => null),
        store.listReviews().catch(() => []),
      ])
      if (!live) return
      setPartner(par)
      setReviews(revs || [])
      setLoading(false)
    })()
    return () => { live = false }
  }, [id])

  if (loading) return <div className="wrap section"><Spinner label="Product load ho raha hai…" /></div>
  if (notFound) return (
    <div className="wrap section" style={{ textAlign: 'center' }}>
      <h1>🛍️ Product Nahi Mila</h1>
      <p>Ho sakta hai ye product hataya gaya ho ya link galat ho.</p>
      <p><Link className="btn btn-gold" to="/services#marketplace">🛍️ Marketplace Dekhein</Link></p>
    </div>
  )

  const cat = categoryBySlug(product.category)
  const business = partner?.businessName || partner?.name || product.partnerName
  // Gallery: product ki saari photos (pehli = cover); photo hi na ho to
  // category ki photo fallback. Variants: chuna hua variant booking ka
  // price tay karta hai, warna base price.
  const gallery = product.images && product.images.length ? product.images : [cat?.image].filter(Boolean)
  const img = gallery[0] || ''
  const variants = product.variants || []
  const chosenVariant = variantIdx >= 0 ? variants[variantIdx] : null
  const bookPrice = chosenVariant ? Number(chosenVariant.price) : Number(product.price)
  const summary = summarize(reviews, product.partnerId)
  const partnerReviews = reviews.filter((r) => r.partnerId === product.partnerId)

  const shareProduct = async () => {
    const url = `${window.location.origin}/product/${product.id}`
    const data = { title: product.title, text: `${product.title} — ${business} · ${inr(product.price)} ${product.unit} · Ganga Aarti Booking par dekhein:`, url }
    if (navigator.share) {
      try { await navigator.share(data); return } catch { return /* user ne share band kiya */ }
    }
    try { await navigator.clipboard.writeText(`${data.text} ${url}`); toast('Link copy ho gaya — jise chahein bhej dein ✔') }
    catch { toast('Share nahi ho paya — browser ke address bar se link copy kar lein.', 'err') }
  }

  const submitBook = async (e) => {
    e.preventDefault()
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/product/${id}`)}`)
    if (user.role !== 'user') { toast('Booking ke liye User (grahak) account se login karein.', 'err'); return }
    if (!form.date || isPastDate(form.date)) { toast('⚠️ Sahi date chunein — karyakram ki date aaj ya aage ki honi chahiye.', 'err'); return }
    if (!Number(form.guests) || Number(form.guests) < 1) { toast('⚠️ Mehmaanon ki sankhya sahi bharein (1 ya zyada).', 'err'); return }
    setBusy(true)
    try {
      await store.createBooking({
        partnerId: product.partnerId, partnerName: business, category: product.category,
        // Variant ka label booking title mein rehta hai (bookings table mein
        // koi notes column nahi hai) — partner ko panel mein saaf dikhta hai.
        title: chosenVariant ? `${product.title} — Variant: ${chosenVariant.label}` : product.title,
        notes: chosenVariant ? `Variant: ${chosenVariant.label}` : '',
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), amount: bookPrice, source: 'website',
      }, user)
      setDone(`✔ Booking ${business} ko bhej di gayi hai! Partner Accept karenge to "My Bookings" mein ✅ Final Confirm ka button milega — uske baad advance payment khulega.`)
      toast('Booking bhej di gayi ✔')
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi.', 'err') }
    setBusy(false)
  }

  return (
    <>
      <Seo title={`${product.title} — ${inr(product.price)} | Ganga Aarti Booking`} description={`${product.title} — ${business} ki seva, ${product.city || 'Varanasi'}. Rate ${inr(product.price)} ${product.unit}. Photo, rating aur reviews ke saath seedhi online booking.`} path={`/product/${id}`} image={img || '/images/hero-aarti.jpg'} />
      <section className="section wrap product-page">
        <p className="hint" style={{ marginBottom: 14 }}><Link to="/services#marketplace">🛍️ Marketplace</Link>{cat ? <> · <Link to={`/services/${cat.slug}`}>{cat.icon} {cat.name}</Link></> : null}</p>
        <div className="product-hero">
          <div>
            {gallery.length ? <div className="ph product-photo"><img src={gallery[Math.min(photoIdx, gallery.length - 1)]} alt={product.title} /></div> : <div className="ph product-photo">{cat?.icon || '🪔'}</div>}
            {gallery.length > 1 && (
              <div className="p-thumbs" role="tablist" aria-label="Product ki photos">
                {gallery.map((g, i) => (
                  <button type="button" key={`${g}-${i}`} className={`p-thumb${i === photoIdx ? ' on' : ''}`} onClick={() => setPhotoIdx(i)} aria-label={`Photo ${i + 1} dekhein`} aria-selected={i === photoIdx}>
                    <img src={g} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            {cat && <span className="p-cat p-cat-lg">{cat.name}</span>}
            <h1 style={{ marginTop: 0 }}>{product.title}</h1>
            <p className="hint">🏪 {business}{product.city ? ` · 📍 ${product.city}` : ''}</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <RatingPill rating={summary} />
              {summary.count > 0 && <span className="hint">{summary.count} grahakon ke reviews</span>}
              <span className="product-actions-inline">
                <WishlistHeart id={product.id} className="wish-btn-inline" />
                <button type="button" className="share-btn" onClick={shareProduct}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="12" r="2.6" /><circle cx="17.5" cy="5.5" r="2.6" /><circle cx="17.5" cy="18.5" r="2.6" /><path d="m8.3 10.8 6.9-4M8.3 13.2l6.9 4" /></svg>
                  Share Karein
                </button>
              </span>
            </div>
            <p className="p-price" style={{ fontSize: '1.9rem', margin: '10px 0 2px' }}>{inr(bookPrice)} <small>{product.unit}</small></p>
            <p className="hint" style={{ margin: 0 }}>Saaf rate — koi chhupa charge nahi. Advance sirf 20%, baaki rakam karyakram ke din.</p>
            {variants.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b>Variant Chunein</b>
                <div className="variant-list" role="radiogroup" aria-label="Variant chunein">
                  <button type="button" className={`variant-opt${variantIdx === -1 ? ' on' : ''}`} onClick={() => setVariantIdx(-1)} role="radio" aria-checked={variantIdx === -1}>
                    <span>Standard</span><b>{inr(product.price)} <small>{product.unit}</small></b>
                  </button>
                  {variants.map((v, i) => (
                    <button type="button" key={`${v.label}-${i}`} className={`variant-opt${variantIdx === i ? ' on' : ''}`} onClick={() => setVariantIdx(i)} role="radio" aria-checked={variantIdx === i}>
                      <span>{v.label}</span><b>{inr(v.price)} <small>{product.unit}</small></b>
                    </button>
                  ))}
                </div>
                <p className="hint" style={{ margin: 0 }}>Booking chune hue variant ke rate par hi banegi.</p>
              </div>
            )}
            {product.description && <DescBlock text={product.description} />}
            {cat?.features?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h3 style={{ margin: '0 0 4px' }}>Khaas Baatein (Highlights)</h3>
                <ul className="ticks">{cat.features.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
            {partner?.slug && <p style={{ marginTop: 8 }}><Link to={`/p/${partner.slug}`}>🏪 Partner ki Page →</Link></p>}
          </div>
        </div>

        <div className="product-sticky-bar">
          <div className="product-sticky-price"><b>{inr(bookPrice)}</b> <small>{product.unit}</small></div>
          <a className="btn btn-maroon btn-sm" href="#book-form">Book Now</a>
        </div>

        <div className="product-lower">
          <div className="product-reviews">
          <h2>⭐ Partner ke Reviews</h2>
          {summary.count > 0 ? (
            <>
              <div className="review-summary">
                <span className="review-avg">{summary.avg.toFixed(1)}</span>
                <span><Stars value={summary.avg} /><br /><span className="hint">{summary.count} reviews — {business} ke saare products par mile-jule</span></span>
              </div>
              <div>
                {partnerReviews.slice(0, 10).map((r) => (
                  <div className="review-item" key={r.id}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Stars value={r.rating} />
                      <b>{r.userName || 'Grahak'}</b>
                      <span className="hint">{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.comment && <p style={{ margin: '4px 0 0' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
              {partnerReviews.length > 10 && <p className="hint">Sabse naye 10 reviews dikhaye gaye hain — kul {partnerReviews.length} reviews hain.</p>}
            </>
          ) : (
            <div className="empty-state"><p>⭐ Abhi koi review nahi — pehle customer banein!</p></div>
          )}
          </div>
          <form className="book-form" id="book-form" onSubmit={submitBook}>
            <h3>📅 Book Now — Details Bharein</h3>
            {done && <div className="ok">{done}<br /><Link to="/dashboard">Meri Bookings Dekhein →</Link></div>}
            <div className="form-row">
              <div><label>Shaadi / Karyakram Ki Date</label><input type="date" required min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Jaise: 300" /></div>
            </div>
            <div className="form-row">
              <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
              <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Jaise: Shree Lawn" /></div>
            </div>
            {user ? (
              <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Bhej rahe hain…' : `📅 Book Now — ${inr(bookPrice)}`}</button>
            ) : (
              <>
                <Link className="btn btn-gold" style={{ marginTop: 14 }} to={`/login?next=${encodeURIComponent(`/product/${id}`)}`}>Pehle Login Karein</Link>
                <p className="hint" style={{ marginTop: 8 }}>Booking ke liye login zaroori hai — account bilkul free hai. Browsing, photo aur reviews bina login ke bhi dekh sakte hain.</p>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  )
}

// ── Partner storefront — har partner ki apni mini-website /p/<slug> ─────────
// NOTE: asli subdomain (<slug>.domain) *.vercel.app par sambhav nahi hai —
// isliye partner ki website main domain ke /p/<slug> path par milti hai.
// Yahan ki quotation/booking seedha usi partner ko jaati hai (source
// 'storefront' ke saath tag hoti hai); platform ko sirf apna commission
// milta hai, baaki hisaab partner apne panel mein dekhta hai.
export function PartnerStorefront() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [partner, setPartner] = useState(null)
  const [products, setProducts] = useState([])
  const reviews = useReviews()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ date: '', city: 'Varanasi', venue: '', guests: 200, notes: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const formRef = useRef(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const p = await store.getPartnerBySlug(slug).catch(() => null)
      if (!live) return
      if (!p) { setNotFound(true); setLoading(false); return }
      setPartner(p)
      const prods = await store.listProducts({ partnerId: p.id, activeOnly: true }).catch(() => [])
      if (!live) return
      setProducts(prods)
      setLoading(false)
    })()
    return () => { live = false }
  }, [slug])

  if (loading) return <div className="wrap section"><Spinner label="Partner ki website load ho rahi hai…" /></div>
  if (notFound) return (
    <div className="wrap section" style={{ textAlign: 'center' }}>
      <h1>🏪 Ye Partner Website Nahi Mili</h1>
      <p>Ho sakta hai link galat ho ya partner ne apna website naam badal liya ho.</p>
      <p><Link className="btn btn-gold" to="/services">Saari Sevayein Dekhein</Link></p>
    </div>
  )

  const business = partner.businessName || partner.name
  const firstImg = (products.find((p) => p.imageUrl || p.image) || {})
  const banner = firstImg.imageUrl || firstImg.image || '/images/hero-aarti.jpg'
  const avatar = firstImg.imageUrl || firstImg.image || ''
  const storefrontLink = `${SITE.origin}/p/${slug}`
  const shareText = encodeURIComponent(`Namaste! Meri wedding services dekhiye — ${(partner.roles || []).map((r) => categoryBySlug(r)?.name || r).join(', ') || 'Ganga Aarti, Pandit Ji, Tent, DJ'}. Meri apni website: ${storefrontLink}`)
  const refLink = partner.referralCode ? `${SITE.origin}/signup/partner?ref=${partner.referralCode}` : ''
  const partnerSummary = summarize(reviews, partner.id)
  const partnerReviews = reviews.filter((r) => r.partnerId === partner.id).slice(0, 6)
  const refShareText = encodeURIComponent(`Namaste! Aap bhi Ganga Aarti Booking par partner bankar apni wedding services bechiye — join karna free hai. Mere referral code ${partner.referralCode} ke saath sign up karein: ${refLink}`)
  const copyText = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copy ho gaya ✔`) }
    catch { toast('Copy nahi ho paya — link ko select karke khud copy kar lein.', 'err') }
  }
  // Partner ka WhatsApp (na ho to phone; dono na hon to button hi nahi)
  const partnerWa = waNumber(partner.whatsapp || partner.phone)
  const waMsg = encodeURIComponent('Namaste! Mujhe aapki wedding services book karni hai. Kripya details bhejein.')
  const waProductMsg = (p) => encodeURIComponent(`Namaste! Mujhe aapki "${p.title}" seva book karni hai. Kripya details bhejein.`)
  const presentCats = [...new Set(products.map((p) => p.category))]
  const orderedCats = [
    ...(partner.roles || []).filter((r) => presentCats.includes(r)),
    ...CATEGORIES.map((c) => c.slug).filter((s) => presentCats.includes(s) && !(partner.roles || []).includes(s)),
  ]
  const roleNames = (partner.roles || []).map((r) => categoryBySlug(r)?.name || r).join(' · ')

  const pick = (p) => {
    setSelected(p)
    setDone('')
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const needLogin = () => navigate(`/login?next=${encodeURIComponent(`/p/${slug}`)}`)
  const submitQuote = async (e) => {
    e.preventDefault()
    if (!user) return needLogin()
    if (user.role !== 'user') { toast('Quotation ke liye User (grahak) account se login karein.', 'err'); return }
    if (!form.date || isPastDate(form.date)) { toast('⚠️ Sahi date chunein — karyakram ki date aaj ya aage ki honi chahiye.', 'err'); return }
    if (!Number(form.guests) || Number(form.guests) < 1) { toast('⚠️ Mehmaanon ki sankhya sahi bharein (1 ya zyada).', 'err'); return }
    setBusy(true)
    try {
      await store.createQuotation({
        category: selected?.category || orderedCats[0] || 'ganga-aarti',
        productId: selected?.id || null,
        title: selected?.title || business,
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), notes: form.notes,
        partnerId: partner.id, source: 'storefront',
      }, user)
      setDone(`🙏 Quotation ${business} ko bhej di gayi hai! Jawab aapke My Bookings mein dikhega.`)
      toast('Quotation bhej di gayi ✔')
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi.', 'err') }
    setBusy(false)
  }
  const submitBook = async () => {
    if (!selected) { toast('Pehle koi product chunein — uske "Book Karein" button par click karein.', 'err'); return }
    if (!user) return needLogin()
    if (user.role !== 'user') { toast('Booking ke liye User (grahak) account se login karein.', 'err'); return }
    if (!form.date) { toast('Pehle shaadi / karyakram ki date chunein.', 'err'); return }
    if (isPastDate(form.date)) { toast('⚠️ Sahi date chunein — karyakram ki date aaj ya aage ki honi chahiye.', 'err'); return }
    if (!Number(form.guests) || Number(form.guests) < 1) { toast('⚠️ Mehmaanon ki sankhya sahi bharein (1 ya zyada).', 'err'); return }
    setBusy(true)
    try {
      await store.createBooking({
        partnerId: partner.id, partnerName: business, category: selected.category, title: selected.title,
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), amount: selected.price, source: 'storefront',
      }, user)
      setDone(`✔ Booking ${business} ko bhej di gayi hai! Ve Accept karenge to aapko "My Bookings" mein ✅ Final Confirm ka button milega — uske baad advance payment khulega.`)
      toast('Booking bhej di gayi ✔')
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi.', 'err') }
    setBusy(false)
  }

  return (
    <>
      <Seo title={`${business} — Wedding Services | Ganga Aarti Booking`} description={`${business} — ${partner.city || 'Varanasi'} ke verified wedding partner. ${roleNames} ki booking seedha yahin se karein.`} path={`/p/${slug}`} image={banner} />
      <section className="storefront-hero">
        <div className="hero-photo" aria-hidden="true"><img src={banner} alt="" /></div>
        <div className="hero-inner">
          <div className="storefront-id">
            {avatar
              ? <img className="storefront-avatar" src={avatar} alt={business} />
              : <span className="storefront-avatar monogram" aria-hidden="true">{business.trim().charAt(0).toUpperCase()}</span>}
            <div>
              <span className="badge">🏪 Verified Partner · Ganga Aarti Booking</span>
              <h1>{business}</h1>
              <p className="storefront-meta">{partner.city ? `📍 ${partner.city}` : ''}</p>
            </div>
          </div>
          {(partner.roles || []).length > 0 && (
            <div className="trust-chips" style={{ marginTop: 12 }}>
              {(partner.roles || []).map((r) => <span key={r}>{categoryBySlug(r)?.icon} {categoryBySlug(r)?.name || r}</span>)}
            </div>
          )}
          <p className="storefront-stars" aria-label="Partner bharosa">★★★★★ <b>Verified Partner</b> · Saaf Rate · Samay Par Seva · Ganga Aarti Booking ke saath judaa hua</p>
          <p>{business} aapki shaadi ke liye {roleNames || 'wedding services'} ki vyavastha karte hain — saaf rate, samay par seva. Neeche products dekhkar seedha quotation ya booking karein; saara hisaab inke partner panel mein rehta hai.</p>
          <div className="hero-card-actions">
            <button className="btn btn-gold" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>📋 Free Quotation</button>
            {partnerWa && <a className="btn btn-wa btn-wa-big" href={`https://wa.me/${partnerWa}?text=${waMsg}`} target="_blank" rel="noreferrer">💬 WhatsApp Par Baat Karein</a>}
            {partner.phone && <a className="btn btn-light" href={`tel:${partner.phone.replace(/\s/g, '')}`}>📞 {partner.phone}</a>}
          </div>
        </div>
      </section>

      <section className="section wrap">
        {products.length === 0 && (
          <div className="empty-state">
            <p>🪔 Is partner ne abhi products add nahi kiye hain.</p>
            <button className="btn btn-gold" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>📋 Phir Bhi Quotation Bhejein</button>
          </div>
        )}
        {orderedCats.map((slugCat) => (
          <div key={slugCat} style={{ marginBottom: 34 }}>
            <h2>{roleMeta(slugCat).heading}</h2>
            <div className="shop-grid">
              {products.filter((p) => p.category === slugCat).map((p) => <ProductCard key={p.id} p={p} reviews={reviews} onSelect={pick} />)}
            </div>
          </div>
        ))}

        {partnerSummary.count > 0 && (
          <div style={{ marginBottom: 34 }}>
            <h2>⭐ Grahakon Ke Reviews</h2>
            <div className="review-summary">
              <span className="review-avg">{partnerSummary.avg.toFixed(1)}</span>
              <span><Stars value={partnerSummary.avg} /><br /><span className="hint">{partnerSummary.count} reviews — {business} ki sevaon par</span></span>
            </div>
            <div>
              {partnerReviews.map((r) => (
                <div className="review-item" key={r.id}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Stars value={r.rating} />
                    <b>{r.userName || 'Grahak'}</b>
                    <span className="hint">{fmtDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p style={{ margin: '4px 0 0' }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={formRef} style={{ scrollMarginTop: 90 }}>
          <form className="form-card wide" style={{ margin: '10px auto 0' }} onSubmit={submitQuote}>
            <h3>📋 {business} Ko Quotation / Booking Bhejein</h3>
            {selected ? (
              <p className="reply-box" style={{ margin: '0 0 12px' }}>Chuna gaya product: <b>{selected.title}</b> — {inr(selected.price)} {selected.unit} <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setSelected(null)}>Hatayein</button></p>
            ) : <p className="hint">Seedhi booking ke liye kisi product ka "Book Karein" button dabayein — product yahan chun jayega. Bina product chune yahan se {business} ko aam quotation bhej sakte hain.</p>}
            {done && <div className="ok">{done}</div>}
            <div className="form-row">
              <div><label>Shaadi / Karyakram Ki Date</label><input type="date" required min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Jaise: 300" /></div>
            </div>
            <div className="form-row">
              <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
              <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Jaise: Shree Lawn" /></div>
            </div>
            <label>Notes (vaikalpik)</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Koi khaas baat — samay, vishesh mang, budget…" />
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-gold" disabled={busy}>{busy ? 'Bhej rahe hain…' : '📋 Quotation Bhejein'}</button>
              {selected && <button type="button" className="btn btn-green" disabled={busy} onClick={submitBook}>✔ Seedha Book Karein — {inr(selected.price)}</button>}
            </div>
            {!user && <p className="hint" style={{ marginTop: 10 }}>Bhejne ke liye pehle <Link to={`/login?next=${encodeURIComponent(`/p/${slug}`)}`}>login</Link> karein — account bilkul free hai.</p>}
          </form>
        </div>

        <div className="share-box">
          <h3>📣 Ye Website Apno Ke Saath Share Karein</h3>
          <p className="hint">Kisi ke ghar shaadi hai? {business} ki ye website unhe bhej dein — wahi se seedha booking ho jayegi.</p>
          <label>Meri Website Ka Link</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input readOnly value={storefrontLink} onFocus={(e) => e.target.select()} style={{ flex: '1 1 260px' }} />
            <button type="button" className="btn btn-gold" onClick={() => copyText(storefrontLink, 'Website link')}>📋 Copy Link</button>
            <a className="btn btn-wa" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">💬 WhatsApp Share</a>
          </div>
          {refLink && (
            <>
              <label style={{ marginTop: 16 }}>Partner Referral Link — Doosre Vendors Ko Bulayein</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input readOnly value={refLink} onFocus={(e) => e.target.select()} style={{ flex: '1 1 260px' }} />
                <button type="button" className="btn btn-maroon" onClick={() => copyText(refLink, 'Referral link')}>📋 Copy</button>
                <a className="btn btn-wa" href={`https://wa.me/?text=${refShareText}`} target="_blank" rel="noreferrer">💬 WhatsApp Share</a>
              </div>
              <p className="hint" style={{ margin: '6px 0 0' }}>Is link se judne wale partner ki har booking par {business} ko 5% referral kamai milti hai — pure 1 saal tak.</p>
            </>
          )}
        </div>
      </section>
      <a className="share-float" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" aria-label="WhatsApp par ye website share karein">🔗<span>Share</span></a>
      {partnerWa && <a className="wa-float" href={`https://wa.me/${partnerWa}?text=${waMsg}`} target="_blank" rel="noreferrer" aria-label={`${business} ko WhatsApp karein`}>💬</a>}
    </>
  )
}
