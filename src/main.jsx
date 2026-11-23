import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

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
