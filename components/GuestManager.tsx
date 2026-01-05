
import React from 'react';
import { motion } from 'framer-motion';
import { SavedInvitation } from '../types';
import { Copy, Trash2, ExternalLink, FolderOpen, Eye } from 'lucide-react';
import { Button } from './Button';

interface GuestManagerProps {
  invitations: SavedInvitation[];
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onView: (invitation: SavedInvitation) => void; // New Prop
}

export const GuestManager: React.FC<GuestManagerProps> = ({ invitations, onDelete, onCreateNew, onView }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép link mẫu thiệp: ' + text);
  };

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-800 serif">Quản Lý Đơn Hàng</h2>
           <p className="text-gray-500">Danh sách các mẫu thiệp đã thiết kế cho khách hàng.</p>
        </div>
        <Button onClick={onCreateNew}>+ Tạo Mẫu Mới</Button>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Chưa có đơn hàng nào</h3>
            <p className="text-gray-500 mb-6">Hãy thiết kế một mẫu thiệp và lưu lại cho khách hàng đầu tiên.</p>
            <Button variant="outline" onClick={onCreateNew}>Chọn Mẫu Ngay</Button>
        </div>
      ) : (
        <div className="grid gap-4">
            {invitations.map((inv) => (
                <motion.div 
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg text-rose-700">{inv.customerName}</span>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{inv.createdAt}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                             Dâu rể: {inv.data.groomName} & {inv.data.brideName}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 overflow-hidden">
                             <ExternalLink className="w-3 h-3 flex-shrink-0" />
                             <span className="truncate">{inv.link}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => onView(inv)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition"
                            title="Xem như khách mời"
                        >
                            <Eye className="w-4 h-4" /> Xem
                        </button>
                        <button 
                            onClick={() => copyToClipboard(inv.link)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-medium transition"
                            title="Copy link"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                if(window.confirm('Bạn có chắc muốn xóa đơn hàng này không?')) onDelete(inv.id);
                            }}
                            className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Xóa đơn hàng"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
      )}
    </div>
  );
};
