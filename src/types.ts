export interface LocationInfo {
  lat: number
  lon: number
  name: string | null
}

export interface PhotoEntry {
  id: string
  photoUrl: string
  thumbUrl: string
  width: number
  height: number
  aspectRatio: number
  orientation: 'landscape' | 'portrait'
  capturedAt: string | null
  uploadedAt: string
  location: LocationInfo | null
}

export interface PhotosJson {
  version: number
  lastUpdated: string
  photos: PhotoEntry[]
}

export interface MessageEntry {
  id: string
  photoId: string
  text: string
  sentAt: string
}

export interface MessagesJson {
  version: number
  lastUpdated: string
  messages: MessageEntry[]
}
