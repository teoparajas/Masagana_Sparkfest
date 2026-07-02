// src/services/firebaseConfig.js
// Firebase project configuration.
// All sensitive values pulled from .env.local — never hardcoded here.
// Share only .env.example with teammates, never .env.local
console.log("API KEY:", import.meta.env.VITE_FIREBASE_API_KEY);

import { initializeApp }  from "firebase/app";
import { getFirestore }   from "firebase/firestore";
import { getAuth }        from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// initialize Firebase app — this runs once at module load
const app = initializeApp(firebaseConfig);

// export the services your app uses
export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;