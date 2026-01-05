
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

// Danh sách email được mặc định là Admin (Super Admin)
const SUPER_ADMINS = ['danhluom68g1@gmail.com'];

export const userService = {
  // Đồng bộ user khi đăng nhập: Nếu chưa có thì tạo mới, nếu có thì trả về role hiện tại
  syncUser: async (firebaseUser: any): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const email = firebaseUser.email || '';

    if (userSnap.exists()) {
      const userData = userSnap.data();
      let currentRole = userData.role || 'user';

      // TỰ ĐỘNG NÂNG QUYỀN ADMIN NẾU LÀ SUPER ADMIN
      if (SUPER_ADMINS.includes(email) && currentRole !== 'admin') {
          console.log(`Auto-upgrading ${email} to Admin`);
          currentRole = 'admin';
          await updateDoc(userRef, { role: 'admin' });
      }

      return {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: email,
        picture: firebaseUser.photoURL || '',
        role: currentRole
      };
    } else {
      // Logic cho User mới
      const usersCol = collection(db, 'users');
      const allUsers = await getDocs(usersCol);
      
      // Mặc định là 'user', trừ khi là người đầu tiên HOẶC nằm trong danh sách SUPER_ADMINS
      let initialRole: UserRole = allUsers.empty ? 'admin' : 'user';

      if (SUPER_ADMINS.includes(email)) {
          initialRole = 'admin';
      }

      const newUser: User = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: email,
        picture: firebaseUser.photoURL || '',
        role: initialRole
      };

      await setDoc(userRef, {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: new Date().toISOString()
      });

      return newUser;
    }
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
