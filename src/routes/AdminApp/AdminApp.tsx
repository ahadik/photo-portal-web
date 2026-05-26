import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthUser } from '~/hooks/useAuthUser'
import { config } from '~/config'
import Login from '~/components/admin/Login'
import Dashboard from '~/components/admin/Dashboard'
import WrongAccount from '~/components/WrongAccount'

function AdminApp() {
  const { user, loading, error } = useAuthUser()

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
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

  // Block users signed in with the wrong account before they hit a Storage
  // permission error. Skipped if VITE_ADMIN_EMAIL is unset (server rules still apply).
  if (user && config.adminEmail && user.email !== config.adminEmail) {
    return <WrongAccount expected="admin" actualEmail={user.email} />
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/admin" replace /> : <Login />}
        />
        <Route
          path="/"
          element={user ? <Dashboard /> : <Navigate to="/admin/login" replace />}
        />
      </Routes>
    </div>
  )
}

export default AdminApp
