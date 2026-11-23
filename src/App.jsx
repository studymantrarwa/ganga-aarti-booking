import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { About, Contact, Faq, Gallery, Home, NotFound, Packages, PartnerJoin, PartnerStorefront, Privacy, RefundPolicy, ServicePage, Services, Terms } from './pages/Public'
import { ToastProvider } from './lib/ui'
import { Login, Signup } from './pages/Auth'
import UserPanel from './pages/UserPanel'
import PartnerPanel from './pages/PartnerPanel'
import AdminPanel from './pages/AdminPanel'

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
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="p/:slug" element={<PartnerStorefront />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServicePage />} />
          <Route path="packages" element={<Packages />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="about" element={<About />} />
          <Route path="faq" element={<Faq />} />
          <Route path="contact" element={<Contact />} />
          <Route path="partner-join" element={<PartnerJoin />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="dashboard" element={<Protected role="user"><UserPanel tab="quotes" /></Protected>} />
          <Route path="dashboard/quote" element={<Protected role="user"><UserPanel tab="new" /></Protected>} />
          <Route path="partner" element={<Protected role="partner"><PartnerPanel /></Protected>} />
          <Route path="admin" element={<Protected role="admin"><AdminPanel /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
