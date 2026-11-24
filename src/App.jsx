import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { About, AppDownload, Contact, Faq, Gallery, Home, NotFound, Packages, PartnerJoin, PartnerStorefront, Privacy, ProductPage, RefundPolicy, ServicePage, Services, Terms, UserHub, WishlistPage } from './pages/Public'
import { ToastProvider } from './lib/ui'
import { Spinner } from './lib/ui'

// ── Code-splitting (scalability): bhaari panel/auth pages alag chunks mein
// lazy-load hote hain — public pages pehla paint tez rehta hai.
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Signup })))
const SignupChoice = lazy(() => import('./pages/Auth').then((m) => ({ default: m.SignupChoice })))
const UserPanel = lazy(() => import('./pages/UserPanel'))
const PartnerPanel = lazy(() => import('./pages/PartnerPanel'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

function Protected({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="wrap section"><p>Loading… 🪔</p></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Suspense fallback={<div className="wrap section"><Spinner label="Page load ho raha hai…" /></div>}>
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
