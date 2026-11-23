import { useEffect } from 'react'
import { SITE } from '../data/catalog'

// Sets per-route title, meta description, Open Graph / Twitter tags,
// canonical link and optional JSON-LD structured data.
export default function Seo({ title, description, path = '/', image, jsonLd }) {
  useEffect(() => {
    const url = SITE.origin + path
    document.title = title
    const set = (selector, attr, value) => {
      let el = document.head.querySelector(selector)
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
      el.setAttribute(attr, value)
    }
    set('meta[name="description"]', 'content', description)
    set('meta[property="og:title"]', 'content', title)
    set('meta[property="og:description"]', 'content', description)
    set('meta[property="og:url"]', 'content', url)
    if (image) set('meta[property="og:image"]', 'content', SITE.origin + image)
    set('meta[name="twitter:title"]', 'content', title)
    set('meta[name="twitter:description"]', 'content', description)
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = url
    let script = document.head.querySelector('script[data-page-jsonld]')
    if (jsonLd) {
      if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.pageJsonld = '1'; document.head.appendChild(script) }
      script.textContent = JSON.stringify(jsonLd)
    } else if (script) script.remove()
  }, [title, description, path, image, jsonLd])
  return null
}

export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.origin + path })),
})

export const faqLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

export const serviceLd = (cat) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: `${cat.name} — Wedding Booking`,
  description: cat.description,
  provider: { '@type': 'LocalBusiness', name: SITE.name, url: SITE.origin },
  areaServed: 'Varanasi, Uttar Pradesh,India',
  offers: { '@type': 'Offer', price: cat.startingPrice, priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
})
