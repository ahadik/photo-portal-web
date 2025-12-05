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

const storage = new Storage();

export const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'photoportal-media';
export const DATA_BUCKET = process.env.DATA_BUCKET || 'photoportal-data';

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
