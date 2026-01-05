
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- HƯỚNG DẪN CẤU HÌNH ---
// 1. Vào console.firebase.google.com -> Project Settings -> General -> Your apps
// 2. Copy config dán vào bên dưới
// 3. Vào Build -> Firestore Database -> Rules: Cập nhật rules để cho phép đọc/ghi

const firebaseConfig = {
  // Thay thế bằng thông tin thật của bạn
  apiKey: "AIzaSyD-YOUR_REAL_API_KEY_HERE", 
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XYZ"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
