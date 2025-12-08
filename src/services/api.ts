import { ref, getBytes, getDownloadURL } from 'firebase/storage';
import { dataStorage, mediaStorage } from './firebase';
import { PhotosJson, MessagesJson } from '../types';

export async function fetchPhotosIndex(): Promise<PhotosJson> {
  const fileRef = ref(dataStorage, 'photos.json');
  
  try {
    const bytes = await getBytes(fileRef);
    const text = new TextDecoder().decode(bytes);
    const data = JSON.parse(text) as PhotosJson;
    return data;
  } catch (error: any) {
    // Handle 404 / object not found errors gracefully
    // Firebase SDK may return different error codes depending on context
    if (
      error.code === 'storage/object-not-found' ||
      error.code === 'storage/unauthorized' ||
      error.message?.includes('404') ||
      error.message?.includes('Not Found')
    ) {
      // Return empty structure if file doesn't exist
      console.log('📝 photos.json not found in emulator, returning empty structure');
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        photos: [],
      };
    }
    throw new Error(`Failed to fetch photos: ${error.message}`);
  }
}

export async function fetchMessagesIndex(): Promise<MessagesJson> {
  const fileRef = ref(dataStorage, 'messages.json');
  
  try {
    const bytes = await getBytes(fileRef);
    const text = new TextDecoder().decode(bytes);
    const data = JSON.parse(text) as MessagesJson;
    return data;
  } catch (error: any) {
    // Handle 404 / object not found errors gracefully
    // Firebase SDK may return different error codes depending on context
    if (
      error.code === 'storage/object-not-found' ||
      error.code === 'storage/unauthorized' ||
      error.message?.includes('404') ||
      error.message?.includes('Not Found')
    ) {
      // Return empty structure if file doesn't exist
      console.log('📝 messages.json not found in emulator, returning empty structure');
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        messages: [],
      };
    }
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }
}

/**
 * Get an authenticated download URL for a photo using Firebase Storage SDK.
 * This function handles authentication automatically and works with both
 * emulator and production environments.
 * @param photoId - The photo ID (without file extension)
 * @returns Promise resolving to the authenticated download URL
 */
export async function getPhotoDownloadUrl(photoId: string): Promise<string> {
  try {
    const photoRef = ref(mediaStorage, `photos/${photoId}.jpg`);
    return await getDownloadURL(photoRef);
  } catch (error: any) {
    if (
      error.code === 'storage/object-not-found' ||
      error.code === 'storage/unauthorized'
    ) {
      throw new Error(`Photo not found or access denied: ${photoId}`);
    }
    throw new Error(`Failed to get photo URL: ${error.message}`);
  }
}

/**
 * Get an authenticated download URL for a thumbnail using Firebase Storage SDK.
 * @param photoId - The photo ID (without file extension)
 * @returns Promise resolving to the authenticated download URL
 */
export async function getThumbnailDownloadUrl(photoId: string): Promise<string> {
  try {
    const thumbRef = ref(mediaStorage, `thumbs/${photoId}.jpg`);
    return await getDownloadURL(thumbRef);
  } catch (error: any) {
    if (
      error.code === 'storage/object-not-found' ||
      error.code === 'storage/unauthorized'
    ) {
      throw new Error(`Thumbnail not found or access denied: ${photoId}`);
    }
    throw new Error(`Failed to get thumbnail URL: ${error.message}`);
  }
}
