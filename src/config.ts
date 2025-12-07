export const config = {
  mediaBucket: import.meta.env.VITE_MEDIA_BUCKET || 'photo-portal-media',
  dataBucket: import.meta.env.VITE_DATA_BUCKET || 'photo-portal-data',
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || '',
  photoSyncInterval: 60000, // 60 seconds
  messageSyncInterval: 30000, // 30 seconds
  slideshowInterval: 10000, // 10 seconds
};

export const getStorageUrl = (bucket: string, path: string) => {
  return `https://storage.googleapis.com/${bucket}/${path}`;
};

export const getPhotosJsonUrl = () => {
  return getStorageUrl(config.dataBucket, 'photos.json');
};

export const getMessagesJsonUrl = () => {
  return getStorageUrl(config.dataBucket, 'messages.json');
};
