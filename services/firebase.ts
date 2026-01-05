
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CẤU HÌNH CỦA BẠN (Dán thông tin từ Bước 5 vào đây) ---
const firebaseConfig = {
  apiKey: "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY",
  authDomain: "PROJECT_ID_CỦA_BẠN.firebaseapp.com",
  projectId: "PROJECT_ID_CỦA_BẠN",
  storageBucket: "PROJECT_ID_CỦA_BẠN.firebasestorage.app",
  messagingSenderId: "SỐ_ID_CỦA_BẠN",
  appId: "APP_ID_CỦA_BẠN"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
