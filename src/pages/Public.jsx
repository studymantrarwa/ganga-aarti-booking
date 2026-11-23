import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Reveal from '../components/Reveal'
import Seo, { breadcrumbLd, faqLd, serviceLd } from '../components/Seo'
import { useAuth } from '../context/AuthContext'
import { AARTI_PACKAGES, CATEGORIES, GALLERY, GENERAL_FAQS, PANDIT_PACKAGES, SITE, TESTIMONIALS, categoryBySlug, inr } from '../data/catalog'
import { roleMeta, store, waNumber } from '../lib/store'
import { summarize } from '../lib/ratings'
import { InstallAppButton, NotificationToggle, Spinner, useSettings, useToast } from '../lib/ui'

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
    <article className="card">
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
    <article className={`card pkg-card${pkg.popular ? ' pkg-popular popular' : ''}`}>
      {pkg.image ? <div className="ph"><img src={pkg.image} alt={pkg.name} loading="lazy" /></div> : null}
      <div className="body">
        {pkg.popular && <span className="badge popular">⭐ Sabse Lokpriya</span>}
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

// ── Marketplace (Flipkart-style shop) ────────────────────────────────────────
// Reviews ek hi store call se aate hain aur ratings PARTNER-level par judte
// hain (lib/ratings.js) — marketplace, service page, storefront aur product
// page, har jagah ek hi hisaab. Ye saari browsing BINA LOGIN ke khuli hai;
// login sirf booking submit karte samay manga jata hai.
export function useReviews() {
  const [reviews, setReviews] = useState([])
  useEffect(() => { store.listReviews().then((rows) => setReviews(rows || [])).catch(() => {}) }, [])
  return reviews
}

export function Stars({ value }) {
  const full = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return <span className="stars" aria-label={`${value} star rating`}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
}

export function RatingPill({ rating }) {
  if (!rating || !rating.count) return <span className="rating-pill new">⭐ Naya</span>
  return <span className="rating-pill">★ {rating.avg.toFixed(1)} <small>({rating.count})</small></span>
}

// Ek hi product card — marketplace, service page aur storefront teeno par.
// Photo ka fallback chain: product ki apni photo → category ki photo → icon.
export function ProductCard({ p, reviews }) {
  const cat = categoryBySlug(p.category)
  const rating = summarize(reviews, p.partnerId)
  const img = p.imageUrl || p.image || cat?.image
  return (
    <article className="p-card">
      <Link to={`/product/${p.id}`} className="p-card-media" aria-label={p.title}>
        {img ? <div className="ph"><img src={img} alt={p.title} loading="lazy" /></div> : <div className="ph">{cat?.icon || '🪔'}</div>}
      </Link>
      <div className="body">
        <h3><Link to={`/product/${p.id}`}>{p.title}</Link></h3>
        <p className="hint">🏪 {p.partnerName}{p.city ? ` · 📍 ${p.city}` : ''}</p>
        <div><RatingPill rating={rating} /></div>
        {p.description ? <p className="p-desc">{p.description}</p> : null}
        <p className="p-price">{inr(p.price)} <small>{p.unit}</small></p>
        <div className="p-actions">
          <Link className="btn btn-gold btn-sm" to={`/product/${p.id}`}>⚡ Book Now</Link>
          <Link className="btn btn-ghost btn-sm" to={`/product/${p.id}`}>Details</Link>
        </div>
      </div>
    </article>
  )
}

const MARKET_SORTS = [
  ['rating', 'Rating (zyada pehle)'],
  ['price-asc', 'Price: Kam → Zyada'],
  ['price-desc', 'Price: Zyada → Kam'],
  ['new', 'Naye pehle'],
]

// Marketplace — saare partners ke saare active products, search / category
// filter / sort ke saath. Poori tarah public (bina login ke) browsing.
export function Marketplace({ cats }) {
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('rating')
  useEffect(() => {
    let live = true
    ;(async () => {
      const [prods, revs] = await Promise.all([
        store.listProducts({ activeOnly: true }).catch(() => []),
        store.listReviews().catch(() => []),
      ])
      if (!live) return
      setProducts(prods || [])
      setReviews(revs || [])
      setLoading(false)
    })()
    return () => { live = false }
  }, [])
  const needle = q.trim().toLowerCase()
  const sorted = (products || [])
    .filter((p) => cat === 'all' || p.category === cat)
    .filter((p) => !needle || [p.title, p.partnerName, p.city, p.description, categoryBySlug(p.category)?.name].some((s) => String(s || '').toLowerCase().includes(needle)))
    .sort((a, b) => {
      if (sort === 'price-asc') return Number(a.price) - Number(b.price)
      if (sort === 'price-desc') return Number(b.price) - Number(a.price)
      if (sort === 'new') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      const ra = summarize(reviews, a.partnerId)
      const rb = summarize(reviews, b.partnerId)
      return (rb.avg - ra.avg) || (rb.count - ra.count) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    })
  return (
    <>
      <div className="filter-bar">
        <input type="search" className="filter-search" placeholder="🔍 Product, partner ya shahar khojein…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Products khojein" />
        <select className="filter-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort karein">
          {MARKET_SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <div className="chip-row">
          <button type="button" className={`chip${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>Sabhi</button>
          {cats.map((c) => <button type="button" key={c.slug} className={`chip${cat === c.slug ? ' on' : ''}`} onClick={() => setCat(c.slug)}>{c.icon} {c.name}</button>)}
        </div>
      </div>
      {loading ? <Spinner label="Products load ho rahe hain…" /> : sorted.length === 0 ? (
        <div className="empty-state"><p>🔍 Koi product nahi mila — search ya category badal kar dekhein.</p></div>
      ) : (
        <div className="shop-grid">{sorted.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}</div>
      )}
    </>
  )
}

// ── Home page ke section headers — ek hi professional treatment:
// chhota gold eyebrow, badi heading aur gold divider ornament.
export function SecHead({ eyebrow, title, lead }) {
  return (
    <div className="sec-head">
      {eyebrow && <span className="sec-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      <span className="sec-ornament" aria-hidden="true">✦</span>
      {lead && <p className="lead">{lead}</p>}
    </div>
  )
}

// ── Home page ki "Popular Products" shelf — marketplace wala hi data flow
// (store.listProducts + partner-level ratings), sirf top 8 products.
export function FeaturedShelf() {
  const [products, setProducts] = useState([])
  const reviews = useReviews()
  useEffect(() => { store.listProducts({ activeOnly: true }).then((rows) => setProducts(rows || [])).catch(() => {}) }, [])
  const top = [...(products || [])].sort((a, b) => {
    const ra = summarize(reviews, a.partnerId)
    const rb = summarize(reviews, b.partnerId)
    return (rb.avg - ra.avg) || (rb.count - ra.count) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  }).slice(0, 8)
  if (!top.length) return null
  return (
    <section className="section" style={{ background: '#fff' }}>
      <div className="wrap">
        <SecHead eyebrow="🛍️ Marketplace" title="Popular Products" lead="Partners ke sabse pasandeeda products — photo, rating aur saaf rate ke saath. Bina login ke dekhiye, pasand aaye to seedha book karein." />
        <div className="shelf-grid">
          {top.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24 }}><Link className="btn btn-maroon" to="/services#marketplace">Sabhi Products Dekhein →</Link></p>
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
          <span className="home-badge">🪔 Varanasi Ki Vishwasniya Wedding Seva</span>
          <h1>Shaadi Mein <span className="hl">Ganga Aarti</span> —<br />Aur Poori Wedding Vyavastha, Ek Hi Jagah</h1>
          <p>Dulha-dulhan ke liye Maa Ganga ka aashirwad, venue par bhavya aarti, saath mein Pandit Ji, gaadi, tent, DJ, catering, photography aur band baja — free quotation ke saath pakki booking.</p>
          <div className="hero-ctas">
            <Link className="btn btn-gold" to="/dashboard/quote">📋 Free Quotation</Link>
            <Link className="btn btn-hero-ghost" to="/packages">🎁 Packages Dekhein</Link>
          </div>
          <div className="hero-card">
            <div className="hero-card-text">
              <b>Apni shaadi ka rate jaanna hai?</b>
              <span>Free quotation maangein — koi charge nahi, koi zabardasti nahi. Partners apne best rate yahin bhejenge.</span>
            </div>
            <div className="hero-card-actions">
              <Link className="btn btn-gold" to="/dashboard/quote">📋 Free Quotation</Link>
              {!user && <Link className="btn btn-maroon" to="/signup">🙏 Free Sign Up Karein</Link>}
              <a className="btn btn-light" href={`tel:${phone.replace(/\s/g, '')}`}>📞 Call Karein</a>
              <a className="btn btn-wa" href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
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
        <SecHead eyebrow="🎉 Saari Sevayein" title="Har Seva, Ek Hi Jagah" lead="Kisi bhi photo par tap karein — us seva ke rate, details aur verified partners turant milenge." />
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

      <section className="section wrap" id="home-services">
        <SecHead eyebrow="🪔 Hamari Sevayein" title="Shaadi Ka Har Kaam, Ek Hi Jagah" lead="Ganga Aarti hamari pehchan hai, lekin shaadi ka har intezam hum karte hain. Har seva ke liye verified local partners, saaf rate aur quotation pehle — booking baad mein." />
        {cats.length === 0 ? <p className="lead">Sevayein jald hi uplabdh hongi — tab tak <Link to="/contact">sampark karein</Link>.</p> : (
          <div className="grid grid-4">
            {cats.map((c, i) => <Reveal key={c.slug} className="reveal-cell" delay={(i % 4) * 70}><CategoryCard cat={c} /></Reveal>)}
          </div>
        )}
      </section>

      <FeaturedShelf />

      {pkgs.length > 0 && (
        <section className="section" style={{ background: '#fdf8ec' }}>
          <div className="wrap">
            <SecHead eyebrow="🎁 Aarti Packages" title="Ganga Aarti Wedding Packages" lead="Venue par ya Varanasi ke ghat par — purohiton ki team ke saath Maa Ganga ki bhavya aarti. Saaf rate, koi chhupa charge nahi." />
            <div className="grid grid-3">
              {pkgs.map((p, i) => <Reveal key={p.id} className="reveal-cell" delay={i * 90}><PackageCard pkg={p} /></Reveal>)}
            </div>
            <p style={{ textAlign: 'center', marginTop: 22 }}><Link className="btn btn-maroon" to="/packages">Saare Packages Dekhein</Link></p>
          </div>
        </section>
      )}

      <section className="section wrap">
        <SecHead eyebrow="📋 Aasan Process" title="Booking Kaise Hoti Hai?" lead="Shaadi ki taiyaari aasan — sirf 4 step mein." />
        <Reveal><div className="steps">
          <div className="step"><div className="num">1</div><h3>Free Quotation Bhejein</h3><p>Service chunein, shaadi ki date, shahar aur mehmaanon ki sankhya batayein — bilkul free, koi charge nahi.</p></div>
          <div className="step"><div className="num">2</div><h3>Rate Compare Karein</h3><p>Partners aapko apne rate aur details bhejenge. Pasand wala chunein, koi zabardasti nahi.</p></div>
          <div className="step"><div className="num">3</div><h3>Booking Pakki Karein</h3><p>Quotation accept karte hi booking ban jayegi. Status apne panel mein live dikhega.</p></div>
          <div className="step"><div className="num">4</div><h3>Nishchint Shaadi 🎉</h3><p>Team samay par pahunchti hai aur saara intezam sambhalti hai — aap bas aashirwad aur khushiyon mein shaamil hon.</p></div>
        </div></Reveal>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <SecHead eyebrow="🛡️ Bharosa Aur Parampara" title="Kyoon Chunein Ganga Aarti Booking?" lead="Shaadi zindagi ka sabse khaas din hota hai — isliye har intezam mein bharosa, parampara aur saaf-suthra kaam hi hamari pehchan hai." />
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
          <SecHead eyebrow="⭐ Parivaaron Ki Zubaani" title="Parivaaron Ke Anubhav" lead="500+ parivaaron ne apni shaadi ka sabse khaas din humare saath manaaya." />
          <Reveal><TestimonialsSlider /></Reveal>
        </div>
      </section>

      <section className="section wrap">
        <SecHead eyebrow="📸 Gallery" title="Hamare Karyakramon Ki Jhalak" lead="Asli shaadiyon, asli intezamon ki tasveerein — aarti se lekar vidaai tak." />
        <Reveal><div className="gallery-grid">
          {GALLERY.map((g) => <figure key={g.src}><img src={g.src} alt={g.caption} loading="lazy" /><figcaption>{g.caption}</figcaption></figure>)}
        </div></Reveal>
        <p style={{ textAlign: 'center', marginTop: 22 }}><Link className="btn btn-maroon" to="/gallery">Poori Gallery Dekhein</Link></p>
      </section>

      <section className="partner-band">
        <div className="wrap partner-inner">
          <div>
            <span className="badge" style={{ background: 'rgba(255,255,255,.14)', color: '#ffe9b0', borderColor: 'rgba(255,255,255,.35)' }}>🤝 Vendors Ke Liye</span>
            <h2>Apna Business Jodein — Partner Banein</h2>
            <p>Kya aap Pandit Ji, decorator, car owner, DJ, caterer, photographer ya band wale hain? Platform par apni seva jodein, seedha quotation paayein aur pakki booking lein. Commission sirf pakki booking par — sign up bilkul free hai.</p>
          </div>
          <div className="partner-cta">
            <Link className="btn btn-gold" to="/signup">Partner Sign Up — Free</Link>
            <Link className="btn btn-ghost" style={{ background: '#fff', color: '#5d1414', borderColor: '#fff' }} to="/faq">Partner Kaise Kaam Karta Hai?</Link>
          </div>
        </div>
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
        <SecHead eyebrow="❓ Sawal-Jawab" title="Aksar Puche Jaane Wale Sawal" />
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {GENERAL_FAQS.slice(0, 4).map(([q, a]) => <div className="faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
          <p style={{ textAlign: 'center' }}><Link className="btn btn-maroon" to="/faq">Saare Sawal Dekhein</Link></p>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <span className="home-badge">🪔 Free Quotation — Koi Charge Nahi, Koi Zabardasti Nahi</span>
          <h2>Aapki Shaadi, Hamari Zimmewari 🙏</h2>
          <p>Ganga Aarti se lekar vidaai tak — Pandit Ji, gaadi, tent, DJ, catering, photography aur band baja. Aaj hi free quotation maangein, rates compare karein aur nishchint hokar shaadi ki taiyaari karein.</p>
          <div className="hero-cta">
            <Link className="btn btn-gold" to="/dashboard/quote">📋 Free Quotation Maangein</Link>
            <a className="btn btn-light" href={`tel:${phone.replace(/\s/g, '')}`}>📞 Call Karein — {phone}</a>
          </div>
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
      <div className="page-head"><h1>Shaadi Ki Saari Sevayein</h1><p>Har seva ke liye verified partners, saaf rate aur pehle quotation — phir booking.</p></div>
      <section className="section wrap">
        {cats.length === 0 ? <p className="lead">Sevayein jald hi uplabdh hongi — tab tak <Link to="/contact">sampark karein</Link>.</p> : (
          <div className="grid grid-4">{cats.map((c, i) => <Reveal key={c.slug} className="reveal-cell" delay={(i % 4) * 70}><CategoryCard cat={c} /></Reveal>)}</div>
        )}
      </section>
      <section className="section" id="marketplace" style={{ background: '#fdf3da', paddingTop: 40 }}>
        <div className="wrap">
          <h2>🛍️ Marketplace — Sabhi Partner Products</h2>
          <p className="lead">Saare partners ke products ek hi jagah — photo, rating aur saaf rate ke saath. Bina login ke sab dekhiye; pasand aaye to seedha ⚡ Book Now karein.</p>
          <Marketplace cats={cats} />
        </div>
      </section>
    </>
  )
}

export function ServicePage() {
  const { slug } = useParams()
  const cats = useCategories()
  const cat = cats.find((c) => c.slug === slug) || categoryBySlug(slug)
  const [products, setProducts] = useState([])
  const reviews = useReviews()
  useEffect(() => { if (cat) store.listProducts({ category: cat.slug, activeOnly: true }).then(setProducts).catch(() => {}) }, [slug])
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
            <p>{cat.description}</p>
            <h3>Kya-kya shamil hai</h3>
            <ul className="ticks">{cat.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <Link className="btn btn-gold" to={`/dashboard/quote?category=${cat.slug}`}>Free Quotation Maangein</Link>
              <Link className="btn btn-ghost" to="/packages">Packages Dekhein</Link>
            </div>
          </div>
        </div>
      </section>
      {products.length > 0 && (
        <section className="section" style={{ background: '#fdf3da', paddingTop: 36 }}>
          <div className="wrap">
            <h2>Partners Ke {cat.name} Offers</h2>
            <div className="shop-grid">
              {products.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
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
      <p>Aap apni profile jaankari apne panel se kabhi bhi badal sakte hain. Apna account ya jaankari hatani ho to <Link to="/contact">Contact page</Link> se likhein — hum uchit samay mein kaarravaai karenge.</p>
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

export function PartnerJoin() {
  const settings = useSettings()
  const flat = Number(settings.manual_booking_commission) || 50
  return (
    <>
      <Seo title="Partner Banein | Apni Wedding Services Bechiye — Ganga Aarti Booking" description="Pandit Ji, decorator, gaadi, DJ, caterer, photographer, band wale — free partner banein, apni storefront website paayein, manual booking par sirf ₹50 commission, referral se 5% kamai 1 saal tak." path="/partner-join" image="/images/partner-join.jpg" jsonLd={breadcrumbLd([['Home', '/'], ['Partner Banein', '/partner-join']])} />
      <div className="page-head"><h1>🤝 Partner Banein — Apna Business Badhayein</h1><p>Pandit Ji, decorator, gaadi wale, DJ, caterer, photographer, band wale — sabka swagat hai</p></div>
      <section className="wrap" style={{ paddingTop: 26 }}>
        <img src="/images/partner-join.jpg" alt="Ganga Aarti Booking ke partners — wedding services" style={{ width: '100%', borderRadius: 16, boxShadow: 'var(--shadow)', maxHeight: 380, objectFit: 'cover' }} />
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
          <p className="lead" style={{ margin: '6px auto 14px' }}>Sign up mein "Partner" chunein, apni sevayein tick karein, pehla product add karein — bas, aapki dukaan online!</p>
          <Link className="btn btn-gold" to="/signup">Partner Sign Up — Bilkul Free</Link>
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
          <h3>📲 Android App Download Karein (Asli App)</h3>
          <p className="lead" style={{ margin: '6px auto 14px' }}>Ye <b>asli Android app</b> hai — browser ya Chrome ki zaroorat nahi. Ek baar install kar lein, phir notifications bhi app ke <b>apne system</b> se aayengi — offers, quotation ke jawab aur booking updates seedha ghanti bankar, bilkul doosre apps ki tarah.</p>
          <a className="btn btn-gold" href="/app/ganga-aarti-booking.apk" download>⬇️ App Download Karein (APK)</a>
          <p className="hint" style={{ marginTop: 14, textAlign: 'left' }}><b>Install ke aasan steps:</b><br />1. Upar wala button dabakar app ki file (APK) download karein.<br />2. Download hui file ko kholein aur <b>Install</b> dabayein.<br />3. Pehli baar phone <b>"unknown sources" (anjaan srot)</b> ki anumati maang sakta hai — Allow karke wapas aayein aur phir Install dabayein.<br />4. Bas! Home screen par 🪔 <b>Ganga Aarti Booking</b> ka icon aa jayega — wahi se app khulega.</p>
        </div>

        <div className="grid grid-3">
          <div className="why-item"><span className="why-icon">⚡</span><h3>Tez Khulta Hai</h3><p>Ek baar install ho jaye to app pehle se kahin tez khulta hai — shaadi ki taiyaari ke beech baar-baar browser kholne ki jhanjhat nahi.</p></div>
          <div className="why-item"><span className="why-icon">🪔</span><h3>Home Screen Par Icon</h3><p>Aapke phone ki home screen par 🪔 wala apna icon rahega — ek tap mein seedha quotation, booking aur panel.</p></div>
          <div className="why-item"><span className="why-icon">📱</span><h3>App Jaisa Anubhav</h3><p>Poori screen par, bina browser ki patti ke — bilkul kisi app ki tarah saaf aur aasan. Wahi account, wahi bookings, wahi panel.</p></div>
        </div>

        <div className="form-card wide" style={{ marginTop: 34, textAlign: 'center' }}>
          <h3>👇 Doosra Tareeka — Bina Download Kiye Home Screen Par Lagayein</h3>
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
          <p>1. Ye page Chrome browser mein kholein (aap shayad pehle se yahin hain).<br />2. Upar diye gaye <b>📲 App Download Karein</b> button ko dabayein — install ka sawal aate hi <b>Install</b> chunein.<br />3. Agar button se sawal na aaye to Chrome ke upar-dahine kone ke <b>⋮ (teen bindu) menu</b> ko kholein aur <b>"App install karein"</b> ya <b>"Home screen par jodein"</b> chunein.<br />4. Bas! Home screen par 🪔 Ganga Aarti ka icon aa jayega.</p>
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

  useEffect(() => {
    let live = true
    ;(async () => {
      const rows = await store.listProducts({ activeOnly: true }).catch(() => [])
      const p = (rows || []).find((x) => x.id === id)
      if (!live) return
      if (!p) { setNotFound(true); setLoading(false); return }
      setProduct(p)
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
  const img = product.imageUrl || product.image || cat?.image
  const summary = summarize(reviews, product.partnerId)
  const partnerReviews = reviews.filter((r) => r.partnerId === product.partnerId)
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

  const submitBook = async (e) => {
    e.preventDefault()
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/product/${id}`)}`)
    if (user.role !== 'user') { toast('Booking ke liye User (grahak) account se login karein.', 'err'); return }
    setBusy(true)
    try {
      await store.createBooking({
        partnerId: product.partnerId, partnerName: business, category: product.category, title: product.title,
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), amount: product.price, source: 'website',
      }, user)
      setDone(`✔ Booking ${business} ko bhej di gayi hai! Partner Accept karenge to apne panel ki "Meri Bookings" mein ✅ Final Confirm ka button milega — uske baad advance payment khulega.`)
      toast('Booking bhej di gayi ✔')
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi.', 'err') }
    setBusy(false)
  }

  return (
    <>
      <Seo title={`${product.title} — ${inr(product.price)} | Ganga Aarti Booking`} description={`${product.title} — ${business} ki seva, ${product.city || 'Varanasi'}. Rate ${inr(product.price)} ${product.unit}. Photo, rating aur reviews ke saath seedhi online booking.`} path={`/product/${id}`} image={img || '/images/hero-aarti.jpg'} />
      <section className="section wrap">
        <p className="hint" style={{ marginBottom: 14 }}><Link to="/services#marketplace">🛍️ Marketplace</Link>{cat ? <> · <Link to={`/services/${cat.slug}`}>{cat.icon} {cat.name}</Link></> : null}</p>
        <div className="product-hero">
          <div>
            {img ? <div className="ph product-photo"><img src={img} alt={product.title} /></div> : <div className="ph product-photo">{cat?.icon || '🪔'}</div>}
          </div>
          <div>
            <h1 style={{ marginTop: 0 }}>{product.title}</h1>
            <p className="hint">🏪 {business}{product.city ? ` · 📍 ${product.city}` : ''}</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <RatingPill rating={summary} />
              {summary.count > 0 && <span className="hint">{summary.count} grahakon ke reviews</span>}
            </div>
            <p className="p-price" style={{ fontSize: '1.9rem', margin: '10px 0 2px' }}>{inr(product.price)} <small>{product.unit}</small></p>
            <p className="hint" style={{ margin: 0 }}>Saaf rate — koi chhupa charge nahi. Advance sirf 20%, baaki rakam karyakram ke din.</p>
            {product.description && <p style={{ marginTop: 12 }}>{product.description}</p>}
            {partner?.slug && <p style={{ marginTop: 8 }}><Link to={`/p/${partner.slug}`}>🏪 Partner ki Page →</Link></p>}

            <form className="book-form" onSubmit={submitBook}>
              <h3>📅 Book Now — Details Bharein</h3>
              {done && <div className="ok">{done}<br /><Link to="/dashboard">Meri Bookings Dekhein →</Link></div>}
              <div className="form-row">
                <div><label>Shaadi / Karyakram Ki Date</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Jaise: 300" /></div>
              </div>
              <div className="form-row">
                <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
                <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Jaise: Shree Lawn, Lanka" /></div>
              </div>
              {user ? (
                <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Bhej rahe hain…' : `📅 Book Now — ${inr(product.price)}`}</button>
              ) : (
                <>
                  <Link className="btn btn-gold" style={{ marginTop: 14 }} to={`/login?next=${encodeURIComponent(`/product/${id}`)}`}>Pehle Login Karein</Link>
                  <p className="hint" style={{ marginTop: 8 }}>Booking ke liye login zaroori hai — account bilkul free hai. Browsing, photo aur reviews bina login ke bhi dekh sakte hain.</p>
                </>
              )}
            </form>
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <h2>⭐ Reviews</h2>
          {summary.count > 0 ? (
            <>
              <div className="review-summary">
                <span className="review-avg">{summary.avg.toFixed(1)}</span>
                <span><Stars value={summary.avg} /><br /><span className="hint">{summary.count} reviews — {business} ke saare products par mile-jule</span></span>
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
            </>
          ) : (
            <div className="empty-state"><p>⭐ Abhi koi review nahi — pehle customer banein!</p></div>
          )}
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
  const refLink = partner.referralCode ? `${SITE.origin}/signup?ref=${partner.referralCode}` : ''
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
    setBusy(true)
    try {
      await store.createQuotation({
        category: selected?.category || orderedCats[0] || 'ganga-aarti',
        productId: selected?.id || null,
        title: selected?.title || business,
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), notes: form.notes,
        partnerId: partner.id, source: 'storefront',
      }, user)
      setDone(`🙏 Quotation ${business} ko bhej di gayi hai! Jawab aapke panel mein dikhega.`)
      toast('Quotation bhej di gayi ✔')
    } catch (ex) { toast(ex.message || 'Kuchh gadbad ho gayi.', 'err') }
    setBusy(false)
  }
  const submitBook = async () => {
    if (!selected) { toast('Pehle koi product chunein — uske "Book Karein" button par click karein.', 'err'); return }
    if (!user) return needLogin()
    if (user.role !== 'user') { toast('Booking ke liye User (grahak) account se login karein.', 'err'); return }
    if (!form.date) { toast('Pehle shaadi / karyakram ki date chunein.', 'err'); return }
    setBusy(true)
    try {
      await store.createBooking({
        partnerId: partner.id, partnerName: business, category: selected.category, title: selected.title,
        date: form.date, city: form.city, venue: form.venue, guests: Number(form.guests), amount: selected.price, source: 'storefront',
      }, user)
      setDone(`✔ Booking ${business} ko bhej di gayi hai! Ve Accept karenge to aapko apne panel ki "Meri Bookings" mein ✅ Final Confirm ka button milega — uske baad advance payment khulega.`)
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
              {products.filter((p) => p.category === slugCat).map((p) => <ProductCard key={p.id} p={p} reviews={reviews} />)}
            </div>
          </div>
        ))}

        <div ref={formRef} style={{ scrollMarginTop: 90 }}>
          <form className="form-card wide" style={{ margin: '10px auto 0' }} onSubmit={submitQuote}>
            <h3>📋 {business} Ko Quotation / Booking Bhejein</h3>
            {selected ? (
              <p className="reply-box" style={{ margin: '0 0 12px' }}>Chuna gaya product: <b>{selected.title}</b> — {inr(selected.price)} {selected.unit} <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setSelected(null)}>Hatayein</button></p>
            ) : <p className="hint">Seedhi booking ke liye kisi product ke "⚡ Book Now" par jayein — yahan se {business} ko aam quotation bhej sakte hain.</p>}
            {done && <div className="ok">{done}</div>}
            <div className="form-row">
              <div><label>Shaadi / Karyakram Ki Date</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label>Mehmaan (lagbhag)</label><input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Jaise: 300" /></div>
            </div>
            <div className="form-row">
              <div><label>Shahar</label><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jaise: Varanasi" /></div>
              <div><label>Venue / Jagah</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Jaise: Shree Lawn, Lanka" /></div>
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
