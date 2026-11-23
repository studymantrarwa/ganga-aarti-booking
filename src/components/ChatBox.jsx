import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { store } from '../lib/store'
import { useToast } from '../lib/ui'

// ── ChatBox — user ↔ partner chat (ek booking ya quotation thread par) ─────
// Props: threadKey ("booking:<id>" / "quotation:<id>"), bookingId,
// quotationId, otherId (saamne wale ka profile id), otherName.
// Messages store se aate hain; khula rehne par har 8 second mein polling
// se naye messages aa jate hain, aur window focus par bhi refresh hota
// hai. Bhejne par dusri taraf push notification bhi jata hai (store →
// push.js → /api/send-push, server booking/quotation sambandh check
// karke hi bhejta hai).
const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) } catch { return '' }
}

export default function ChatBox({ threadKey, bookingId = null, quotationId = null, otherId, otherName }) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const stickRef = useRef(true) // user neeche ke paas hai → naye message par auto-scroll

  const load = useCallback(async () => {
    const rows = await store.listMessages(threadKey).catch(() => [])
    // Sirf isi jodi (main ↔ saamne wala) ke messages — ek quotation par
    // kai partners ke rate aa sakte hain, lekin har chat apni jodi ki hai.
    setMessages((rows || []).filter((m) =>
      (m.senderId === user.id && m.receiverId === otherId) ||
      (m.senderId === otherId && m.receiverId === user.id)))
  }, [threadKey, otherId, user.id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 8000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [load])
  useEffect(() => {
    const el = listRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages])
  const onScroll = () => {
    const el = listRef.current
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const send = async (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const row = await store.sendMessage({ threadKey, bookingId, quotationId, receiverId: otherId, body }, user)
      setText('')
      stickRef.current = true
      setMessages((prev) => [...prev.filter((m) => m.id !== row.id), row])
      load()
    } catch (ex) { toast(ex.message || 'Message nahi gaya — dobara koshish karein.', 'err') }
    setSending(false)
  }

  return (
    <div className="chat-box">
      <div className="chat-msgs" ref={listRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <p className="chat-empty">Abhi koi message nahi — pehla message bhejein 🙏</p>
        ) : messages.map((m) => {
          const mine = m.senderId === user.id
          return (
            <div key={m.id} className={`chat-msg ${mine ? 'mine' : 'theirs'}`}>
              {!mine && <b className="chat-name">{m.senderName || otherName}</b>}
              <span>{m.body}</span>
              <span className="chat-meta">{fmtTime(m.createdAt)}</span>
            </div>
          )
        })}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${otherName || 'Saamne wale'} ko message likhein…`}
          maxLength={1000}
          aria-label="Chat message"
        />
        <button className="btn btn-maroon btn-sm" type="submit" disabled={sending || !text.trim()}>
          {sending ? 'Bhej rahe hain…' : 'Bhejein ➤'}
        </button>
      </form>
    </div>
  )
}
