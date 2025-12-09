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
if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.STORAGE_EMULATOR_HOST = "http://localhost:9199";
}

const storage = new Storage();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

// Lock file path in Cloud Storage
const LOCK_FILE_PATH = ".photos.json.lock";
const LOCK_CHECK_INTERVAL = 200; // Check every 200ms
const MAX_LOCK_WAIT_TIME = 30000; // Maximum 30 seconds to wait for lock
const LOCK_TIMEOUT = 60000; // Lock expires after 60 seconds (safety mechanism)


/**
 * Generate the correct Storage URL based on environment (emulator vs
 * production).
 * Emulator format: http://localhost:9199/v0/b/{bucket}/o/{path}?alt=media
 * Production format: https://storage.googleapis.com/{bucket}/{path}
 * @param {string} bucket - The storage bucket name.
 * @param {string} path - The file path within the bucket.
 * @return {string} The appropriate Storage URL for the environment.
 */
function getStorageUrl(bucket: string, path: string): string {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
      process.env.STORAGE_EMULATOR_HOST !== undefined;

  if (isEmulator) {
    // Emulator URL format
    const encodedPath = encodeURIComponent(path);
    return `http://localhost:9199/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }

  // Production URL format
  return `https://storage.googleapis.com/${bucket}/${path}`;
}

/**
 * Reverse geocode coordinates to get a location name using Mapbox API.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @return {Promise<string | null>} Location name or null if not found.
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  const url =
    "https://api.mapbox.com/search/geocode/v6/reverse?" +
    `longitude=${lon}8&latitude=${lat}&access_token=${MAPBOX_TOKEN}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const place = data.features?.[0]?.properties?.place_formatted as
      string | undefined;
    return place ?? null;
  } catch (err) {
    return null;
  }
}

/**
 * Checks if photos.json is currently locked by checking for lock file.
 * @return {Promise<boolean>} True if locked, false otherwise.
 */
async function isPhotosJsonLocked(): Promise<boolean> {
  const lockFile = storage.bucket(DATA_BUCKET).file(LOCK_FILE_PATH);
  const [exists] = await lockFile.exists();

  if (!exists) {
    return false;
  }

  // Check if lock has expired (safety mechanism)
  // getMetadata() can throw for network/permission errors, so we catch those
  try {
    const [metadata] = await lockFile.getMetadata();
    const timeCreated = metadata.timeCreated;
    if (!timeCreated) {
      return false;
    }
    const created = new Date(timeCreated).getTime();
    const now = Date.now();

    if (now - created > LOCK_TIMEOUT) {
      console.warn("⚠️ Lock expired, releasing it");
      await unlockPhotosJson();
      return false;
    }

    return true;
  } catch (error) {
    // If we can't get metadata (network error, permission issue, etc.),
    // assume not locked to avoid deadlock
    console.error("Error getting lock metadata:", error);
    return false;
  }
}

/**
 * Waits for photos.json to be unlocked.
 * @return {Promise<void>}
 */
async function waitForUnlock(): Promise<void> {
  const startTime = Date.now();

  while (await isPhotosJsonLocked()) {
    if (Date.now() - startTime > MAX_LOCK_WAIT_TIME) {
      throw new Error("Timeout waiting for photos.json lock");
    }

    // Wait before checking again
    await new Promise((resolve) => setTimeout(resolve, LOCK_CHECK_INTERVAL));
  }
}

/**
 * Acquires the lock for photos.json by creating a lock file.
 * @param {string} lockHolderId - Unique ID for the process holding the lock.
 * @return {Promise<boolean>} True if lock was acquired, false otherwise.
 */
async function lockPhotosJson(lockHolderId: string): Promise<boolean> {
  const lockFile = storage.bucket(DATA_BUCKET).file(LOCK_FILE_PATH);

  // Try to create the lock file atomically - will fail if it already exists
  try {
    await lockFile.save(JSON.stringify({
      lockedBy: lockHolderId,
      lockedAt: new Date().toISOString(),
    }), {
      metadata: {
        contentType: "application/json",
      },
      // ifGenerationMatch: 0 means "only create if file doesn't exist"
      // This makes the operation atomic - if file exists, it will throw 412
      preconditionOpts: {
        ifGenerationMatch: 0,
      },
    });
    return true;
  } catch (error: unknown) {
    // If file already exists (412 PreconditionFailed), check if lock expired
    const err = error as {code?: number | string};
    if (err.code === 412 || err.code === "PreconditionFailed") {
      // File exists, check if expired
      const [exists] = await lockFile.exists();
      if (exists) {
        try {
          const [metadata] = await lockFile.getMetadata();
          const timeCreated = metadata.timeCreated;
          if (timeCreated) {
            const created = new Date(timeCreated).getTime();
            if (Date.now() - created > LOCK_TIMEOUT) {
              // Lock expired, delete it and recursively try again
              // This handles race conditions where multiple processes
              // detect expired lock simultaneously
              await lockFile.delete().catch(() => {});
              // Recursive call - will use ifGenerationMatch: 0 again
              return await lockPhotosJson(lockHolderId);
            }
          }
        } catch {
          // If we can't get metadata, assume lock is valid
          return false;
        }
      }
    }
    return false;
  }
}

/**
 * Releases the lock for photos.json by deleting the lock file.
 * @return {Promise<void>}
 */
async function unlockPhotosJson(): Promise<void> {
  try {
    const lockFile = storage.bucket(DATA_BUCKET).file(LOCK_FILE_PATH);
    await lockFile.delete().catch(() => {
      // Ignore errors if file doesn't exist
    });
  } catch (error) {
    console.error("Error releasing lock:", error);
  }
}

/**
 * Writes a photo entry to photos.json using the locking mechanism.
 * @param {PhotoEntry} newPhotoEntry - The new photo entry to add.
 * @return {Promise<void>}
 */
async function writePhotoToJsonWithLock(
  newPhotoEntry: PhotoEntry
): Promise<void> {
  const lockHolderId = uuidv4();

  // Step 1: Check if locked, wait if needed
  if (await isPhotosJsonLocked()) {
    await waitForUnlock();
  }

  // Step 2: Acquire lock
  let lockAcquired = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!lockAcquired && attempts < maxAttempts) {
    lockAcquired = await lockPhotosJson(lockHolderId);
    if (!lockAcquired) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, LOCK_CHECK_INTERVAL));
      // Re-check if still locked
      if (await isPhotosJsonLocked()) {
        await waitForUnlock();
      }
    }
  }

  if (!lockAcquired) {
    throw new Error(
      "Failed to acquire lock for photos.json after multiple attempts"
    );
  }

  try {
    // Step 3: Retrieve fresh photos.json from store
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

    // Step 4: Update with new photo entry
    const existingIds = new Set(photosJson.photos.map((p) => p.id));

    // Add the new photo entry if not already present
    if (!existingIds.has(newPhotoEntry.id)) {
      photosJson.photos.push(newPhotoEntry);
      photosJson.lastUpdated = now;

      // Step 5: Write the file back
      await writeJsonToBucket(DATA_BUCKET, "photos.json", photosJson);

      console.log("✅ Successfully wrote photo to photos.json");
    } else {
      console.log("ℹ️ Photo already exists in photos.json");
    }
  } finally {
    // Step 6: Unlock the file in state
    await unlockPhotosJson();
  }
}

export const processUpload = onObjectFinalized(
  {
    bucket: MEDIA_BUCKET,
    memory: "1GiB",
    timeoutSeconds: 120,
    region: "us-east1",
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

      // Read EXIF - exifr returns complex EXIF data structure
      const exifData =
        await exifr.parse(tempFilePath).catch(() => null) as
        Record<string, unknown> | null;

      const capturedAt = exifData?.DateTimeOriginal ?
        new Date(exifData.DateTimeOriginal as string).toISOString() :
        null;

      const lat = exifData?.latitude as number | undefined;
      const lon = exifData?.longitude as number | undefined;

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
        bucket.file(photoFilename).save(photoBuffer, {
          contentType: "image/jpeg",
        }),
        bucket.file(thumbFilename).save(thumbBuffer, {
          contentType: "image/jpeg",
        }),
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
        capturedAt,
        uploadedAt: now,
        location:
          typeof lat === "number" && typeof lon === "number" ?
            {lat, lon, name: locationName} :
            null,
      };

      // Write to photos.json using lock mechanism
      await writePhotoToJsonWithLock(photoEntry);

      // Delete original upload
      await bucket.file(filePath).delete({ignoreNotFound: true});
    } catch (error: unknown) {
      console.error("Error in processUpload:", error);
      throw error;
    }
  }
);

export const sendMessage = onCall(
  {
    enforceAppCheck: false,
    region: "us-east1",
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
