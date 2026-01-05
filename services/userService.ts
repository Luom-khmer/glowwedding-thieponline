
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

// Danh sách email được mặc định là Admin (Super Admin) - Đã thêm email của bạn
const SUPER_ADMINS = ['danhluom68g1@gmail.com'];

export const userService = {
  // Đồng bộ user khi đăng nhập
  syncUser: async (firebaseUser: any): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const email = firebaseUser.email || '';

    // Logic xác định role
    let role: UserRole = 'user';

    // 1. Kiểm tra nếu là Super Admin -> Luôn luôn là Admin (Ghi đè quyền cũ nếu có)
    if (SUPER_ADMINS.includes(email)) {
        role = 'admin';
    } else if (userSnap.exists()) {
        // 2. Nếu user thường đã tồn tại, lấy role từ DB
        const userData = userSnap.data();
        role = userData.role || 'user';
    } else {
        // 3. Nếu là user mới tinh, kiểm tra xem có phải user đầu tiên của hệ thống không
        const usersCol = collection(db, 'users');
        const allUsers = await getDocs(usersCol);
        if (allUsers.empty) {
            role = 'admin';
        }
    }

    const userDataToSave = {
        email: email,
        name: firebaseUser.displayName || 'User',
        role: role,
        lastLogin: new Date().toISOString()
    };
    
    // Nếu user chưa tồn tại thì thêm createdAt
    if (!userSnap.exists()) {
        Object.assign(userDataToSave, { createdAt: new Date().toISOString() });
    }

    // Dùng setDoc với merge: true để cập nhật thông tin và quyền mới nhất
    await setDoc(userRef, userDataToSave, { merge: true });

    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: email,
      picture: firebaseUser.photoURL || '',
      role: role
    };
  },

  // Lấy danh sách tất cả user (Chỉ dành cho Admin)
  getAllUsers: async (): Promise<any[]> => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Cập nhật quyền hạn (Chỉ dành cho Admin)
  updateUserRole: async (uid: string, newRole: UserRole) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role: newRole });
  }
};
