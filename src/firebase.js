import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBik2Iow4s3-finXTLpzob8gb0A_hvNIRA",
  authDomain: "musibase-e67ed.firebaseapp.com",
  projectId: "musibase-e67ed",
  storageBucket: "musibase-e67ed.firebasestorage.app",
  messagingSenderId: "659357001842",
  appId: "1:659357001842:web:717b384eb5a0ba8837baeb",
  measurementId: "G-CTCW917VH8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
