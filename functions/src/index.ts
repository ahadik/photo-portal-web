import {onCall} from "firebase-functions/v2/https";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import sharp from "sharp";
import exifr from "exifr";
import {v4 as uuidv4} from "uuid";
import {Storage} from "@google-cloud/storage";
import {
  MEDIA_BUCKET,
  DATA_BUCKET,
  PhotosJson,
  MessagesJson,
  PhotoEntry,
  MessageEntry,
  readJsonFromBucket,
  writeJsonToBucket,
} from "./common";

admin.initializeApp();

// Configure Storage to use emulator if running in emulator mode
// Firebase Functions emulator sets FUNCTIONS_EMULATOR=true
// Note: STORAGE_EMULATOR_HOST must include http:// protocol
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.STORAGE_EMULATOR_HOST = 'http://localhost:9199';
}

const storage = new Storage();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

function orientationFromAspect(aspectRatio: number): "landscape" | "portrait" {
  return aspectRatio >= 1 ? "landscape" : "portrait";
}

/**
 * Generate the correct Storage URL based on environment (emulator vs production)
 * Emulator format: http://localhost:9199/v0/b/{bucket}/o/{path}?alt=media
 * Production format: https://storage.googleapis.com/{bucket}/{path}
 */
function getStorageUrl(bucket: string, path: string): string {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                     process.env.STORAGE_EMULATOR_HOST !== undefined;
  
  if (isEmulator) {
    // Emulator URL format
    const encodedPath = encodeURIComponent(path);
    return `http://localhost:9199/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }
  
  // Production URL format
  return `https://storage.googleapis.com/${bucket}/${path}`;
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
    console.error("reverseGeocode error", err);
    return null;
  }
}

export const processUpload = onObjectFinalized(
  {
    bucket: MEDIA_BUCKET,
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const filePath = event.data.name;
    const bucketName = event.data.bucket || MEDIA_BUCKET;
    
    if (!filePath || !filePath.startsWith("uploads/")) {
      return;
    }

    try {
      const bucket = storage.bucket(bucketName);
      const tempFilePath = `/tmp/${filePath.split("/").pop()}`;

      // Download original file
      await bucket.file(filePath).download({destination: tempFilePath});

      // Read EXIF
      const exifData: any = await exifr.parse(tempFilePath).catch(() => null);

      const capturedAt = exifData?.DateTimeOriginal
        ? new Date(exifData.DateTimeOriginal).toISOString()
        : null;

      const lat = exifData?.latitude;
      const lon = exifData?.longitude;

      // Process image with sharp
      const image = sharp(tempFilePath).rotate();
      const resized = image.resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      });
      const {width = 0, height = 0} = await resized.metadata();
      const aspectRatio = width && height ? width / height : 1;

      const photoId = uuidv4().replace(/-/g, "");
      const photoFilename = `photos/${photoId}.jpg`;
      const thumbFilename = `thumbs/${photoId}.jpg`;

      const [photoBuffer, thumbBuffer] = await Promise.all([
        resized.jpeg({quality: 90}).toBuffer(),
        image.resize({width: 400}).jpeg({quality: 80}).toBuffer(),
      ]);

      await Promise.all([
        bucket.file(photoFilename).save(photoBuffer, {contentType: "image/jpeg"}),
        bucket.file(thumbFilename).save(thumbBuffer, {contentType: "image/jpeg"}),
      ]);

      let locationName: string | null = null;
      if (typeof lat === "number" && typeof lon === "number") {
        locationName = await reverseGeocode(lat, lon);
      }

      const now = new Date().toISOString();

      const photoEntry: PhotoEntry = {
        id: photoId,
        photoUrl: getStorageUrl(MEDIA_BUCKET, photoFilename),
        thumbUrl: getStorageUrl(MEDIA_BUCKET, thumbFilename),
        width: width || 0,
        height: height || 0,
        aspectRatio,
        orientation: orientationFromAspect(aspectRatio),
        capturedAt,
        uploadedAt: now,
        location:
          typeof lat === "number" && typeof lon === "number"
            ? {lat, lon, name: locationName}
            : null,
      };

      const photosJson = await readJsonFromBucket<PhotosJson>(
        DATA_BUCKET,
        "photos.json",
        {
          version: 1,
          lastUpdated: now,
          photos: [],
        }
      );

      photosJson.photos.push(photoEntry);
      photosJson.lastUpdated = now;

      await writeJsonToBucket(DATA_BUCKET, "photos.json", photosJson);

      // Delete original upload
      await bucket.file(filePath).delete({ignoreNotFound: true});
    } catch (error: any) {
      console.error("Error in processUpload:", error);
      throw error;
    }
  }
);

export const sendMessage = onCall(
  {
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const photoId = request.data.photoId as string | undefined;
    const text = (request.data.text as string | "")?.trim();

    if (!photoId) {
      throw new Error("photoId is required");
    }

    if (!text || text.length === 0 || text.length > 280) {
      throw new Error("text must be 1-280 characters");
    }

    const now = new Date().toISOString();

    const photosJson = await readJsonFromBucket<PhotosJson>(
      DATA_BUCKET,
      "photos.json",
      {
        version: 1,
        lastUpdated: now,
        photos: [],
      }
    );

    const photoExists = photosJson.photos.some((p) => p.id === photoId);
    if (!photoExists) {
      throw new Error("Photo does not exist");
    }

    const messagesJson = await readJsonFromBucket<MessagesJson>(
      DATA_BUCKET,
      "messages.json",
      {
        version: 1,
        lastUpdated: now,
        messages: [],
      }
    );

    const messageId = uuidv4().replace(/-/g, "");

    const message: MessageEntry = {
      id: messageId,
      photoId,
      text,
      sentAt: now,
    };

    messagesJson.messages.push(message);
    messagesJson.lastUpdated = now;

    await writeJsonToBucket(DATA_BUCKET, "messages.json", messagesJson);

    return message;
  }
);
