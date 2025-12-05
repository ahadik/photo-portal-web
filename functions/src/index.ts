import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sharp from 'sharp';
import exifr from 'exifr';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import {
  MEDIA_BUCKET,
  DATA_BUCKET,
  PhotosJson,
  MessagesJson,
  PhotoEntry,
  MessageEntry,
  readJsonFromBucket,
  writeJsonToBucket,
} from './common';

admin.initializeApp();
const storage = new Storage();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

function orientationFromAspect(aspectRatio: number): 'landscape' | 'portrait' {
  return aspectRatio >= 1 ? 'landscape' : 'portrait';
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const place = data.features?.[0]?.place_name as string | undefined;
    return place ?? null;
  } catch (err) {
    console.error('reverseGeocode error', err);
    return null;
  }
}

export const processUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    if (!filePath) return;
    if (!filePath.startsWith('uploads/')) return;

    const bucket = storage.bucket(object.bucket || MEDIA_BUCKET);
    const tempFilePath = `/tmp/${filePath.split('/').pop()}`;

    // Download original file
    await bucket.file(filePath).download({ destination: tempFilePath });

    // Read EXIF
    const exifData: any = await exifr.parse(tempFilePath).catch(() => null);

    const capturedAt = exifData?.DateTimeOriginal
      ? new Date(exifData.DateTimeOriginal).toISOString()
      : null;

    const lat = exifData?.latitude;
    const lon = exifData?.longitude;

    // Process image with sharp
    const image = sharp(tempFilePath).rotate();
    const resized = image.resize(2048, 2048, { fit: 'inside', withoutEnlargement: true });
    const { width = 0, height = 0 } = await resized.metadata();
    const aspectRatio = width && height ? width / height : 1;

    const photoId = uuidv4().replace(/-/g, '');
    const photoFilename = `photos/${photoId}.jpg`;
    const thumbFilename = `thumbs/${photoId}.jpg`;

    const [photoBuffer, thumbBuffer] = await Promise.all([
      resized.jpeg({ quality: 90 }).toBuffer(),
      image
        .resize({ width: 400 })
        .jpeg({ quality: 80 })
        .toBuffer(),
    ]);

    await Promise.all([
      bucket.file(photoFilename).save(photoBuffer, { contentType: 'image/jpeg' }),
      bucket.file(thumbFilename).save(thumbBuffer, { contentType: 'image/jpeg' }),
    ]);

    let locationName: string | null = null;
    if (typeof lat === 'number' && typeof lon === 'number') {
      locationName = await reverseGeocode(lat, lon);
    }

    const now = new Date().toISOString();

    const photoEntry: PhotoEntry = {
      id: photoId,
      photoUrl: `https://storage.googleapis.com/${MEDIA_BUCKET}/${photoFilename}`,
      thumbUrl: `https://storage.googleapis.com/${MEDIA_BUCKET}/${thumbFilename}`,
      width: width || 0,
      height: height || 0,
      aspectRatio,
      orientation: orientationFromAspect(aspectRatio),
      capturedAt,
      uploadedAt: now,
      location:
        typeof lat === 'number' && typeof lon === 'number'
          ? { lat, lon, name: locationName }
          : null,
    };

    const photosJson = await readJsonFromBucket<PhotosJson>(DATA_BUCKET, 'photos.json', {
      version: 1,
      lastUpdated: now,
      photos: [],
    });

    photosJson.photos.push(photoEntry);
    photosJson.lastUpdated = now;

    await writeJsonToBucket(DATA_BUCKET, 'photos.json', photosJson);

    // Delete original upload
    await bucket.file(filePath).delete({ ignoreNotFound: true });
  });

export const sendMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const photoId = data.photoId as string | undefined;
  const text = (data.text as string | '')?.trim();

  if (!photoId) {
    throw new functions.https.HttpsError('invalid-argument', 'photoId is required');
  }

  if (!text || text.length === 0 || text.length > 280) {
    throw new functions.https.HttpsError('invalid-argument', 'text must be 1-280 characters');
  }

  const now = new Date().toISOString();

  const photosJson = await readJsonFromBucket<PhotosJson>(DATA_BUCKET, 'photos.json', {
    version: 1,
    lastUpdated: now,
    photos: [],
  });

  const photoExists = photosJson.photos.some((p) => p.id === photoId);
  if (!photoExists) {
    throw new functions.https.HttpsError('failed-precondition', 'Photo does not exist');
  }

  const messagesJson = await readJsonFromBucket<MessagesJson>(DATA_BUCKET, 'messages.json', {
    version: 1,
    lastUpdated: now,
    messages: [],
  });

  const messageId = uuidv4().replace(/-/g, '');

  const message: MessageEntry = {
    id: messageId,
    photoId,
    text,
    sentAt: now,
  };

  messagesJson.messages.push(message);
  messagesJson.lastUpdated = now;

  await writeJsonToBucket(DATA_BUCKET, 'messages.json', messagesJson);

  return message;
});
