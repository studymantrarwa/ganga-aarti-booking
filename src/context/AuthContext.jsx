import { createContext, useContext, useEffect, useState } from 'react'
import { store } from '../lib/store'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    store.currentUser().then((u) => { setUser(u); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const signUp = async (data) => { const u = await store.signUp(data); setUser(u); return u }
  const signIn = async (email, password) => { const u = await store.signIn(email, password); setUser(u); return u }
  const signOut = async () => { await store.signOut(); setUser(null) }
  const refresh = async () => { setUser(await store.currentUser()) }

  return <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refresh }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function dashboardPath(user) {
  if (!user) return '/login'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'partner') return '/partner'
  return '/dashboard'
}
