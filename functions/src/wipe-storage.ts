/**
 * Script to wipe all content from Firebase Storage (resets app to blank slate).
 *
 * Usage:
 *   npm run reset
 *
 * This script:
 * - Deletes all files from the media bucket (photos, thumbs, uploads, logs)
 * - Deletes all files from the data bucket (photos.json, messages.json, logs)
 * - Resets photos.json and messages.json to empty state
 *
 * Works with both emulator and production environments.
 * For production, requires proper Firebase authentication.
 * Requires user confirmation before proceeding.
 */

import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import * as readline from "readline";
import {
  MEDIA_BUCKET,
  DATA_BUCKET,
  PhotosJson,
  MessagesJson,
} from "./common";

// Configure Storage to use emulator if running in emulator mode
// Firebase Functions emulator sets FUNCTIONS_EMULATOR=true
if (
  process.env.FUNCTIONS_EMULATOR === "true" ||
  process.env.FIREBASE_STORAGE_EMULATOR_HOST
) {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    "localhost:9199";
  // Ensure http:// prefix is included
  process.env.STORAGE_EMULATOR_HOST = emulatorHost.startsWith("http") ?
    emulatorHost :
    `http://${emulatorHost}`;
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "demo-project",
  });
}

// Create Storage instance
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT || "demo-project",
});

/**
 * Prompts the user for confirmation.
 * @param {string} question - The question to ask the user.
 * @return {Promise<boolean>} True if user confirms, false otherwise.
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "yes" || normalized === "y");
    });
  });
}

/**
 * Counts files in a storage bucket.
 * @param {string} bucketName - The name of the bucket to count files in.
 * @return {Promise<number>} The number of files in the bucket.
 */
async function countFiles(bucketName: string): Promise<number> {
  const bucket = storage.bucket(bucketName);
  try {
    const [files] = await bucket.getFiles();
    return files.length;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to count files in ${bucketName}: ${errorMessage}`);
  }
}

/**
 * Deletes all files from a storage bucket.
 * @param {string} bucketName - The name of the bucket to clear.
 * @return {Promise<number>} The number of files deleted.
 */
async function deleteAllFiles(bucketName: string): Promise<number> {
  const bucket = storage.bucket(bucketName);
  let deletedCount = 0;

  try {
    // List all files in the bucket
    const [files] = await bucket.getFiles();

    if (files.length === 0) {
      console.log(`   No files found in ${bucketName}`);
      return 0;
    }

    console.log(`   Found ${files.length} file(s) in ${bucketName}`);

    // Delete files in batches to avoid overwhelming the API
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file) => {
          try {
            await file.delete();
            deletedCount++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ?
              error.message : String(error);
            console.warn(
              `   ⚠️  Failed to delete ${file.name}: ${errorMessage}`
            );
          }
        })
      );
    }

    return deletedCount;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to delete files from ${bucketName}: ${errorMessage}`
    );
  }
}

/**
 * Resets photos.json and messages.json to empty state.
 */
async function resetJsonFiles() {
  const dataBucket = storage.bucket(DATA_BUCKET);

  const photosJson: PhotosJson = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    photos: [],
  };

  const messagesJson: MessagesJson = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    messages: [],
  };

  try {
    // Reset photos.json
    const photosFile = dataBucket.file("photos.json");
    await photosFile.save(JSON.stringify(photosJson, null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });
    console.log(`✅ Reset photos.json in ${DATA_BUCKET}`);

    // Reset messages.json
    const messagesFile = dataBucket.file("messages.json");
    await messagesFile.save(JSON.stringify(messagesJson, null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });
    console.log(`✅ Reset messages.json in ${DATA_BUCKET}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reset JSON files: ${errorMessage}`);
  }
}

/**
 * Main function to wipe all storage content.
 */
async function wipeStorage() {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.STORAGE_EMULATOR_HOST !== undefined;

  console.log("🗑️  Firebase Storage Reset Script\n");
  console.log(`Environment: ${isEmulator ? "Emulator" : "Production"}\n`);

  try {
    // Count files in each bucket to show what will be deleted
    console.log("📊 Checking storage buckets...\n");
    const mediaCount = await countFiles(MEDIA_BUCKET);
    const dataCount = await countFiles(DATA_BUCKET);

    console.log("⚠️  WARNING: This will permanently delete ALL content!\n");
    console.log("The following will be deleted:");
    console.log(`   - ${MEDIA_BUCKET}: ${mediaCount} file(s)`);
    console.log(`   - ${DATA_BUCKET}: ${dataCount} file(s)`);
    console.log(
      "   - photos.json and messages.json will be reset to empty state\n"
    );

    // Ask for confirmation
    const confirmed = await askConfirmation(
      "Are you sure you want to proceed? Type 'yes' to confirm: "
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled. No files were deleted.");
      process.exit(0);
    }

    console.log("\n🗑️  Proceeding with deletion...\n");

    // Delete all files from media bucket
    console.log(`📦 Clearing ${MEDIA_BUCKET} bucket...`);
    const mediaDeleted = await deleteAllFiles(MEDIA_BUCKET);
    console.log(`   ✅ Deleted ${mediaDeleted} file(s) from ${MEDIA_BUCKET}\n`);

    // Delete all files from data bucket
    console.log(`📦 Clearing ${DATA_BUCKET} bucket...`);
    const dataDeleted = await deleteAllFiles(DATA_BUCKET);
    console.log(`   ✅ Deleted ${dataDeleted} file(s) from ${DATA_BUCKET}\n`);

    // Reset JSON files to empty state
    console.log("📝 Resetting JSON files...");
    await resetJsonFiles();
    console.log();

    console.log("✨ Storage wiped successfully!");
    console.log("💡 The app is now reset to a blank slate.");
    console.log(`   - ${MEDIA_BUCKET}: ${mediaDeleted} file(s) deleted`);
    console.log(`   - ${DATA_BUCKET}: ${dataDeleted} file(s) deleted`);
    console.log("   - photos.json and messages.json reset to empty state");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error wiping storage:", errorMessage);
    console.error("\n💡 For emulator, make sure it's running:");
    console.error("   npm run serve (in functions directory)");
    console.error("\n💡 For production, make sure you're authenticated:");
    console.error("   firebase login");
    process.exit(1);
  }
}

// Run the wipe function
wipeStorage()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

