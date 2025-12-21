import { PhotoEntry } from '~/types'
import { getPhotoDownloadUrl, getThumbnailDownloadUrl } from './api'

export interface PhotoUrls {
  photoUrl: string
  thumbUrl: string
}

export interface PhotoUrlStore {
  photoUrls: Map<string, PhotoUrls>
  isLoading: boolean
  error: Error | null
}

type StoreUpdateCallback = (store: PhotoUrlStore) => void

class PhotoUrlStoreService {
  private store: PhotoUrlStore = {
    photoUrls: new Map(),
    isLoading: false,
    error: null,
  }

  private listeners: Set<StoreUpdateCallback> = new Set()

  /**
   * Subscribe to store updates
   */
  subscribe(callback: StoreUpdateCallback): () => void {
    this.listeners.add(callback)
    // Immediately call with current state
    callback(this.store)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all listeners of store changes
   */
  private notify(): void {
    this.listeners.forEach(callback => callback(this.store))
  }

  /**
   * Update store and notify listeners
   */
  private updateStore(updates: Partial<PhotoUrlStore>): void {
    this.store = { ...this.store, ...updates }
    this.notify()
  }

  /**
   * Fetch download URLs for all photos (blocking)
   * This should be called on app initialization
   */
  async fetchAllPhotoUrls(photos: PhotoEntry[]): Promise<void> {
    if (photos.length === 0) {
      this.updateStore({
        photoUrls: new Map(),
        isLoading: false,
        error: null,
      })
      return
    }

    this.updateStore({ isLoading: true, error: null })

    try {
      const urlMap = new Map<string, PhotoUrls>()

      // Fetch all URLs in parallel with progress tracking
      const promises = photos.map(async (photo) => {
        try {
          const [photoUrl, thumbUrl] = await Promise.all([
            getPhotoDownloadUrl(photo.id),
            getThumbnailDownloadUrl(photo.id),
          ])
          urlMap.set(photo.id, { photoUrl, thumbUrl })
        } catch (error) {
          console.error(`Failed to load URLs for photo ${photo.id}:`, error)
          // Continue with other photos even if one fails
          // We could optionally store partial data here
        }
      })

      await Promise.all(promises)

      this.updateStore({
        photoUrls: urlMap,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch photo URLs')
      this.updateStore({
        isLoading: false,
        error: errorObj,
      })
      throw errorObj
    }
  }

  /**
   * Fetch download URLs for new photos only (incremental update)
   * Compares current photos with stored URLs and fetches missing ones
   */
  async fetchNewPhotoUrls(photos: PhotoEntry[]): Promise<void> {
    if (photos.length === 0) {
      return
    }

    // Find photos that don't have URLs yet
    const photosToFetch = photos.filter(
      photo => !this.store.photoUrls.has(photo.id)
    )

    if (photosToFetch.length === 0) {
      // All URLs already exist
      return
    }

    // Fetch URLs for new photos only
    const newUrlMap = new Map<string, PhotoUrls>()

    const promises = photosToFetch.map(async (photo) => {
      try {
        const [photoUrl, thumbUrl] = await Promise.all([
          getPhotoDownloadUrl(photo.id),
          getThumbnailDownloadUrl(photo.id),
        ])
        newUrlMap.set(photo.id, { photoUrl, thumbUrl })
      } catch (error) {
        console.error(`Failed to load URLs for photo ${photo.id}:`, error)
        // Continue with other photos even if one fails
      }
    })

    await Promise.all(promises)

    if (newUrlMap.size > 0) {
      // Merge new URLs into existing store
      const updatedMap = new Map(this.store.photoUrls)
      newUrlMap.forEach((urls, photoId) => {
        updatedMap.set(photoId, urls)
      })

      this.updateStore({
        photoUrls: updatedMap,
      })
    }
  }

  /**
   * Get photo URL for a specific photo ID
   */
  getPhotoUrl(photoId: string): string | null {
    return this.store.photoUrls.get(photoId)?.photoUrl || null
  }

  /**
   * Get thumbnail URL for a specific photo ID
   */
  getThumbUrl(photoId: string): string | null {
    return this.store.photoUrls.get(photoId)?.thumbUrl || null
  }

  /**
   * Get both URLs for a specific photo ID
   */
  getUrls(photoId: string): PhotoUrls | null {
    return this.store.photoUrls.get(photoId) || null
  }

  /**
   * Get current store state (for direct access if needed)
   */
  getStore(): PhotoUrlStore {
    return this.store
  }
}

// Export singleton instance
export const photoUrlStore = new PhotoUrlStoreService()
