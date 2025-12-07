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
  const metadata = await db.get('metadata', 'main') || {
    key: 'main',
    likedPhotoIds: [],
    readMessageIds: [],
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
  const metadata = await db.get('metadata', 'main') || {
    key: 'main',
    likedPhotoIds: [],
    readMessageIds: [],
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
