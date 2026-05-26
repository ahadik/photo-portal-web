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
   * Resolve download URLs for the given photos in parallel. Failures are
   * logged and skipped so one bad photo doesn't break the rest.
   */
  private async resolveUrls(photos: PhotoEntry[]): Promise<Map<string, PhotoUrls>> {
    const resolved = new Map<string, PhotoUrls>()
    await Promise.all(photos.map(async (photo) => {
      try {
        const [photoUrl, thumbUrl] = await Promise.all([
          getPhotoDownloadUrl(photo.id),
          getThumbnailDownloadUrl(photo.id),
        ])
        resolved.set(photo.id, { photoUrl, thumbUrl })
      } catch (error) {
        console.error(`Failed to load URLs for photo ${photo.id}:`, error)
      }
    }))
    return resolved
  }

  /**
   * Fetch download URLs for all photos (blocking, replaces any cached URLs).
   * Use on app initialization or when the entire photo set may have changed.
   */
  async fetchAllPhotoUrls(photos: PhotoEntry[]): Promise<void> {
    if (photos.length === 0) {
      this.updateStore({ photoUrls: new Map(), isLoading: false, error: null })
      return
    }

    this.updateStore({ isLoading: true, error: null })

    try {
      const urlMap = await this.resolveUrls(photos)
      this.updateStore({ photoUrls: urlMap, isLoading: false, error: null })
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch photo URLs')
      this.updateStore({ isLoading: false, error: errorObj })
      throw errorObj
    }
  }

  /**
   * Fetch URLs for any photos not already in the store; leaves existing entries
   * untouched. Use for incremental updates while the slideshow keeps running.
   */
  async fetchNewPhotoUrls(photos: PhotoEntry[]): Promise<void> {
    const photosToFetch = photos.filter(photo => !this.store.photoUrls.has(photo.id))
    if (photosToFetch.length === 0) return

    const newUrls = await this.resolveUrls(photosToFetch)
    if (newUrls.size === 0) return

    const merged = new Map(this.store.photoUrls)
    newUrls.forEach((urls, photoId) => merged.set(photoId, urls))
    this.updateStore({ photoUrls: merged })
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
