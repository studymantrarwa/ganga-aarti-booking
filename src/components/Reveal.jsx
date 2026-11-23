import { useEffect, useRef } from 'react'

// Scroll-reveal wrapper: fades + slides children up when they enter the
// viewport (IntersectionObserver, no dependencies). Falls back to visible
// when IO is unavailable; CSS disables the motion for reduced-motion users.
export default function Reveal({ children, className = '', delay = 0, style }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { el.classList.add('revealed'); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('revealed'); io.disconnect() } })
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}
