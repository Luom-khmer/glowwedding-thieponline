
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Button } from './Button';

interface LinkGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string; // Link gốc của thiệp (vd: domain.com?invitationId=xyz)
}

export const LinkGeneratorModal: React.FC<LinkGeneratorModalProps> = ({ isOpen, onClose, baseUrl }) => {
  const [guestName, setGuestName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Reset khi mở lại
  useEffect(() => {
    if (isOpen) {
      setGuestName('');
      setGeneratedLink('');
      setIsCopied(false);
    }
  }, [isOpen]);

  const handleGenerate = () => {
    if (!guestName.trim()) return;
    // Tạo link: BaseURL + &guestName=TenKhach
    // Cần xử lý xem baseUrl đã có '?' chưa
    const separator = baseUrl.includes('?') ? '&' : '?';
    const link = `${baseUrl}${separator}guestName=${encodeURIComponent(guestName.trim())}`;
    setGeneratedLink(link);
    setIsCopied(false);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#7d1f2a] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-rose-900"
      >
        {/* Header giống ảnh mẫu */}
        <div className="relative pt-8 pb-4 text-center">
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 text-white/70 hover:text-white p-2"
            >
                <X />
            </button>
            
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center border-4 border-rose-200 mb-3 shadow-lg">
                <LinkIcon className="w-10 h-10 text-[#7d1f2a]" />
            </div>
            
            <h2 className="text-white font-bold text-xl uppercase tracking-wider font-serif">
                Thiệp Cưới Online
            </h2>
            <h3 className="text-rose-200 text-sm font-medium">GLOW WEDDING</h3>
        </div>

        {/* Body Form */}
        <div className="bg-white m-2 rounded-xl p-6 space-y-4">
            <h3 className="text-[#7d1f2a] font-bold text-center uppercase text-sm mb-4">
                Tạo Link Thiệp Theo Tên Khách Mời
            </h3>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Link Thiệp Gốc:</label>
                <input 
                    type="text" 
                    readOnly
                    value={baseUrl}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-500 text-sm outline-none cursor-not-allowed"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tên Khách Mời:</label>
                <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nhập tên khách (VD: Bạn Tuấn Anh)"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#7d1f2a] focus:border-[#7d1f2a] outline-none text-gray-800"
                />
            </div>

            <button 
                onClick={handleGenerate}
                className="w-full bg-[#7d1f2a] hover:bg-[#5e161f] text-white font-bold py-3 rounded uppercase text-sm shadow-md transition-all active:scale-95"
            >
                Tạo Link
            </button>

            {/* Result Box */}
            <div className="border-2 border-dashed border-[#7d1f2a] rounded-lg p-3 min-h-[80px] bg-rose-50/50 flex items-center justify-center text-center relative mt-2">
                {generatedLink ? (
                    <span className="text-sm text-gray-700 break-all font-medium">{generatedLink}</span>
                ) : (
                    <span className="text-sm text-gray-400 italic">Kết quả link sẽ hiện ở đây...</span>
                )}
            </div>

            {generatedLink && (
                <button 
                    onClick={handleCopy}
                    className={`w-full ${isCopied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-800'} text-white font-bold py-3 rounded uppercase text-sm shadow-md transition-all flex items-center justify-center gap-2`}
                >
                    {isCopied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                    {isCopied ? "Đã Copy" : "Copy Link"}
                </button>
            )}
        </div>

        {/* Footer Instructions */}
        <div className="px-6 pb-6 text-white text-xs space-y-2 opacity-90">
             <h4 className="font-bold underline text-center text-sm mb-3">HƯỚNG DẪN SỬ DỤNG</h4>
             <p><strong>Bước 1:</strong> Nhập tên khách mời muốn hiển thị trên thiệp.</p>
             <p><strong>Bước 2:</strong> Bấm nút <strong>TẠO LINK</strong>.</p>
             <p><strong>Bước 3:</strong> Bấm <strong>COPY</strong> và gửi link này cho bạn bè qua Zalo/Messenger.</p>
        </div>

      </motion.div>
    </div>
  );
};
