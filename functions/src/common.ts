import { Storage } from '@google-cloud/storage';

export interface LocationInfo {
  lat: number;
  lon: number;
  name: string | null;
}

export interface PhotoEntry {
  id: string;
  photoUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait';
  capturedAt: string | null;
  uploadedAt: string;
  location: LocationInfo | null;
}

export interface PhotosJson {
  version: number;
  lastUpdated: string;
  photos: PhotoEntry[];
}

export interface MessageEntry {
  id: string;
  photoId: string;
  text: string;
  sentAt: string;
}

export interface MessagesJson {
  version: number;
  lastUpdated: string;
  messages: MessageEntry[];
}

// Configure Storage to use emulator in development
// The emulator is detected automatically if STORAGE_EMULATOR_HOST is set
// or if running in emulator context
// Note: STORAGE_EMULATOR_HOST must include http:// protocol
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
  // Ensure http:// prefix is included
  process.env.STORAGE_EMULATOR_HOST = emulatorHost.startsWith('http') 
    ? emulatorHost 
    : `http://${emulatorHost}`;
}

const storage = new Storage();

export const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'photo-portal-media';
export const DATA_BUCKET = process.env.DATA_BUCKET || 'photo-portal-data';

export async function readJsonFromBucket<T>(
  bucketName: string,
  filePath: string,
  fallback: T
): Promise<T> {
  const file = storage.bucket(bucketName).file(filePath);
  const [exists] = await file.exists();
  if (!exists) {
    return fallback;
  }
  const [contents] = await file.download();
  return JSON.parse(contents.toString()) as T;
}

export async function writeJsonToBucket<T>(
  bucketName: string,
  filePath: string,
  data: T
): Promise<void> {
  const file = storage.bucket(bucketName).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

