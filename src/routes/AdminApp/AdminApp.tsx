import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { auth } from '~/services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import Login from '~/components/admin/Login'
import Dashboard from '~/components/admin/Dashboard'

function AdminApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use Firebase's onAuthStateChanged directly (more reliable than react-firebase-hooks)
  useEffect(() => {
    setLoading(true)
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user)
        setError(null)
        setLoading(false)
      },
      (error) => {
        console.error('Auth error:', error)
        setError(error)
        setLoading(false)
      }
    )

    // Check current user immediately (before waiting for listener)
    const currentUser = auth.currentUser
    if (currentUser) {
      setUser(currentUser)
      setLoading(false)
    }

    return () => unsubscribe()
  }, [])

  const effectiveUser = user
  const effectiveLoading = loading
  const effectiveError = error

  if (effectiveLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (effectiveError) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h2>Authentication Error</h2>
        <p>{effectiveError.message}</p>
        <p>Check the browser console for more details.</p>
        <details style={{ marginTop: '1rem' }}>
          <summary>Debug Info</summary>
          <pre style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
            {JSON.stringify({
              user: user?.email,
              error: error?.message,
            }, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Routes>
        <Route
          path="/login"
          element={effectiveUser ? <Navigate to="/admin" replace /> : <Login />}
        />
        <Route
          path="/"
          element={effectiveUser ? <Dashboard /> : <Navigate to="/admin/login" replace />}
        />
      </Routes>
    </div>
  )
}

export default AdminApp
