import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '~/services/firebase'

export interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

/**
 * Subscribe to Firebase auth state. Returns the current user (or null), a
 * loading flag that's true until the first onAuthStateChanged fires, and any
 * error reported by Firebase.
 */
export function useAuthUser(): AuthState {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [loading, setLoading] = useState(auth.currentUser === null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser)
        setError(null)
        setLoading(false)
      },
      (authError) => {
        console.error('Auth error:', authError)
        setError(authError)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  return { user, loading, error }
}
