import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryBySlug, inr } from '../data/catalog'
import { store } from '../lib/store'
import { summarize } from '../lib/ratings'
import { isWished, onWishlistChange, toggleWishlist } from '../lib/localLists'

// Wishlist heart (SVG, emoji nahi) — card aur product page dono par ek hi
// component; state localStorage se sync rehta hai (lib/localLists.js).
export function WishlistHeart({ id, className = '' }) {
  const [on, setOn] = useState(() => isWished(id))
  useEffect(() => onWishlistChange((list) => setOn(list.includes(id))), [id])
  return (
    <button
      type="button"
      className={`wish-btn${on ? ' on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={on}
      aria-label={on ? 'Wishlist se hatayein' : 'Wishlist mein jodein'}
      title={on ? 'Wishlist se hatayein' : 'Wishlist mein jodein'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(id) }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.7C6.4 17 3.4 13.6 3.4 9.9 3.4 7.2 5.4 5 8 5c1.7 0 3.2.9 4 2.3C12.8 5.9 14.3 5 16 5c2.6 0 4.6 2.2 4.6 4.9 0 3.7-3 7.1-8.6 10.8Z" /></svg>
    </button>
  )
}

// ── Skeleton placeholders (Flipkart-style loading) ──────────────────────────
// Data load hote samay kachcha "Load ho raha hai…" text nahi — card ki
// aakriti wale halke grey block, taaki layout jump na kare.
export function SkeletonCard() {
  return (
    <div className="skel-card" aria-hidden="true">
      <div className="skel-media" />
      <div className="skel-body">
        <div className="skel-line w40" />
        <div className="skel-line" />
        <div className="skel-line w60" />
        <div className="skel-line skel-price" />
        <div className="skel-btn" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return <>{Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}</>
}

// ── Shared marketplace pieces ───────────────────────────────────────────────
// Reviews ek hi store call se aate hain aur ratings PARTNER-level par judte
// hain (lib/ratings.js) — listing, home shelf, service page, storefront aur
// product page, har jagah ek hi hisaab. Browsing BINA LOGIN ke khuli hai.
export function useReviews() {
  const [reviews, setReviews] = useState([])
  useEffect(() => { store.listReviews().then((rows) => setReviews(rows || [])).catch(() => {}) }, [])
  return reviews
}

export function Stars({ value }) {
  const full = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return <span className="stars" aria-label={`${value} star rating`}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
}

// Green pill sirf tab jab asal reviews hain — green functional rang hai
// (rating), sajawat nahi. Review na ho to neutral "Naya" pill.
export function RatingPill({ rating }) {
  if (!rating || !rating.count) return <span className="rating-pill new">Naya</span>
  return <span className="rating-pill">★ {rating.avg.toFixed(1)} <small>({rating.count})</small></span>
}

// Ek hi product card — Flipkart pattern: photo, category label, 2-line title,
// green rating pill + review count, partner ka naam + shahar (chhota, muted —
// main site par partner ka phone/contact KABHI nahi), aur ink rang mein
// saaf price. Products mein koi MRP field hai hi nahi, isliye koi nakli
// strike-through / % off nahi dikhta — sirf asal price + unit.
// onSelect (vaikalpik): storefront par card ka pehla button link nahi hota —
// wo product ko wahi page ke booking form ke liye CHUNTA hai ("Book Karein").
export function ProductCard({ p, reviews, onSelect }) {
  const cat = categoryBySlug(p.category)
  const rating = summarize(reviews, p.partnerId)
  const img = (p.images && p.images[0]) || p.imageUrl || p.image || cat?.image
  return (
    <article className="p-card">
      <div className="p-card-media-wrap">
        <Link to={`/product/${p.id}`} className="p-card-media" aria-label={p.title}>
          {img ? <div className="ph"><img src={img} alt={p.title} loading="lazy" /></div> : <div className="ph ph-fallback" aria-hidden="true">{(p.title || 'G').trim().charAt(0).toUpperCase()}</div>}
        </Link>
        <WishlistHeart id={p.id} />
      </div>
      <div className="body">
        {cat && <span className="p-cat">{cat.name}</span>}
        <h3 className="p-title"><Link to={`/product/${p.id}`}>{p.title}</Link></h3>
        <div className="p-rating-row">
          <RatingPill rating={rating} />
          {rating.count > 0 && <span className="hint">{rating.count} reviews</span>}
        </div>
        <p className="p-partner">{p.partnerName}{p.city ? ` · ${p.city}` : ''}</p>
        <p className="p-price">{inr(p.price)} <small>{p.unit}</small></p>
        <div className="p-actions">
          {onSelect
            ? <button type="button" className="btn btn-gold btn-sm" onClick={() => onSelect(p)}>Book Karein</button>
            : <Link className="btn btn-gold btn-sm" to={`/product/${p.id}`}>Book Now</Link>}
          <Link className="btn btn-ghost btn-sm" to={`/product/${p.id}`}>Details</Link>
        </div>
      </div>
    </article>
  )
}
