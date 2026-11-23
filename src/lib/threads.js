// ── Chat thread keys ────────────────────────────────────────────────────────
// Ek conversation (chat) hamesha ek booking ya ek quotation se judi hoti
// hai. thread_key ka convention:
//   booking:<bookingId>      — us booking ke user ↔ partner ki chat
//   quotation:<quotationId>  — us quotation ke user ↔ partner ki chat
// Ye chhota sa module jaan-bujh kar bina kisi import ke rakha hai taaki
// store, ChatBox aur tests — teeno ise seedha istemal kar sakein.
export const bookingThreadKey = (bookingId) => `booking:${bookingId}`
export const quotationThreadKey = (quotationId) => `quotation:${quotationId}`

export function parseThreadKey(threadKey) {
  const m = /^(booking|quotation):(.+)$/.exec(String(threadKey || ''))
  if (!m) return { kind: null, id: null }
  return { kind: m[1], id: m[2] }
}

export const isBookingThread = (threadKey) => parseThreadKey(threadKey).kind === 'booking'
export const isQuotationThread = (threadKey) => parseThreadKey(threadKey).kind === 'quotation'
