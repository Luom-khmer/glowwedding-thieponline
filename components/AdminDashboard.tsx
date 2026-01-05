
import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { Button } from './Button';
import { Shield, User as UserIcon, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { UserRole } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await userService.getAllUsers();
      setUsers(list);
    } catch (error) {
      console.error("Lỗi tải danh sách user:", error);
      alert("Không thể tải danh sách người dùng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, currentRole: string) => {
    // Logic xoay vòng: user -> editor -> admin -> user
    let newRole: UserRole = 'user';
    if (currentRole === 'user') newRole = 'editor';
    else if (currentRole === 'editor') newRole = 'admin';
    else newRole = 'user';

    const confirmMsg = `Bạn có chắc muốn đổi quyền của user này thành "${newRole}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userService.updateUserRole(uid, newRole);
      // Cập nhật state cục bộ để UI phản hồi ngay
      setUsers(users.map(u => u.id === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Lỗi cập nhật quyền:", error);
      alert("Cập nhật thất bại.");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" /> Admin</span>;
      case 'editor':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Editor</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><UserIcon className="w-3 h-3 mr-1" /> User</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản Trị Hệ Thống</h1>
            <p className="text-gray-500 mt-1">Quản lý người dùng và phân quyền truy cập.</p>
          </div>
          <Button variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Danh sách người dùng ({users.length})</h3>
            <Button size="sm" onClick={loadUsers} variant="ghost">Làm mới</Button>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên / Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò hiện tại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tham gia</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold">
                             {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || 'Không tên'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role || 'user')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleRoleChange(user.id, user.role || 'user')}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                        >
                          Đổi quyền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center"><Shield className="w-4 h-4 mr-2"/> Ghi chú phân quyền:</h4>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li><strong>User:</strong> Chỉ có thể xem trang chủ, xem bảng giá. Không thể vào trang Tạo Thiệp.</li>
                <li><strong>Editor:</strong> Có quyền truy cập đầy đủ vào trình tạo thiệp, lưu thiệp và quản lý đơn hàng.</li>
                <li><strong>Admin:</strong> Có toàn quyền Editor + Quyền truy cập trang quản lý này để cấp quyền cho người khác.</li>
            </ul>
        </div>

      </div>
    </div>
  );
};
