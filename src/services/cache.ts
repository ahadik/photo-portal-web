import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { PhotoEntry, MessageEntry } from '../types'

interface PhotoPortalDB extends DBSchema {
  photos: {
    key: string
    value: PhotoEntry
    indexes: { 'by-uploadedAt': string }
  }
  messages: {
    key: string
    value: MessageEntry
    indexes: { 'by-sentAt': string }
  }
  metadata: {
    key: string
    value: {
      likedPhotoIds: string[]
      readMessageIds: string[]
      lastSyncedPhotosAt: string
      lastSyncedMessagesAt: string
      activeLocationFilter: {
        bounds: {
          north: number
          south: number
          east: number
          west: number
        }
        setAt: string
      } | null
    }
  }
}

let dbPromise: Promise<IDBPDatabase<PhotoPortalDB>> | null = null

function getDB(): Promise<IDBPDatabase<PhotoPortalDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PhotoPortalDB>('photo-portal', 1, {
      upgrade(db) {
        const photosStore = db.createObjectStore('photos', { keyPath: 'id' })
        photosStore.createIndex('by-uploadedAt', 'uploadedAt')

        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
        messagesStore.createIndex('by-sentAt', 'sentAt')

        db.createObjectStore('metadata', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function getCachedPhotos(): Promise<PhotoEntry[]> {
  const db = await getDB()
  return db.getAll('photos')
}

export async function cachePhoto(photo: PhotoEntry): Promise<void> {
  const db = await getDB()
  await db.put('photos', photo)
}

export async function cachePhotos(photos: PhotoEntry[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('photos', 'readwrite')
  await Promise.all(photos.map((photo) => tx.store.put(photo)))
  await tx.done
}

export async function getCachedMessages(): Promise<MessageEntry[]> {
  const db = await getDB()
  return db.getAll('messages')
}

export async function cacheMessages(messages: MessageEntry[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('messages', 'readwrite')
  await Promise.all(messages.map((message) => tx.store.put(message)))
  await tx.done
}

export async function getLikedPhotoIds(): Promise<string[]> {
  const db = await getDB()
  const metadata = await db.get('metadata', 'main')
  return metadata?.likedPhotoIds || []
}

export async function toggleLike(photoId: string): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('metadata', 'main')
  const metadata = existing || {
    key: 'main',
    likedPhotoIds: [] as string[],
    readMessageIds: [] as string[],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }

  const index = metadata.likedPhotoIds.indexOf(photoId)
  if (index >= 0) {
    metadata.likedPhotoIds.splice(index, 1)
  } else {
    metadata.likedPhotoIds.push(photoId)
  }

  await db.put('metadata', metadata)
  return index < 0 // Returns true if liked, false if unliked
}

export async function getReadMessageIds(): Promise<string[]> {
  const db = await getDB()
  const metadata = await db.get('metadata', 'main')
  return metadata?.readMessageIds || []
}

export async function markMessageRead(messageId: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('metadata', 'main')
  const metadata = existing || {
    key: 'main',
    likedPhotoIds: [] as string[],
    readMessageIds: [] as string[],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }

  if (!metadata.readMessageIds.includes(messageId)) {
    metadata.readMessageIds.push(messageId)
    await db.put('metadata', metadata)
  }
}

export async function updateLastSyncedPhotosAt(timestamp: string): Promise<void> {
  const db = await getDB()
  const metadata = await db.get('metadata', 'main') || {
    key: 'main',
    likedPhotoIds: [],
    readMessageIds: [],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }
  metadata.lastSyncedPhotosAt = timestamp
  await db.put('metadata', metadata)
}

export async function updateLastSyncedMessagesAt(timestamp: string): Promise<void> {
  const db = await getDB()
  const metadata = await db.get('metadata', 'main') || {
    key: 'main',
    likedPhotoIds: [],
    readMessageIds: [],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }
  metadata.lastSyncedMessagesAt = timestamp
  await db.put('metadata', metadata)
}

/**
 * Initialize read message cache by marking all existing messages as read.
 * This should be called when the cache is first created or wiped.
 * @param messageIds - Array of message IDs to mark as read
 */
export async function initializeReadMessageCache(messageIds: string[]): Promise<void> {
  const db = await getDB()
  const existing = await db.get('metadata', 'main')
  const metadata = existing || {
    key: 'main',
    likedPhotoIds: [] as string[],
    readMessageIds: [] as string[],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }

  // Only initialize if cache is empty (first time or after wipe)
  if (metadata.readMessageIds.length === 0 && messageIds.length > 0) {
    metadata.readMessageIds = [...messageIds]
    await db.put('metadata', metadata)
  }
}

/**
 * Sync read message cache with current messages.
 * If cache is empty, mark all existing messages as read.
 * Otherwise, just ensure the cache includes all existing messages.
 * @param messageIds - Array of all current message IDs
 */
export async function syncReadMessageCache(messageIds: string[]): Promise<void> {
  const db = await getDB()
  const existing = await db.get('metadata', 'main')
  const metadata = existing || {
    key: 'main',
    likedPhotoIds: [] as string[],
    readMessageIds: [] as string[],
    lastSyncedPhotosAt: '',
    lastSyncedMessagesAt: '',
    activeLocationFilter: null,
  }

  // If cache is empty (first time), mark all existing messages as read
  if (metadata.readMessageIds.length === 0 && messageIds.length > 0) {
    metadata.readMessageIds = [...messageIds]
    await db.put('metadata', metadata)
  } else if (metadata.readMessageIds.length > 0) {
    // If cache exists, clean it up by removing IDs that no longer exist
    // (in case messages were deleted on the server)
    metadata.readMessageIds = metadata.readMessageIds.filter((id) => messageIds.includes(id))
    await db.put('metadata', metadata)
  }
}
