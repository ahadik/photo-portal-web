import {onCall} from "firebase-functions/v2/https";
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

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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
 * Reverse geocode coordinates to get a location name using Google Maps
 * Geocoding API.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @return {Promise<string | null>} Location name or null if not found.
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lon}`);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  url.searchParams.set(
    "result_type",
    "locality|administrative_area_level_1|country"
  );

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status: string;
      results?: Array<{
        formatted_address?: string;
      }>;
    };

    console.log("Reverse geocoding response:", data);

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    return data.results[0].formatted_address ?? null;
  } catch (err) {
    return null;
  }
}

/**
 * Append a log entry to a log file in Storage (JSONL format).
 * @param {string} bucketName - The bucket name.
 * @param {string} logFilePath - The log file path.
 * @param {unknown} entry - The log entry object to append.
 * @return {Promise<void>}
 */
async function appendLogEntry(
  bucketName: string,
  logFilePath: string,
  entry: unknown
): Promise<void> {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(logFilePath);

  const [exists] = await file.exists();
  const logLine = JSON.stringify(entry) + "\n";

  if (exists) {
    // Append to existing file
    const [contents] = await file.download();
    const newContents = contents.toString() + logLine;
    await file.save(newContents, {
      contentType: "text/plain",
    });
  } else {
    // Create new file
    await file.save(logLine, {
      contentType: "text/plain",
    });
  }
}

export const processBatches = onCall(
  {
    enforceAppCheck: false,
    region: "us-east1",
    memory: "1GiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async (request) => {
    const batchIds = request.data.batchIds as string[] | undefined;

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      throw new Error("batchIds array is required");
    }

    const processId = uuidv4().replace(/-/g, "");
    const logFilePath = `logs/${processId}.log`;
    const dataBucket = storage.bucket(DATA_BUCKET);
    const mediaBucket = storage.bucket(MEDIA_BUCKET);

    try {
      // Initialize log file with start info
      await appendLogEntry(DATA_BUCKET, logFilePath, {
        type: "start",
        timestamp: new Date().toISOString(),
        batchIds,
      });

      // Count total photos across all batches
      let totalPhotos = 0;
      const photosByBatch: Record<
        string, Array<{path: string; photoId: string}>
      > = {};

      // List all files in each batch
      for (const batchId of batchIds) {
        const uploadsPrefix = `uploads/${batchId}/`;
        const [files] = await mediaBucket.getFiles({prefix: uploadsPrefix});

        // Filter to image files only (jpg, jpeg)
        const imageFiles = files.filter((file) => {
          const name = file.name.toLowerCase();
          return name.endsWith(".jpg") || name.endsWith(".jpeg");
        });

        photosByBatch[batchId] = imageFiles.map((file) => {
          const filename = file.name.split("/").pop() || "";
          // Extract photo ID from filename (remove extension)
          const photoId = filename.replace(/\.(jpg|jpeg)$/i, "");
          return {path: file.name, photoId};
        });

        totalPhotos += photosByBatch[batchId].length;
      }

      // Write initial log entry with total count
      await appendLogEntry(DATA_BUCKET, logFilePath, {
        type: "count",
        totalPhotos,
      });

      // Process each batch sequentially
      for (const batchId of batchIds) {
        const photos = photosByBatch[batchId];

        // Process each photo sequentially
        for (const {path, photoId} of photos) {
          try {
            await appendLogEntry(DATA_BUCKET, logFilePath, {
              type: "processing",
              batchId,
              photoId,
              status: "start",
            });

            // Read current photos.json to check for duplicates
            const photosJson = await readJsonFromBucket<PhotosJson>(
              DATA_BUCKET,
              "photos.json",
              {
                version: 1,
                lastUpdated: new Date().toISOString(),
                photos: [],
              }
            );

            // Check if photo ID already exists
            const existingPhoto = photosJson.photos.find(
              (p) => p.id === photoId
            );
            if (existingPhoto) {
              await appendLogEntry(DATA_BUCKET, logFilePath, {
                type: "skip",
                photoId,
                reason: "duplicate",
              });
              // Delete original photo even if duplicate
              await mediaBucket.file(path).delete({ignoreNotFound: true});
              continue;
            }

            // Download and process photo
            const tempFilePath = `/tmp/${photoId}.jpg`;
            await mediaBucket.file(path).download({destination: tempFilePath});

            // Read EXIF
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
            const resized = image.resize(4096, 4096, {
              fit: "inside",
              withoutEnlargement: true,
            });
            const {width = 0, height = 0} = await resized.metadata();
            const aspectRatio = width && height ? width / height : 1;

            const photoFilename = `photos/${photoId}.jpg`;
            const thumbFilename = `thumbs/${photoId}.jpg`;

            const [photoBuffer, thumbBuffer] = await Promise.all([
              resized.jpeg({quality: 90}).toBuffer(),
              image.resize({width: 400}).jpeg({quality: 80}).toBuffer(),
            ]);

            await Promise.all([
              mediaBucket.file(photoFilename).save(photoBuffer, {
                contentType: "image/jpeg",
              }),
              mediaBucket.file(thumbFilename).save(thumbBuffer, {
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

            // Append to photos.json
            photosJson.photos.push(photoEntry);
            photosJson.lastUpdated = now;
            await writeJsonToBucket(DATA_BUCKET, "photos.json", photosJson);

            // Delete original photo
            await mediaBucket.file(path).delete({ignoreNotFound: true});

            await appendLogEntry(DATA_BUCKET, logFilePath, {
              type: "complete",
              photoId,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ?
              error.message : String(error);
            await appendLogEntry(DATA_BUCKET, logFilePath, {
              type: "error",
              photoId,
              error: errorMessage,
            });
            // Continue with next photo
          }
        }

        // Check if batch directory is empty and delete it
        const uploadsPrefix = `uploads/${batchId}/`;
        const [remainingFiles] = await mediaBucket.getFiles({
          prefix: uploadsPrefix,
        });
        if (remainingFiles.length === 0) {
          // Directory is effectively empty
          await appendLogEntry(DATA_BUCKET, logFilePath, {
            type: "batch_complete",
            batchId,
          });
        }
      }

      // Processing complete - delete log file
      await appendLogEntry(DATA_BUCKET, logFilePath, {
        type: "finish",
        timestamp: new Date().toISOString(),
      });
      await dataBucket.file(logFilePath).delete({ignoreNotFound: true});

      return {processId, status: "complete"};
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ?
        error.message : String(error);
      await appendLogEntry(DATA_BUCKET, logFilePath, {
        type: "error",
        error: errorMessage,
      });
      // Keep log file for debugging
      throw error;
    }
  }
);

export const cleanupFailedBatches = onCall(
  {
    enforceAppCheck: false,
    region: "us-east1",
  },
  async (request) => {
    const batchIds = request.data.batchIds as string[] | undefined;

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      throw new Error("batchIds array is required");
    }

    const mediaBucket = storage.bucket(MEDIA_BUCKET);

    // Delete all photos from failed batches
    for (const batchId of batchIds) {
      const uploadsPrefix = `uploads/${batchId}/`;
      const [files] = await mediaBucket.getFiles({prefix: uploadsPrefix});

      await Promise.all(
        files.map((file) => file.delete().catch(() => {}))
      );
    }

    return {
      status: "complete",
      message: `Cleaned up ${batchIds.length} batch(es)`,
    };
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
