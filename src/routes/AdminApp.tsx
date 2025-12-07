import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../services/firebase'
import Login from '../components/admin/Login'
import Dashboard from '../components/admin/Dashboard'

function AdminApp() {
  const [user, loading] = useAuthState(auth)

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
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
