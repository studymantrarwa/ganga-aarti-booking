// ─────────────────────────────────────────────────────────────────────────────
// SEO prerender — runs after `vite build` (see package.json "build").
// Writes a content-rich static HTML file per public route into dist/, plus
// sitemap.xml and robots.txt, so search engines see real titles, meta,
// JSON-LD and body copy for every page (the SPA bundle still loads on top).
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises'
import path from 'node:path'
import { CATEGORIES, AARTI_PACKAGES, PANDIT_PACKAGES, GENERAL_FAQS, TESTIMONIALS } from '../src/data/catalog.js'

const origin = process.env.VITE_SITE_ORIGIN || 'https://ganga-aarti-wedding.vercel.app'
const gsc = process.env.VITE_GSC_VERIFICATION || ''
const esc = (s = '') => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

const localBusiness = {
  '@type': 'LocalBusiness', '@id': `${origin}/#business`, name: 'Ganga Aarti Booking', url: `${origin}/`,
  image: `${origin}/images/hero-aarti.jpg`, priceRange: '₹₹', telephone: '+91-90000-00000',
  description: 'Wedding mein Ganga Aarti booking aur poori shaadi vyavastha — Pandit Ji, gaadi, tent decoration, DJ, catering, photography, band baja.',
  address: { '@type': 'PostalAddress', addressLocality: 'Varanasi', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' },
  areaServed: ['Varanasi', 'Lucknow', 'Prayagraj', 'Jaunpur', 'Ayodhya', 'Gorakhpur'],
}
const faqSchema = (faqs) => ({ '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
const breadcrumb = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: origin + p })) })
const serviceSchema = (cat) => ({
  '@type': 'Service', name: `${cat.name} — Wedding Booking`, description: cat.description,
  provider: { '@id': `${origin}/#business` }, areaServed: 'Varanasi, Uttar Pradesh,India',
  offers: { '@type': 'Offer', price: cat.startingPrice, priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
})

const catLinks = CATEGORIES.map((c) => `<li><a href="/services/${c.slug}">${esc(c.name)} Booking</a> — ${esc(c.tagline)} (${inr(c.startingPrice)} se shuru)</li>`).join('')
const catCards = CATEGORIES.map((c) => `<section><h2>${esc(c.icon)} ${esc(c.name)} (${esc(c.hindi)})</h2><p>${esc(c.description)}</p><p>Rate: <strong>${inr(c.startingPrice)}</strong> ${esc(c.unit)} se shuru · <a href="/services/${c.slug}">${esc(c.name)} booking details</a> · <a href="/dashboard/quote?category=${c.slug}">Free quotation</a></p></section>`).join('')
const pkgList = (pkgs) => pkgs.map((p) => `<section><h2>${esc(p.name)} — ${inr(p.price)} ${esc(p.unit)}</h2><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p><a href="/dashboard/quote?category=${p.category}">Is package ke liye quotation maangein</a></p></section>`).join('')
const faqHtml = (faqs) => `<section><h2>Aksar Puche Jaane Wale Sawal</h2>${faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`

const routes = [
  {
    path: '/', title: 'Ganga Aarti Wedding Booking | Shaadi Mein Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ — Varanasi',
    description: 'Ganga aarti wedding booking Varanasi mein — shaadi mein Maa Ganga ki divya aarti, shaadi ke liye Pandit Ji, wedding car, tent decoration, DJ, catering, photography aur band baja. Free quotation, pakki booking.',
    h1: 'Shaadi Mein Ganga Aarti — Aur Poori Wedding Vyavastha, Ek Hi Jagah',
    image: '/images/hero-aarti.jpg',
    schema: [localBusiness, faqSchema(GENERAL_FAQS)],
    body: `<p>Dulha-dulhan ke liye Maa Ganga ka aashirwad, venue par bhavya aarti, saath mein Pandit Ji, gaadi, tent, DJ, catering, photography aur band baja — free quotation ke saath pakki booking.</p>${catCards}<section><h2>Parivaaron Ke Anubhav</h2>${TESTIMONIALS.map((t) => `<blockquote><p>“${esc(t.text)}”</p><footer>— ${esc(t.name)}, ${esc(t.city)} (${esc(t.service)})</footer></blockquote>`).join('')}</section>${faqHtml(GENERAL_FAQS.slice(0, 4))}`,
  },
  {
    path: '/services', title: 'Wedding Services Varanasi | Ganga Aarti, Pandit Ji, Gaadi, Tent, DJ, Catering — Ganga Aarti Booking',
    description: 'Shaadi ki saari sevayein ek jagah — Ganga Aarti, Pandit Ji, wedding car, tent & decoration, DJ sound, catering, photography aur band baja booking Varanasi aur UP mein.',
    h1: 'Shaadi Ki Saari Sevayein', image: '/images/hero-aarti.jpg',
    schema: [breadcrumb([['Home', '/'], ['Services', '/services']])],
    body: `<p>Har seva ke liye verified partners, saaf rate aur pehle quotation — phir booking.</p><ul>${catLinks}</ul>${catCards}`,
  },
  ...CATEGORIES.map((cat) => ({
    path: `/services/${cat.slug}`,
    title: `${cat.name} Booking Varanasi | ${cat.keywords} — Ganga Aarti Booking`,
    description: `${cat.description.slice(0, 155)}… Rate ${inr(cat.startingPrice)} se shuru. Free quotation paayein.`,
    h1: `${cat.name} — Shaadi Ke Liye Booking`, image: cat.image || '/images/hero-aarti.jpg',
    schema: [serviceSchema(cat), faqSchema(cat.faqs), breadcrumb([['Home', '/'], ['Services', '/services'], [cat.name, `/services/${cat.slug}`]])],
    body: `<p>${esc(cat.tagline)}</p><p>${esc(cat.description)}</p><h2>Kya-kya shamil hai</h2><ul>${cat.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p>Rate: <strong>${inr(cat.startingPrice)}</strong> ${esc(cat.unit)} se shuru · <a href="/dashboard/quote?category=${cat.slug}">Free quotation maangein</a></p>${faqHtml(cat.faqs)}<h2>Doosri Sevayein</h2><ul>${catLinks}</ul>`,
  })),
  {
    path: '/packages', title: 'Wedding Packages | Ganga Aarti ₹11,000 Se, Pandit Ji ₹5,100 Se — Ganga Aarti Booking',
    description: 'Ganga Aarti wedding packages — Shubh Aarti ₹11,000, Family Ganga Aarti ₹21,000, Grand Wedding Aarti ₹51,000. Pandit Ji packages ₹5,100 se. Saari details aur booking online.',
    h1: 'Wedding Packages', image: '/images/couple-aarti.jpg',
    schema: [breadcrumb([['Home', '/'], ['Packages', '/packages']])],
    body: `<p>Saaf rate, koi chhupa charge nahi.</p><h2>🪔 Ganga Aarti Packages</h2>${pkgList(AARTI_PACKAGES)}<h2>🙏 Pandit Ji Packages</h2>${pkgList(PANDIT_PACKAGES)}`,
  },
  {
    path: '/gallery', title: 'Gallery | Shaadi Mein Ganga Aarti, Mandap, Gaadi — Ganga Aarti Booking',
    description: 'Hamare karyakramon ki jhalak — shaadi mein Ganga Aarti, dulha-dulhan ki aarti, vivah puja, mandap sajawat, vidaai gaadi aur sangeet DJ.',
    h1: 'Gallery', image: '/images/hero-aarti.jpg', schema: [breadcrumb([['Home', '/'], ['Gallery', '/gallery']])],
    body: `<p>Hamare intezamon ki kuchh jhalkiyan:</p><ul><li>Shaadi samaroh mein Ganga Aarti</li><li>Dulha-dulhan ki pehli aarti</li><li>Pandit Ji dwara vivah puja</li><li>Mandap aur stage sajawat</li><li>Vidaai ke liye sajji gaadi</li><li>Sangeet night DJ</li></ul>`,
  },
  {
    path: '/about', title: 'About Us | Ganga Aarti Booking — Varanasi Ka Wedding Services Platform',
    description: 'Ganga Aarti Booking Varanasi se shuru hua platform hai jo shaadiyon mein Ganga Aarti aur poori wedding vyavastha — pandit, gaadi, tent, DJ, catering — ek jagah deta hai.',
    h1: 'Hamare Baare Mein', image: '/images/hero-aarti.jpg', schema: [breadcrumb([['Home', '/'], ['About', '/about']])],
    body: `<p>Ganga Aarti Booking ki shuruaat ek saral vichaar se hui — shaadi mein Maa Ganga ki aarti karana aasan hona chahiye. Aaj hum Pandit Ji, gaadi, tent aur sajawat, DJ, catering, photography aur band baja ke saath poori wedding vyavastha dete hain — verified local partners, quotation mein saaf rate, aur samay ki pabandi ke saath.</p>`,
  },
  {
    path: '/faq', title: 'FAQ | Ganga Aarti Wedding Booking Ke Sawal-Jawab — Ganga Aarti Booking',
    description: 'Ganga Aarti wedding booking, pandit ji, gaadi, tent, DJ aur catering booking se jude saare aam sawalon ke jawab — rate, advance, cancel aur partner banne ki jaankari.',
    h1: 'Aksar Puche Jaane Wale Sawal', image: '/images/hero-aarti.jpg',
    schema: [faqSchema([...GENERAL_FAQS, ...CATEGORIES.flatMap((c) => c.faqs)])],
    body: faqHtml([...GENERAL_FAQS, ...CATEGORIES.flatMap((c) => c.faqs)]),
  },
  {
    path: '/contact', title: 'Contact | Ganga Aarti Booking — Varanasi',
    description: 'Ganga Aarti Booking se sampark karein — shaadi mein Ganga Aarti, pandit ji, gaadi, tent, DJ booking ke liye call ya message karein. Varanasi, UP.',
    h1: 'Sampark Karein', image: '/images/hero-aarti.jpg', schema: [localBusiness],
    body: `<p>Phone: +91 90000 00000 · Email: namaste@gangaaartibooking.in · Varanasi, Uttar Pradesh. Subah 8 – raat 10, har din.</p>`,
  },
  {
    path: '/login', title: 'Login | Ganga Aarti Booking', description: 'Ganga Aarti Booking par login karein — quotations, bookings aur partner panel dekhein.',
    h1: 'Login', image: '/images/hero-aarti.jpg', schema: [], body: `<p>Apne account mein login karke quotations, bookings aur panel dekhein. Account nahi hai? <a href="/signup">Sign up karein</a>.</p>`,
  },
  {
    path: '/signup', title: 'Sign Up | Ganga Aarti Booking — User ya Partner Account Banayein', description: 'Free account banayein — user bankar quotation aur booking karein, ya partner (vendor) bankar apni wedding services dena shuru karein.',
    h1: 'Sign Up — Free Account', image: '/images/hero-aarti.jpg', schema: [], body: `<p>User ya Partner account banayein. Partner apne products add karke quotation aur booking paa sakte hain.</p>`,
  },
  {
    path: '/partner-join', title: 'Partner Banein | Apni Wedding Services Bechiye — Ganga Aarti Booking', description: 'Pandit Ji, decorator, gaadi, DJ, caterer, photographer, band wale — free partner banein, apni storefront website paayein, manual booking par sirf ₹50 commission, referral se 5% kamai 1 saal tak.',
    h1: 'Partner Banein — Apna Business Badhayein', image: '/images/partner-join.jpg',
    schema: [breadcrumb([['Home', '/'], ['Partner Banein', '/partner-join']])],
    body: `<p>Join karna <b>bilkul free</b> hai. Partner bankar aapko milta hai: apni <b>storefront website</b> (aapke naam ka link, jaise /p/aapka-naam), ek se zyada sevayein (multi-role), offline <b>manual booking par sirf ₹50 flat commission</b>, aur <b>referral se 5% kamai pure 1 saal</b> tak. Commission pehle se saaf dikhta hai — koi chhupa charge nahi.</p><p><a href="/signup">Abhi Partner Sign Up Karein — Free</a> · Kisi partner ne bulaya hai to sign up mein unka referral code zaroor daalein.</p>`,
  },
  {
    path: '/terms', title: 'Seva Ki Shartein (Terms) | Ganga Aarti Booking', description: 'Ganga Aarti Booking ki seva shartein — booking, quotation, commission, partner ki zimmedariyan aur platform ki bhoomika (sirf madhyasth / facilitator).',
    h1: 'Seva Ki Shartein', image: '/images/hero-aarti.jpg',
    schema: [breadcrumb([['Home', '/'], ['Seva Ki Shartein', '/terms']])],
    body: `<p>Ganga Aarti Booking ek online madhyam (facilitator) hai jo grahakon ko sthaniya wedding service partners se jodta hai. Seva asal mein partner deta hai; platform quotation, booking aur sampark ki suvidha deta hai. Partner apni seva ki gunvatta, samay par upasthiti aur diye gaye rate ki zimmedari leta hai. Pakki booking par platform ka commission lagta hai jo partner ko pehle se saaf dikhaya jata hai. Payment aur refund ke niyam Refund Policy mein diye hain.</p>`,
  },
  {
    path: '/privacy', title: 'Privacy Policy | Ganga Aarti Booking', description: 'Ganga Aarti Booking privacy policy — hum kaunsi jaankari lete hain, uska upyog kis liye hota hai, aur sampark kaise karein.',
    h1: 'Privacy Policy', image: '/images/hero-aarti.jpg',
    schema: [breadcrumb([['Home', '/'], ['Privacy Policy', '/privacy']])],
    body: `<p>Hum sirf wahi jaankari lete hain jo booking ke liye zaroori hai — naam, mobile number, email, shahar aur karyakram ki details. Iska upyog quotation, booking ki pushti aur seva dene ke liye hota hai. Aapki jaankari bina aapki anumati ke kisi teesre paksh ko bechi nahi jaati. Apni jaankari badalne ya hatane ke liye Contact page se sampark karein.</p>`,
  },
  {
    path: '/refund-policy', title: 'Refund Aur Cancellation Policy | Ganga Aarti Booking', description: 'Advance refund ke niyam — partner reject/cancel kare to poora refund; grahak cancel kare to karyakram se kitne din pehle, us hisaab se refund slab.',
    h1: 'Refund Aur Cancellation Policy', image: '/images/hero-aarti.jpg',
    schema: [breadcrumb([['Home', '/'], ['Refund Policy', '/refund-policy']])],
    body: `<p><b>Partner reject ya cancel kare</b> to advance ki <b>poori rakam (100%)</b> wapas milti hai. <b>Grahak cancel kare</b> to: karyakram se 15 din ya zyada pehle — 100% refund; 7–14 din pehle — 50% refund; 7 din se kam pehle — advance wapas nahi milta, kyunki partner ne woh date doosron ke liye band kar di hoti hai. Refund 5–7 kaam ke dinon mein usi madhyam se wapas hota hai jisse payment hua tha.</p>`,
  },
]

let builtIndex = ''
try { builtIndex = await fs.readFile(path.resolve('dist/index.html'), 'utf8') } catch { /* ignore */ }
const jsAsset = builtIndex.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)?.[1] || ''
const cssAssets = [...builtIndex.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/gi)].map((m) => m[1])
const style = `<style>body{margin:0;background:#fff9ef;color:#2d1d12;font:17px/1.7 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:900px;margin:0 auto;padding:26px 20px}header,footer{padding:14px 0;border-bottom:2px solid #d4a017}footer{border-top:2px solid #d4a017;border-bottom:0;margin-top:36px}a{color:#7b1e1e}h1{font-size:clamp(1.9rem,5vw,2.9rem);color:#5d1414;line-height:1.2}h2{color:#5d1414;margin-top:1.8rem}img.hero{width:100%;border-radius:14px}</style>`
const nav = `<header><a href="/">🪔 Ganga Aarti Booking</a> · <a href="/services">Services</a> · <a href="/packages">Packages</a> · <a href="/gallery">Gallery</a> · <a href="/about">About</a> · <a href="/faq">FAQ</a> · <a href="/contact">Contact</a> · <a href="/login">Login</a></header>`
const footer = `<footer><nav><a href="/services/ganga-aarti">Ganga Aarti Booking</a> · <a href="/services/pandit-ji">Pandit Ji</a> · <a href="/services/gaadi">Wedding Car</a> · <a href="/services/tent-decoration">Tent &amp; Decoration</a> · <a href="/services/dj-sound">DJ &amp; Sound</a> · <a href="/services/catering">Catering</a> · <a href="/services/photography">Photography</a> · <a href="/services/band-baja">Band Baja</a></nav><nav><a href="/partner-join">Partner Banein</a> · <a href="/terms">Seva Ki Shartein</a> · <a href="/privacy">Privacy Policy</a> · <a href="/refund-policy">Refund Policy</a></nav><p>Ganga Aarti Booking · Varanasi, Uttar Pradesh · Shaadi mein Ganga Aarti aur poori wedding vyavastha</p></footer>`

async function writeRoute(route) {
  const canonical = origin + route.path
  const schema = { '@context': 'https://schema.org', '@graph': route.schema }
  const html = `<!doctype html><html lang="hi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#5d1414"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="description" content="${esc(route.description)}"><meta name="author" content="Ganga Aarti Booking">${gsc ? `<meta name="google-site-verification" content="${esc(gsc)}">` : ''}<link rel="canonical" href="${canonical}"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta property="og:type" content="website"><meta property="og:site_name" content="Ganga Aarti Booking"><meta property="og:locale" content="hi_IN"><meta property="og:title" content="${esc(route.title)}"><meta property="og:description" content="${esc(route.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin}${route.image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(route.title)}"><meta name="twitter:description" content="${esc(route.description)}"><meta name="twitter:image" content="${origin}${route.image}"><title>${esc(route.title)}</title>${route.schema.length ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>` : ''}${cssAssets.map((h) => `<link rel="stylesheet" href="${h}">`).join('')}${style}</head><body><div id="root"><main>${nav}<article><h1>${esc(route.h1)}</h1>${route.image ? `<img class="hero" src="${route.image}" alt="${esc(route.h1)}">` : ''}${route.body}</article>${footer}</main></div>${jsAsset ? `<script type="module" src="${jsAsset}"></script>` : ''}</body></html>`
  const out = route.path === '/' ? path.resolve('dist/index.html') : path.resolve('dist', route.path.slice(1), 'index.html')
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, html, 'utf8')
}

for (const route of routes) await writeRoute(route)

const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${origin}${r.path}</loc><lastmod>${today}</lastmod><changefreq>${r.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${r.path === '/' ? '1.0' : r.path.startsWith('/services/') ? '0.9' : '0.7'}</priority></url>`).join('\n')}\n</urlset>\n`
await fs.writeFile(path.resolve('dist/sitemap.xml'), sitemap, 'utf8')
await fs.writeFile(path.resolve('dist/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /partner\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`, 'utf8')
console.log(`SEO prerender complete: ${routes.length} routes + sitemap.xml + robots.txt`)
