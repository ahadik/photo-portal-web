import { getPhotosJsonUrl, getMessagesJsonUrl } from '../config'
import { PhotosJson, MessagesJson } from '../types'

let photosEtag: string | null = null
let messagesEtag: string | null = null

export async function fetchPhotosIndex(): Promise<PhotosJson> {
  const headers: HeadersInit = {}
  if (photosEtag) {
    headers['If-None-Match'] = photosEtag
  }

  const response = await fetch(getPhotosJsonUrl(), { headers })
  
  if (response.status === 304) {
    throw new Error('NOT_MODIFIED')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch photos: ${response.statusText}`)
  }

  const etag = response.headers.get('ETag')
  if (etag) {
    photosEtag = etag
  }

  return response.json()
}

export async function fetchMessagesIndex(): Promise<MessagesJson> {
  const headers: HeadersInit = {}
  if (messagesEtag) {
    headers['If-None-Match'] = messagesEtag
  }

  const response = await fetch(getMessagesJsonUrl(), { headers })
  
  if (response.status === 304) {
    throw new Error('NOT_MODIFIED')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`)
  }

  const etag = response.headers.get('ETag')
  if (etag) {
    messagesEtag = etag
  }

  return response.json()
}
