import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { About, AppDownload, Contact, Faq, Gallery, Home, NotFound, Packages, PartnerJoin, PartnerStorefront, Privacy, ProductPage, RefundPolicy, ServicePage, Services, Terms, UserHub, WishlistPage } from './pages/Public'
import { ToastProvider } from './lib/ui'

// ── Code-splitting (scalability): bhaari panel/auth pages alag chunks mein
// lazy-load hote hain — public pages pehla paint tez rehta hai.
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Signup })))
const SignupChoice = lazy(() => import('./pages/Auth').then((m) => ({ default: m.SignupChoice })))
const UserPanel = lazy(() => import('./pages/UserPanel'))
const PartnerPanel = lazy(() => import('./pages/PartnerPanel'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

// ── ScrollToTop (Flipkart pattern) ──────────────────────────────────────────
// Route badalte hi page upar se khulta hai — SPA mein browser ye apne aap
// nahi karta, bina iske naya page aadha scroll kiya hua khulta tha. Link
// mein #hash ho (jaise /services#marketplace) to us hisse tak scroll hota
// hai. Sirf search params badalne par (listing filters) pathname/hash nahi
// badalta, isliye scroll wahin rehta hai jahan user hai.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) { el.scrollIntoView(); return }
        window.scrollTo(0, 0)
      }, 60)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

// ── App loader — index.html wale branded splash jaisa hi loader (cream bg,
// diya mark, gold bar) taaki lazy chunks / auth check ke samay bhi site
// khulte samay wali hi saaf pehchan dikhe, kachcha text kabhi na dikhe.
function AppLoader() {
  return (
    <div className="app-loader" role="status" aria-label="Loading">
      <div className="splash-mark">🪔</div>
      <div className="splash-name">Ganga Aarti Booking</div>
      <div className="splash-bar"><span /></div>
    </div>
  )
}

function Protected({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ScrollToTop />
      <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="p/:slug" element={<PartnerStorefront />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServicePage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="packages" element={<Packages />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="about" element={<About />} />
          <Route path="faq" element={<Faq />} />
          <Route path="contact" element={<Contact />} />
          <Route path="partner-join" element={<PartnerJoin />} />
          <Route path="app" element={<AppDownload />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignupChoice />} />
          <Route path="signup/user" element={<Signup fixedRole="user" />} />
          <Route path="signup/partner" element={<Signup fixedRole="partner" />} />
          <Route path="user" element={<UserHub />} />
          <Route path="dashboard" element={<Protected role="user"><UserPanel tab="quotes" /></Protected>} />
          <Route path="dashboard/quote" element={<Protected role="user"><UserPanel tab="new" /></Protected>} />
          <Route path="partner" element={<Protected role="partner"><PartnerPanel /></Protected>} />
          <Route path="admin" element={<Protected role="admin"><AdminPanel /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}
