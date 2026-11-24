import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initInstallPrompt } from './lib/install'

// PWA install prompt ko jaldi pakdo (event page load ke aas-paas aata hai).
initInstallPrompt()

// Service worker — sirf production build mein, page load ke baad register
// hota hai taaki pehli paint slow na ho. Fail ho to chup chaap aage badho.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try { navigator.serviceWorker.register('/sw.js').catch(() => {}) } catch { /* ignore */ }
  })
}

// Google Search Console verification meta tag (rendered only when configured).
const gsc = import.meta.env.VITE_GSC_VERIFICATION
if (gsc) {
  const meta = document.createElement('meta')
  meta.name = 'google-site-verification'
  meta.content = gsc
  document.head.appendChild(meta)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Branded splash (index.html) hatao — React ka pehla render ho gaya hai.
// Halke fade (~250ms) ke saath DOM se nikaal do; kul samay 600ms se kam.
// Bundle fail hone ki sthiti index.html ka 5-second fallback sambhalta hai.
requestAnimationFrame(() => {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('splash-hide')
  setTimeout(() => splash.remove(), 300)
})
