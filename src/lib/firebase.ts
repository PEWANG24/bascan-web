import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD5XTFsBJPcM_IYEG9aRmu_0I_cBW8794w",
  authDomain: "manaal-ba.firebaseapp.com",
  projectId: "manaal-ba",
  storageBucket: "manaal-ba.firebasestorage.app",
  messagingSenderId: "1007001652349",
  appId: "1:1007001652349:web:bascan-web-app" // Web app ID for BA SCAN web portal
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
