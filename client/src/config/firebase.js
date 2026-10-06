// Firebase Client Configuration for CampXChange
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate that environment configuration is present
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase configuration missing! Please ensure VITE_FIREBASE_* variables are set in your client .env file.");
}

// Initialize Firebase app singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication with Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Safe async getter for Firebase Cloud Messaging
export const getFirebaseMessaging = async () => {
  try {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && 'Notification' in window) {
      const { getMessaging, isSupported } = await import("firebase/messaging");
      const supported = await isSupported();
      if (supported) {
        return getMessaging(app);
      }
    }
  } catch (err) {
    console.debug("Firebase Messaging initialization check skipped/unsupported:", err);
  }
  return null;
};

export default app;
