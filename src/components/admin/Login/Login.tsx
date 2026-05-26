import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth } from '~/services/firebase'

import './Login.css';

interface LoginProps {
  title?: string
}

function Login({ title = 'Photo Portal Admin' }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset loading state if user signs in (auth state changes)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && loading) {
        console.log('✅ Auth state changed - user signed in, resetting loading state')
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('🔐 Attempting sign in...')
      // Add timeout to prevent hanging indefinitely
      const signInPromise = signInWithEmailAndPassword(auth, email, password)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign in request timed out. Please check your network connection and Firebase configuration.')), 10000)
      })

      const userCredential = await Promise.race([signInPromise, timeoutPromise])
      console.log('✅ Sign in successful:', userCredential.user.email)
      // Note: loading will be reset when component unmounts or auth state changes
      // The auth state change should trigger a redirect in AdminApp
    } catch (err: unknown) {
      console.error('❌ Sign in error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className='login'>
      <h1>{title}</h1>
      <p>You must be logged in to access the admin portal.</p>
      
      {error && (
        <div className='login__error'>
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        <div className='input-block'>
          <label htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className='input-block'>
          <label htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#039be5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

export default Login
