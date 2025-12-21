import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { photoUrlStore, PhotoUrlStore, PhotoUrls } from '~/services/photoUrlStore'

interface PhotoUrlContextValue {
  photoUrls: Map<string, PhotoUrls>
  isLoading: boolean
  error: Error | null
  getPhotoUrl: (photoId: string) => string | null
  getThumbUrl: (photoId: string) => string | null
  getUrls: (photoId: string) => PhotoUrls | null
}

const PhotoUrlContext = createContext<PhotoUrlContextValue | null>(null)

interface PhotoUrlProviderProps {
  children: ReactNode
}

/**
 * PhotoUrlProvider makes the photo URL store available to all child components.
 * Components can use usePhotoUrls() hook to access photo URLs.
 */
export function PhotoUrlProvider({ children }: PhotoUrlProviderProps) {
  const [store, setStore] = useState<PhotoUrlStore>(photoUrlStore.getStore())

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = photoUrlStore.subscribe((newStore) => {
      setStore(newStore)
    })

    return unsubscribe
  }, [])

  const value: PhotoUrlContextValue = {
    photoUrls: store.photoUrls,
    isLoading: store.isLoading,
    error: store.error,
    getPhotoUrl: (photoId: string) => photoUrlStore.getPhotoUrl(photoId),
    getThumbUrl: (photoId: string) => photoUrlStore.getThumbUrl(photoId),
    getUrls: (photoId: string) => photoUrlStore.getUrls(photoId),
  }

  return (
    <PhotoUrlContext.Provider value={value}>
      {children}
    </PhotoUrlContext.Provider>
  )
}

/**
 * Hook to access photo URLs from context
 * @throws Error if used outside PhotoUrlProvider
 */
export function usePhotoUrls(): PhotoUrlContextValue {
  const context = useContext(PhotoUrlContext)
  if (!context) {
    throw new Error('usePhotoUrls must be used within PhotoUrlProvider')
  }
  return context
}
