// Removed unresolved vite/client type reference
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- HƯỚNG DẪN CẤU HÌNH ---
// 1. Vào console.firebase.google.com -> Project Settings -> General -> Your apps
// 2. Copy config dán vào bên dưới
// 3. Vào Build -> Firestore Database -> Rules: Cập nhật rules để cho phép đọc/ghi
// 4. Vào Build -> Authentication -> Sign-in method -> Bật Google Provider

const firebaseConfig = {
  apiKey: "AIzaSyAPvcz6uQkoFmU4nUmGinDiN_rwTS4eSEs",
  authDomain: "glowwedding-e5f9b.firebaseapp.com",
  projectId: "glowwedding-e5f9b",
  storageBucket: "glowwedding-e5f9b.firebasestorage.app",
  messagingSenderId: "574284120272",
  appId: "1:574284120272:web:a344b3bb05d1cd5ab1ded5",
  measurementId: "G-TCS6LG5RKL"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);