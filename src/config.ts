export const config = {
  mediaBucket: import.meta.env.VITE_MEDIA_BUCKET || 'photo-portal-media',
  dataBucket: import.meta.env.VITE_DATA_BUCKET || 'photo-portal-data',
  // Mapbox public access token for client-side map rendering only
  // This should be a separate public token with URL restrictions (different from server-side MAPBOX_TOKEN)
  // The server-side MAPBOX_TOKEN is used for geocoding and other billed features and should NOT be exposed
  mapboxPublicToken: import.meta.env.VITE_MAPBOX_TOKEN || '',
  photoSyncInterval: 60000, // 60 seconds
  messageSyncInterval: 30000, // 30 seconds
  slideshowInterval: 10000, // 10 seconds
  messageDisplayDuration: 60000, // 60 seconds - how long to show a message overlay
};

// Keep URL generation for images (can use direct URLs or getDownloadURL from Firebase Storage SDK)
export const getStorageUrl = (bucket: string, path: string) => {
  return `https://storage.googleapis.com/${bucket}/${path}`;
};

// Helper functions for photo URLs (for use in img tags)
export const getPhotoUrl = (photoId: string) => {
  return getStorageUrl(config.mediaBucket, `photos/${photoId}.jpg`);
};

export const getThumbUrl = (photoId: string) => {
  return getStorageUrl(config.mediaBucket, `thumbs/${photoId}.jpg`);
};

// Legacy functions for backward compatibility (deprecated - use Firebase Storage SDK instead)
export const getPhotosJsonUrl = () => {
  return getStorageUrl(config.dataBucket, 'photos.json');
};

export const getMessagesJsonUrl = () => {
  return getStorageUrl(config.dataBucket, 'messages.json');
};
