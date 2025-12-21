import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { config } from '~/config';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper function to create and connect storage instance to emulator
function createStorageInstance(bucket?: string) {
  const instance = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
  
  // Connect to emulator immediately after creation (dev mode only)
  if (import.meta.env.DEV) {
    try {
      connectStorageEmulator(instance, 'localhost', 9199);
      console.log(`✅ Connected storage${bucket ? ` (${bucket})` : ' (default)'} to emulator`);
    } catch (e: unknown) {
      const error = e as { message?: string };
      if (error?.message?.includes('already been called') || error?.message?.includes('already connected')) {
        console.log(`ℹ️  Storage${bucket ? ` (${bucket})` : ' (default)'} already connected to emulator`);
      } else {
        console.warn(`⚠️  Failed to connect storage${bucket ? ` (${bucket})` : ' (default)'} to emulator:`, e);
      }
    }
  }
  
  return instance;
}

// Create storage instances for custom buckets
// Connect to emulator immediately after creation
export const storage = createStorageInstance(); // Default bucket
export const mediaStorage = createStorageInstance(config.mediaBucket);
export const dataStorage = createStorageInstance(config.dataBucket);

export const functions = getFunctions(app, 'us-east1');

// Connect Functions emulator
if (import.meta.env.DEV) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Connected functions to emulator');
  } catch (e: unknown) {
    const error = e as { message?: string };
    if (error?.message?.includes('already been called') || error?.message?.includes('already connected')) {
      console.log('ℹ️  Functions already connected to emulator');
    } else {
      console.warn('⚠️  Failed to connect functions to emulator:', e);
    }
  }
}

export const sendMessage = httpsCallable(functions, 'sendMessage');

// Types for processBatches function
export interface ProcessBatchesRequest {
  batchIds: string[];
}

export interface ProcessBatchesResponse {
  processId: string;
  status: 'complete';
}

// Types for cleanupFailedBatches function
export interface CleanupFailedBatchesRequest {
  batchIds: string[];
}

export interface CleanupFailedBatchesResponse {
  status: 'complete';
  message: string;
}

// Create typed wrapper functions
export const processBatches = async (
  request: ProcessBatchesRequest
): Promise<{ data: ProcessBatchesResponse }> => {
  const callable = httpsCallable(functions, 'processBatches');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const result = await callable(request);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return { data: result.data as ProcessBatchesResponse };
};

export const cleanupFailedBatches = async (
  request: CleanupFailedBatchesRequest
): Promise<{ data: CleanupFailedBatchesResponse }> => {
  const callable = httpsCallable(functions, 'cleanupFailedBatches');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const result = await callable(request);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return { data: result.data as CleanupFailedBatchesResponse };
};
