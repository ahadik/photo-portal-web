import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  // These will be auto-injected by Firebase Hosting
  // For local dev, you may need to add them manually
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const sendMessage = httpsCallable(functions, 'sendMessage');
