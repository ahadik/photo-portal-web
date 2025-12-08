/**
 * Script to seed the Firebase Storage emulator with initial data.
 *
 * Usage:
 *   npm run seed-emulator
 *
 * This script uploads photos.json and messages.json to the Storage emulator
 * so that the app can work with initial data during local development.
 */

import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import {DATA_BUCKET, PhotosJson, MessagesJson} from "./common";

// Configure Storage to use emulator BEFORE creating Storage instance
// This must be set before any Storage operations
// Note: STORAGE_EMULATOR_HOST must include http:// protocol
process.env.STORAGE_EMULATOR_HOST = "http://localhost:9199";

// Initialize Firebase Admin with emulator settings
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "demo-project",
    storageBucket: DATA_BUCKET,
  });
}

// Create Storage instance (will use emulator due to STORAGE_EMULATOR_HOST)
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT || "demo-project",
});

/**
 * Seeds the Firebase Storage emulator with initial data files.
 */
async function seedEmulator() {
  console.log("🌱 Seeding Firebase Storage emulator...\n");

  const dataBucket = storage.bucket(DATA_BUCKET);

  // Create empty photos.json if it doesn't exist
  const photosJson: PhotosJson = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    photos: [],
  };

  // Create empty messages.json if it doesn't exist
  const messagesJson: MessagesJson = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    messages: [],
  };

  try {
    // Upload photos.json
    const photosFile = dataBucket.file("photos.json");
    await photosFile.save(JSON.stringify(photosJson, null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });
    console.log(`✅ Created photos.json in ${DATA_BUCKET}`);

    // Upload messages.json
    const messagesFile = dataBucket.file("messages.json");
    await messagesFile.save(JSON.stringify(messagesJson, null, 2), {
      contentType: "application/json",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });
    console.log(`✅ Created messages.json in ${DATA_BUCKET}`);

    console.log("\n✨ Emulator seeded successfully!");
    console.log("💡 You can now access photos.json and messages.json.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error seeding emulator:", errorMessage);
    console.error("\n💡 Make sure the Storage emulator is running:");
    console.error("   npm run serve (in functions directory)");
    process.exit(1);
  }
}

// Run the seed function
seedEmulator()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

