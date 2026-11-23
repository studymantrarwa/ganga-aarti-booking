// ── Ratings helper ──────────────────────────────────────────────────────────
// Reviews partner-level par aggregate hote hain: ek partner ke saare
// products par wahi average rating dikhta hai (marketplace card, service
// page, storefront aur product page — har jagah ek hi hisaab).
// summarize(reviews, partnerId) → { avg, count }
//   avg   — 1 decimal tak round (jaise 4.5); review na ho to 0
//   count — us partner ke kul reviews
export function summarize(reviews, partnerId) {
  const rows = (reviews || []).filter((r) => r && r.partnerId === partnerId)
  if (!rows.length) return { avg: 0, count: 0 }
  const total = rows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0)
  return { avg: Math.round((total / rows.length) * 10) / 10, count: rows.length }
}
