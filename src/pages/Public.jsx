import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo, { breadcrumbLd, faqLd, serviceLd } from '../components/Seo'
import { AARTI_PACKAGES, CATEGORIES, GALLERY, GENERAL_FAQS, PANDIT_PACKAGES, SITE, TESTIMONIALS, categoryBySlug, inr } from '../data/catalog'
import { store } from '../lib/store'

export function CategoryVisual({ cat, h }) {
  if (cat.image) return <div className="ph" style={h ? { height: h } : undefined}><img src={cat.image} alt={cat.name} loading="lazy" /></div>
  return <div className="ph" style={h ? { height: h } : undefined} aria-hidden="true">{cat.icon}</div>
}

export function CategoryCard({ cat }) {
  return (
    <article className="card">
      <CategoryVisual cat={cat} />
      <div className="body">
        <h3>{cat.icon} {cat.name} <span className="hint">({cat.hindi})</span></h3>
        <p>{cat.tagline}</p>
        <p className="price">{inr(cat.startingPrice)} <small>se shuru · {cat.unit}</small></p>
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
    <article className="card">
      {pkg.image ? <div className="ph"><img src={pkg.image} alt={pkg.name} loading="lazy" /></div> : null}
      <div className="body">
        {pkg.popular && <span className="badge popular">⭐ Sabse Lokpriya</span>}
        <h3>{pkg.name}{pkg.hindi ? <span className="hint"> · {pkg.hindi}</span> : ''}</h3>
        <p className="price">{inr(pkg.price)} <small>{pkg.unit}</small></p>
        <ul className="ticks">{pkg.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <div style={{ marginTop: 'auto' }}>
          <Link className="btn btn-gold" to={`/dashboard/quote?category=${pkg.category}&title=${encodeURIComponent(pkg.name)}`}>Abhi Book Karein</Link>
        </div>
      </div>
    </article>
  )
}

export function Home() {
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: SITE.name, url: SITE.origin,
    telephone: SITE.phone, email: SITE.email, priceRange: '₹₹',
    address: { '@type': 'PostalAddress', addressLocality: 'Varanasi', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' },
    areaServed: ['Varanasi', 'Lucknow', 'Prayagraj', 'Jaunpur', 'Ayodhya', 'Gorakhpur'],
    description: 'Wedding mein Ganga Aarti booking aur poori shaadi vyavastha — Pandit Ji, gaadi, tent decoration, DJ, catering, photography, band baja.',
  }
  return (
    <>
      <Seo title="Ganga Aarti Wedding Booking | Shaadi Mein Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ — Varanasi"
        description="Ganga aarti wedding booking Varanasi mein — shaadi mein Maa Ganga ki divya aarti, shaadi ke liye Pandit Ji, wedding car, tent decoration, DJ, catering, photography aur band baja. Free quotation paayein, pakki booking karein."
        path="/" image="/images/hero-aarti.jpg" jsonLd={ld} />
      <section className="hero">
        <span className="badge">🪔 Banaras ki divya parampara, aapki shaadi mein</span>
        <h1>Shaadi Mein <span className="hl">Ganga Aarti</span> —<br />Aur Poori Wedding Vyavastha, Ek Hi Jagah</h1>
        <p>Dulha-dulhan ke liye Maa Ganga ka aashirwad, venue par bhavya aarti, saath mein Pandit Ji, gaadi, tent, DJ, catering, photography aur band baja — free quotation ke saath pakki booking.</p>
        <div className="hero-cta">
          <Link className="btn btn-gold" to="/dashboard/quote">📋 Free Quotation Maangein</Link>
          <Link className="btn btn-ghost" style={{ background: '#fff', color: '#5d1414' }} to="/packages">Packages Dekhein</Link>
        </div>
        <div className="hero-stats">
          <div><b>500+</b><span>Shaadiyan sampann</span></div>
          <div><b>8</b><span>Sevayein ek platform par</span></div>
          <div><b>50+</b><span>Verified partners</span></div>
          <div><b>4.9★</b><span>Parivaaron ki rating</span></div>
        </div>
      </section>

      <section className="section wrap">
        <h2>Hamari Sevayein — Shaadi Ka Har Kaam</h2>
        <p className="lead">Ganga Aarti hamari pehchan hai, lekin shaadi ka har intezam hum karte hain. Har seva ke liye verified local partners, saaf rate aur quotation pehle — booking baad mein.</p>
        <div className="grid grid-4">
          {CATEGORIES.map((c) => <CategoryCard key={c.slug} cat={c} />)}
        </div>
      </section>

      <section className="section" style={{ background: '#fdf3da' }}>
        <div className="wrap">
          <h2>Ganga Aarti Wedding Packages</h2>
          <p className="lead">Venue par ya Varanasi ke ghat par — purohiton ki team ke saath Maa Ganga ki bhavya aarti.</p>
          <div className="grid grid-3">
            {AARTI_PACKAGES.map((p) => <PackageCard key={p.id} pkg={p} />)}
          </div>
        </div>
      </section>

      <section className="section wrap">
        <h2>Booking Kaise Hoti Hai?</h2>
        <p className="lead">Shaadi ki taiyaari aasan — sirf 4 step mein.</p>
        <div className="steps">
          <div className="step"><div className="num">1</div><h3>Quotation Maangein</h3><p>Service chunein, shaadi ki date, shahar aur mehmaanon ki sankhya batayein — bilkul free.</p></div>
          <div className="step"><div className="num">2</div><h3>Rates Compare Karein</h3><p>Partners aapko apne rate aur details bhejenge. Pasand wala chunein, koi zabardasti nahi.</p></div>
          <div className="step"><div className="num">3</div><h3>Booking Pakki Karein</h3><p>Quotation accept karte hi booking ban jayegi. Status apne panel mein live dikhega.</p></div>
          <div className="step"><div className="num">4</div><h3>Shaadi Ka Anand Lein</h3><p>Team samay par pahunchti hai, saara intezam sambhalti hai — aap sirf aashirwad aur khushiyon mein shaamil hon.</p></div>
        </div>
      </section>

      <section className="section" style={{ background: '#fdf3da' }}>
        <div className="wrap">
          <h2>Parivaaron Ke Anubhav</h2>
          <div className="grid grid-2">
            {TESTIMONIALS.map((t) => (
              <div className="testi" key={t.name}>
                <p>“{t.text}”</p>
                <b>{t.name}</b> · {t.city} <span className="chip">{t.service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section wrap">
        <h2>Aksar Puche Jaane Wale Sawal</h2>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {GENERAL_FAQS.slice(0, 4).map(([q, a]) => <div className="faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
          <p style={{ textAlign: 'center' }}><Link className="btn btn-maroon" to="/faq">Saare Sawal Dekhein</Link></p>
        </div>
      </section>
    </>
  )
}

export function Services() {
  return (
    <>
      <Seo title="Wedding Services Varanasi | Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ, Catering — Ganga Aarti Booking"
        description="Shaadi ki saari sevayein ek jagah — Ganga Aarti, Pandit Ji, wedding car, tent & decoration, DJ sound, catering, photography aur band baja booking Varanasi aur UP mein. Rate aur quotation online paayein."
        path="/services" jsonLd={breadcrumbLd([['Home', '/'], ['Services', '/services']])} />
      <div className="page-head"><h1>Shaadi Ki Saari Sevayein</h1><p>Har seva ke liye verified partners, saaf rate aur pehle quotation — phir booking.</p></div>
      <section className="section wrap">
        <div className="grid grid-4">{CATEGORIES.map((c) => <CategoryCard key={c.slug} cat={c} />)}</div>
      </section>
    </>
  )
}

export function ServicePage() {
  const { slug } = useParams()
  const cat = categoryBySlug(slug)
  const [products, setProducts] = useState([])
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
            <div className="grid grid-3">
              {products.map((p) => (
                <article className="card" key={p.id}>
                  {p.image ? <div className="ph"><img src={p.image} alt={p.title} loading="lazy" /></div> : <div className="ph">{cat.icon}</div>}
                  <div className="body">
                    <h3>{p.title}</h3>
                    <p className="hint">🏪 {p.partnerName} · 📍 {p.city}</p>
                    <p>{p.description}</p>
                    <p className="price">{inr(p.price)} <small>{p.unit}</small></p>
                    <div style={{ marginTop: 'auto' }}>
                      <Link className="btn btn-maroon btn-sm" to={`/dashboard/quote?category=${cat.slug}&title=${encodeURIComponent(p.title)}`}>Iske Liye Quotation</Link>
                    </div>
                  </div>
                </article>
              ))}
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
          {CATEGORIES.filter((c) => c.slug !== cat.slug).slice(0, 4).map((c) => <CategoryCard key={c.slug} cat={c} />)}
        </div>
      </section>
    </>
  )
}

export function Packages() {
  return (
    <>
      <Seo title="Wedding Packages | Ganga Aarti ₹11,000 Se, Pandit Ji ₹5,100 Se — Ganga Aarti Booking"
        description="Ganga Aarti wedding packages — Shubh Aarti ₹11,000, Family Ganga Aarti ₹21,000, Grand Wedding Aarti ₹51,000. Pandit Ji packages ₹5,100 se. Saari details aur booking online."
        path="/packages" jsonLd={breadcrumbLd([['Home', '/'], ['Packages', '/packages']])} />
      <div className="page-head"><h1>Wedding Packages</h1><p>Saaf rate, koi chhupa charge nahi. Package chunein aur quotation ke saath booking pakki karein.</p></div>
      <section className="section wrap">
        <h2>🪔 Ganga Aarti Packages</h2>
        <div className="grid grid-3">{AARTI_PACKAGES.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
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
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [done, setDone] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    await store.addEnquiry(form).catch(() => {})
    setDone(true)
  }
  return (
    <>
      <Seo title="Contact | Ganga Aarti Booking — Varanasi" description="Ganga Aarti Booking se sampark karein — shaadi mein Ganga Aarti, pandit ji, gaadi, tent, DJ booking ke liye call ya message karein. Varanasi, UP." path="/contact" />
      <div className="page-head"><h1>Sampark Karein</h1><p>Hum subah 8 se raat 10 baje tak uplabdh hain</p></div>
      <section className="section wrap">
        <div className="form-card">
          <p>📞 <b>{SITE.phone}</b><br />✉️ <b>{SITE.email}</b><br />📍 {SITE.city}</p>
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
              <button className="btn btn-gold" style={{ marginTop: 16, width: '100%' }}>Sandesh Bhejein</button>
            </form>
          )}
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
