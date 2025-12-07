import { ref, getBytes } from 'firebase/storage';
import { dataStorage } from './firebase';
import { PhotosJson, MessagesJson } from '../types';

let photosEtag: string | null = null;
let messagesEtag: string | null = null;

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
