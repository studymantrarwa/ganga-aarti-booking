// ── Local lists (Flipkart-style functions, bina login ke) ──────────────────
// Wishlist aur Recently Viewed sirf is device ke localStorage mein rehte
// hain — koi store.js API ya database badlav nahi.
//   gab_wishlist : product ids ki array (pasandeeda products)
//   gab_recent   : product ids, sabse haal ka pehle, zyada se zyada 10
const WISH_KEY = 'gab_wishlist'
const RECENT_KEY = 'gab_recent'
export const WISHLIST_EVENT = 'gab-wishlist-change'

const readIds = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
  } catch { return [] }
}
const writeIds = (key, ids) => {
  try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* private mode */ }
}

export const getWishlist = () => readIds(WISH_KEY)
export const isWished = (id) => readIds(WISH_KEY).includes(id)
export function toggleWishlist(id) {
  const list = readIds(WISH_KEY)
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]
  writeIds(WISH_KEY, next)
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: next }))
  return next
}
// Wishlist badlav sunne ke liye — components isse subscribe karte hain taaki
// card, product page aur wishlist page teeno hamesha sync rahein.
export function onWishlistChange(fn) {
  const handler = (e) => fn(e.detail || getWishlist())
  window.addEventListener(WISHLIST_EVENT, handler)
  return () => window.removeEventListener(WISHLIST_EVENT, handler)
}

export const getRecent = () => readIds(RECENT_KEY)
export function pushRecent(id) {
  if (!id) return
  const next = [id, ...readIds(RECENT_KEY).filter((x) => x !== id)].slice(0, 10)
  writeIds(RECENT_KEY, next)
}
