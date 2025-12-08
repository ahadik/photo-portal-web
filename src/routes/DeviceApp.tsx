import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { auth } from '../services/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { fetchPhotosIndex } from '../services/api'
import { PhotoEntry } from '../types'
import Slideshow from '../components/device/Slideshow'
import Login from '../components/admin/Login'

function DeviceApp() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)

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

  // Fetch photos once user is authenticated
  useEffect(() => {
    if (!user) return

    async function loadPhotos() {
      try {
        setPhotosLoading(true)
        const photosData = await fetchPhotosIndex()
        setPhotos(photosData.photos || [])
      } catch (err) {
        console.error('Failed to load photos:', err)
        setError(err instanceof Error ? err : new Error('Failed to load photos'))
      } finally {
        setPhotosLoading(false)
      }
    }

    loadPhotos()
  }, [user])

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#000',
        color: '#fff',
        padding: '2rem',
      }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <p>Check the browser console for more details.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Login />
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={
          photosLoading ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000',
              color: '#fff',
              fontSize: '1.5rem',
            }}>
              Loading photos...
            </div>
          ) : (
            <Slideshow photos={photos} />
          )
        } />
      </Routes>
    </div>
  )
}

export default DeviceApp
