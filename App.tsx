
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Menu, X, ArrowRight, User as UserIcon, LogOut, FolderHeart, Save, Heart, ShieldCheck, Lock, Shield, Loader2, Link as LinkIcon } from 'lucide-react';
import { Template, ViewState, TEMPLATES, InvitationData, User, SavedInvitation } from './types';
import { Button } from './components/Button';
import { Preview } from './components/Preview';
import { Pricing } from './components/Pricing';
import { FloatingPetals } from './components/FloatingPetals';
import { GuestManager } from './components/GuestManager';
import { TemplateRedGold } from './components/TemplateRedGold';
import { TemplatePersonalized } from './components/TemplatePersonalized';
import { AdminDashboard } from './components/AdminDashboard';
import { LinkGeneratorModal } from './components/LinkGeneratorModal';
import { userService } from './services/userService';
import { invitationService } from './services/invitationService';

// Firebase Imports
import { auth, googleProvider } from './services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const initialData: InvitationData = {
  groomName: 'Anh Tú',
  groomFather: 'Ông Cấn Văn An',
  groomMother: 'Bà Nguyễn Thị Hải',
  brideName: 'Diệu Nhi',
  brideFather: 'Ông Trần Văn A',
  brideMother: 'Bà Nguyễn Thị B',
  date: '2025-02-15',
  time: '10:00',
  location: 'The ADORA Center',
  address: '431 Hoàng Văn Thụ, Phường 4, Tân Bình, Hồ Chí Minh',
  message: 'Hân hạnh được đón tiếp quý khách đến chung vui cùng gia đình chúng tôi.',
  imageUrl: 'https://statics.pancake.vn/web-media/ab/56/c3/d2/ae46af903d624877e4e71b00dc5ab4badaa10a8956d3c389ccbc73e9-w:1080-h:1620-l:151635-t:image/jpeg.jpeg',
  mapUrl: 'https://maps.google.com', 
  mapImageUrl: 'https://statics.pancake.vn/web-media/f9/98/70/54/59b84c281bf331dc5baccfb671f74826f2cc248fe6459e58d0fd17bc-w:1200-h:1200-l:51245-t:image/png.png',
  qrCodeUrl: 'https://statics.pancake.vn/web-media/e2/bc/35/38/dc2d9ddf74d997785eb0c802bd3237a50de1118e505f1e0a89ae4ec1-w:592-h:1280-l:497233-t:image/png.png',
  bankInfo: 'MBBANK - NGUYEN TAN DAT\n8838683860',
  musicUrl: 'https://statics.pancake.vn/web-media/5e/ee/bf/4a/afa10d3bdf98ca17ec3191ebbfd3c829d135d06939ee1f1b712d731d-w:0-h:0-l:2938934-t:audio/mpeg.mp3',
  googleSheetUrl: '',
  centerImage: 'https://statics.pancake.vn/web-media/e2/8c/c5/37/905dccbcd5bc1c1b602c10c95acb9986765f735e075bff1097e7f457-w:736-h:981-l:47868-t:image/jpeg.jfif',
  footerImage: 'https://statics.pancake.vn/web-media/ad/c0/11/16/06080e040619cef49e87d7e06a574eb61310d3dc4bdc9f0fec3638c9-w:854-h:1280-l:259362-t:image/jpeg.png',
  albumImages: [
      'https://statics.pancake.vn/web-media/e9/80/6a/05/fcf14d0545da0e656237816d3712c50d2792afda074a96abfd9bcec5-w:878-h:1280-l:99344-t:image/jpeg.png',
      'https://statics.pancake.vn/web-media/09/00/8a/b4/692735fdc0775ae1530963a767ce4264df77078f659771a3cde9c5ac-w:840-h:1280-l:177736-t:image/jpeg.png',
      'https://statics.pancake.vn/web-media/84/b3/f5/cd/cc7957b9f0e497f01a17d05f9e73406b7650b249c169b424c7ee1767-w:854-h:1280-l:94691-t:image/jpeg.png',
      'https://statics.pancake.vn/web-media/60/b1/5e/e9/89fd2d2d6cd9a62db6e70776243eb9ed8603fc1fb415bdc95da92104-w:1286-h:857-l:255701-t:image/jpeg.jpg',
      'https://statics.pancake.vn/web-media/7a/e8/d6/f6/da197a5a3542dfe09e7faa9e118999103385582808a2e2014fc72986-w:1286-h:988-l:154700-t:image/jpeg.jpg'
  ],
  galleryImages: [
      'https://statics.pancake.vn/web-media/21/54/83/cb/163b4872b6600196d0ac068b1f046c5dd5f9d20c3ddad5e7c0abea9b-w:736-h:980-l:48194-t:image/jpeg.jfif',
      'https://statics.pancake.vn/web-media/3c/3b/ca/e1/e12ca0e6af675d653327f5a3b5d2c7c2385f71d26b8fee7604b45828-w:1706-h:2560-l:224512-t:image/jpeg.jpg',
      'https://statics.pancake.vn/web-media/6f/2b/71/1d/03a457a718b5bf78c5639d6de0521b7a19ec698dcd5737408a50bd16-w:1707-h:2560-l:275640-t:image/jpeg.jpg'
  ],
  lunarDate: '(Tức Ngày 18 Tháng 01 Năm Ất Tỵ)',
  groomAddress: 'Quận 8, TP. Hồ Chí Minh',
  brideAddress: 'Quận 8, TP. Hồ Chí Minh',
  elementStyles: {}
};

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<InvitationData>(initialData);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  
  // State for Saving Flow
  const [savedInvitations, setSavedInvitations] = useState<SavedInvitation[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [pendingSaveData, setPendingSaveData] = useState<InvitationData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for Editing
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for Guest View
  const [viewingInvitation, setViewingInvitation] = useState<SavedInvitation | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  
  // State for Personalized Link Generation
  const [guestNameFromUrl, setGuestNameFromUrl] = useState<string>('');
  const [isLinkGeneratorOpen, setIsLinkGeneratorOpen] = useState(false);

  // Role Helpers
  const canEdit = user ? (user.role === 'admin' || user.role === 'editor') : false;
  const isAdmin = user ? user.role === 'admin' : false;

  // --- EFFECT: LOAD INVITATION FROM URL (FOR GUESTS OR TOOL) ---
  useEffect(() => {
      const checkUrlForInvitation = async () => {
          const searchParams = new URLSearchParams(window.location.search);
          const invitationId = searchParams.get('invitationId');
          const guestName = searchParams.get('guestName');
          const mode = searchParams.get('mode'); // Check mode (vd: tool)

          if (guestName) {
              setGuestNameFromUrl(guestName);
          }

          if (invitationId) {
              setIsLoadingInvitation(true);
              const inv = await invitationService.getInvitationById(invitationId);
              
              if (inv) {
                  setViewingInvitation(inv);
                  
                  // Nếu mode là 'tool' -> Chuyển sang giao diện tool cho dâu rể dùng
                  if (mode === 'tool') {
                      setView('tool-generator');
                  } else {
                      setView('guest-view');
                  }
              } else {
                  alert("Không tìm thấy thiệp mời này hoặc đã bị xóa!");
                  window.history.pushState({}, '', '/');
                  setView('home');
              }
              setIsLoadingInvitation(false);
          }
      };

      checkUrlForInvitation();
  }, []);

  // --- EFFECT: LOAD SAVED INVITATIONS (FOR ADMIN) ---
  useEffect(() => {
      if (canEdit && view === 'guest-manager') {
          loadInvitations();
      }
  }, [canEdit, view]);

  const loadInvitations = async () => {
      const list = await invitationService.getAllInvitations();
      setSavedInvitations(list);
  }

  // Handlers
  const handleStart = () => setView('templates');
  
  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    // Nếu đang không edit (tạo mới), reset form về mặc định
    if (!editingId) {
       setFormData(initialData);
    }
    setView('preview');
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
        setUser(null);
        setView('home');
        setIsMenuOpen(false);
    } catch (error) {
        console.error("Logout Error:", error);
    }
  };

  const handleFirebaseLogin = async () => {
    setIsLoadingAuth(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const syncedUser = await userService.syncUser(result.user);
        setUser(syncedUser);
        setView('home');
    } catch (error: any) {
        console.error("Login Error:", error);
        
        // Handle Specific Config Errors
        if (error.code === 'auth/network-request-failed') {
             alert("🔴 LỖI KẾT NỐI (Network Request Failed)\n\nKhông thể kết nối đến Firebase. Vui lòng kiểm tra:\n1. Kết nối mạng của bạn.\n2. Tên miền Vercel đã được thêm vào Authorized Domains trên Firebase Console chưa?\n3. Config trong services/firebase.ts có chính xác không?");
        } else if (error.code === 'auth/api-key-not-valid-please-pass-a-valid-api-key') {
             alert("🔴 LỖI API KEY\n\nAPI Key trong cấu hình không hợp lệ.");
        } else {
             alert("Đăng nhập thất bại: " + error.message);
        }
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const handleSelectPlan = (plan: string) => {
    alert(`Bạn đã chọn gói ${plan}. Hệ thống thanh toán đang được tích hợp.`);
  }
  
  const handleSaveRequest = (newData: InvitationData) => {
    if (!canEdit) {
        alert("Bạn không có quyền lưu thiệp này.");
        return;
    }

    const dataToSave = { ...newData };
    if (selectedTemplate) {
        dataToSave.style = selectedTemplate.style;
    }

    setPendingSaveData(dataToSave);
    if (editingId) {
        const existingInv = savedInvitations.find(i => i.id === editingId);
        if (existingInv) setSaveNameInput(existingInv.customerName);
    } else {
        setSaveNameInput("");
    }
    setIsSaveModalOpen(true); 
  };

  const confirmSaveGuest = async () => {
    if (!saveNameInput.trim()) {
        alert("Vui lòng nhập tên khách hàng hoặc tên dự án!");
        return;
    }
    if (!pendingSaveData || !user) return;

    setIsSaving(true);
    try {
        if (editingId) {
            await invitationService.updateInvitation(editingId, saveNameInput, pendingSaveData);
            alert("Cập nhật thành công!");
        } else {
            await invitationService.createInvitation(saveNameInput, pendingSaveData, user.email);
            alert("Đã lưu thiệp thành công! Link chia sẻ đã sẵn sàng.");
        }
        
        setIsSaveModalOpen(false);
        setEditingId(null);
        setPendingSaveData(null);
        setView('guest-manager');
        loadInvitations(); 
    } catch (e: any) {
        console.error("Save Error:", e);
        if (e.code === 'permission-denied') {
             alert("🔴 LỖI: KHÔNG CÓ QUYỀN GHI DỮ LIỆU (Permission Denied)\n\nNguyên nhân: Bạn chưa dán đoạn code 'Luật Bảo Mật' vào Firebase Console.\n\nCách sửa: Hãy copy đoạn code tôi vừa gửi và dán vào Tab 'Rules' trên Firebase Console của bạn.");
        } else if (e.message && (e.message.includes("API key") || e.code === "auth/api-key-not-valid-please-pass-a-valid-api-key")) {
             alert("🔴 LỖI: API KEY KHÔNG HỢP LỆ\n\nNguyên nhân: Bạn chưa thay API Key của riêng bạn vào file code.\n\nCách sửa: Mở file 'services/firebase.ts' và dán API Key lấy từ Project Settings.");
        } else if (e.code === 'auth/network-request-failed') {
             alert("🔴 LỖI KẾT NỐI\n\nKiểm tra lại config Firebase, có thể bạn đang dùng ID dự án giả.");
        } else {
             alert("Lỗi khi lưu thiệp: " + e.message);
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
      try {
        await invitationService.deleteInvitation(id);
        setSavedInvitations(prev => prev.filter(inv => inv.id !== id));
      } catch (e) {
          alert("Lỗi xóa thiệp.");
      }
  };
  
  const handleViewAsGuest = (inv: SavedInvitation) => {
      setViewingInvitation(inv);
      setView('guest-view');
  };

  const handleEditInvitation = (inv: SavedInvitation) => {
      setFormData(inv.data);
      setEditingId(inv.id);
      const temp = TEMPLATES.find(t => t.style === inv.data.style) || TEMPLATES[0]; 
      setSelectedTemplate(temp);
      setView('preview');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            try {
                const syncedUser = await userService.syncUser(currentUser);
                setUser(syncedUser);
            } catch (e) {
                console.error("Error syncing user on reload", e);
                setUser({
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'User',
                    email: currentUser.email || '',
                    picture: currentUser.photoURL || '',
                    role: 'user' 
                });
            }
        } else {
            setUser(null);
        }
    });
    return () => unsubscribe();
  }, []);

  const Header = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-rose-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center cursor-pointer gap-2" 
            onClick={() => setView('home')}
          >
            <div className="relative">
                 <Camera className="h-8 w-8 text-gray-900" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col justify-center">
                 <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 leading-none mb-0.5">Wedding</span>
                 <span className="text-2xl font-bold text-gray-900 tracking-[0.1em] leading-none font-sans">GLOW</span>
            </div>
          </div>
          
          <div className="hidden md:flex space-x-8 items-center">
            <button onClick={() => { setEditingId(null); setView('templates'); }} className="text-gray-600 hover:text-rose-500 transition font-medium">Mẫu Thiệp</button>

            {canEdit && (
                <>
                    <button onClick={() => setView('guest-manager')} className="text-gray-600 hover:text-rose-500 transition flex items-center gap-1 font-medium">
                        <FolderHeart className="w-4 h-4" /> Đơn Hàng
                    </button>
                </>
            )}
            
            {isAdmin && (
                <button onClick={() => setView('admin-dashboard')} className="text-purple-600 hover:text-purple-800 transition flex items-center gap-1 font-bold bg-purple-50 px-3 py-1 rounded-full">
                    <Shield className="w-4 h-4" /> Admin
                </button>
            )}

            <button onClick={() => setView('pricing')} className="text-gray-600 hover:text-rose-500 transition">Bảng Giá</button>
            
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                 <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-rose-200" />
                 <div className="flex flex-col text-left">
                     <span className="text-sm font-medium text-gray-700 leading-none">{user.name}</span>
                     <span className="text-[10px] text-gray-500 uppercase">{user.role}</span>
                 </div>
                 <button onClick={handleLogout} title="Đăng xuất" className="text-gray-400 hover:text-rose-500 ml-2">
                    <LogOut className="w-4 h-4" />
                 </button>
              </div>
            ) : (
              <Button variant="primary" icon={<UserIcon className="w-4 h-4" />} onClick={() => setView('login')}>Đăng Nhập</Button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            {user && (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-rose-200" />
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-lg"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {user && (
                 <div className="py-3 px-4 text-rose-600 font-medium border-b border-gray-50 mb-2">Xin chào, {user.name} ({user.role})</div>
              )}
              
              <button onClick={() => { setEditingId(null); setView('templates'); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-rose-50 text-gray-700 font-medium">Mẫu Thiệp</button>

              {canEdit && (
                <>
                    <button onClick={() => { setView('guest-manager'); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-rose-50 text-gray-700 font-medium">Quản Lý Đơn Hàng</button>
                </>
              )}
              
              {isAdmin && (
                  <button onClick={() => { setView('admin-dashboard'); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg bg-purple-50 text-purple-700 font-bold">Quản Trị Hệ Thống</button>
              )}

              <button onClick={() => { setView('pricing'); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-rose-50 text-gray-700">Bảng Giá</button>
              
              {user ? (
                 <button onClick={handleLogout} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-red-50 text-red-600 mt-2 border-t border-gray-100">Đăng Xuất</button>
              ) : (
                 <button onClick={() => { setView('login'); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg bg-rose-500 text-white font-medium shadow-md mt-2">Đăng Nhập</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );

  // Loading Screen for Guest View & Tool View
  if (isLoadingInvitation) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-rose-50">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Đang tải thiệp mời...</p>
              </div>
          </div>
      );
  }

  // --- TOOL GENERATOR VIEW (Dành cho Dâu Rể tự tạo link) ---
  if (view === 'tool-generator' && viewingInvitation) {
     return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
             <LinkGeneratorModal 
                isOpen={true}
                onClose={() => setView('guest-view')} // Nút đóng sẽ chuyển sang xem thiệp
                baseUrl={window.location.origin + window.location.pathname + '?invitationId=' + viewingInvitation.id}
                isStandalone={true}
             />
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-rose-50/50 font-sans text-slate-800 overflow-x-hidden selection:bg-rose-200">
      
      {/* Only show Header if NOT in Guest View */}
      {view !== 'guest-view' && <Header />}
      
      {view !== 'guest-view' && <FloatingPetals />}

      {/* SAVE PROJECT MODAL */}
      <AnimatePresence>
        {isSaveModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                >
                    <button onClick={() => setIsSaveModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X />
                    </button>
                    <div className="text-center mb-6">
                        <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Save className="text-rose-600 w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{editingId ? "Cập Nhật Thiệp" : "Lưu Mẫu Thiệp"}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {editingId ? "Lưu lại các thay đổi của bạn." : "Lưu lại mẫu thiết kế này để lấy link chia sẻ."}
                        </p>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tên Khách Hàng / Dự Án</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            placeholder="Ví dụ: Đám cưới Minh Nhật - Thanh Thảo..."
                            value={saveNameInput}
                            onChange={(e) => setSaveNameInput(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <Button className="w-full" onClick={confirmSaveGuest} isLoading={isSaving}>
                        {editingId ? "Cập nhật" : "Lưu & Tạo Link"}
                    </Button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
      
      {/* GENERATE PERSONAL LINK MODAL (FOR ADMIN/EDITOR USE IN GUEST VIEW) */}
      <AnimatePresence>
          {isLinkGeneratorOpen && viewingInvitation && (
             <LinkGeneratorModal 
                isOpen={isLinkGeneratorOpen}
                onClose={() => setIsLinkGeneratorOpen(false)}
                baseUrl={window.location.origin + window.location.pathname + '?invitationId=' + viewingInvitation.id}
             />
          )}
      </AnimatePresence>

      <main className={`${view !== 'guest-view' ? 'pt-16' : ''} min-h-screen relative`}>
        <AnimatePresence mode="wait">
          
          {/* HOME VIEW */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center relative z-10"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="inline-block py-1 px-3 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold tracking-wider mb-6">
                  SỐ 1 VIỆT NAM VỀ THIỆP CƯỚI ONLINE KHMER - VIỆT
                </span>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 text-slate-900 leading-tight">
                  Trao gửi yêu thương <br />
                  <span className="script-font text-7xl md:text-9xl text-rose-500 block mt-2">Ngày chung đôi</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Tạo thiệp cưới đẹp lung linh chỉ trong vài phút. 
                  {canEdit 
                    ? " Quản lý danh sách khách hàng và thiết kế chuyên nghiệp."
                    : " Xem các mẫu thiệp mới nhất ngay hôm nay."
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleStart} className="text-lg px-8 py-4 shadow-xl shadow-rose-200/50">
                    {canEdit ? "Tạo Thiệp Ngay" : "Xem Mẫu Ngay"} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* TEMPLATES VIEW */}
          {view === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="px-4 py-12 max-w-7xl mx-auto z-10 relative"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 serif">Chọn Mẫu Thiệp</h2>
                <p className="text-gray-600">Những thiết kế được yêu thích nhất mùa cưới năm nay.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {TEMPLATES.map((t) => (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -10 }}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer group border border-gray-100 relative"
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden">
                      <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                      
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="bg-white text-rose-600 px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition">
                                {canEdit ? (editingId ? "Đổi sang mẫu này" : "Chọn mẫu này") : "Xem chi tiết"}
                            </span>
                        </div>
                      
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-bold text-lg text-gray-800">{t.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">{t.style}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PREVIEW VIEW */}
          {view === 'preview' && selectedTemplate && (
            <Preview 
                key="preview"
                data={formData} 
                template={selectedTemplate} 
                onBack={() => setView('templates')}
                onSave={handleSaveRequest} 
                readonly={!canEdit} 
            />
          )}

          {/* GUEST MANAGER VIEW (PROTECTED) */}
          {view === 'guest-manager' && canEdit && (
              <motion.div
                key="guest-manager"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                  <GuestManager 
                    invitations={savedInvitations} 
                    onDelete={handleDeleteInvitation}
                    onCreateNew={() => { setEditingId(null); setView('templates'); }}
                    onView={handleViewAsGuest}
                    onEdit={handleEditInvitation}
                  />
              </motion.div>
          )}

          {/* ADMIN DASHBOARD VIEW (ADMIN ONLY) */}
          {view === 'admin-dashboard' && isAdmin && (
              <motion.div
                  key="admin-dashboard"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <AdminDashboard onBack={() => setView('home')} />
              </motion.div>
          )}

          {/* REAL GUEST VIEW SIMULATION */}
          {view === 'guest-view' && viewingInvitation && (
             <motion.div 
                key="guest-view-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-screen bg-black flex items-center justify-center relative"
             >
                {/* Chỉ hiển thị nút đóng nếu là Editor đang xem thử (CHƯA CÓ ID), khách thật (CÓ ID) sẽ không thấy nút này */}
                {canEdit && !window.location.search.includes('invitationId') && (
                    <button 
                        onClick={() => setView('guest-manager')}
                        className="fixed top-4 left-4 z-[9999] bg-white/20 hover:bg-white/40 text-white rounded-full p-2 backdrop-blur-md transition-all"
                        title="Đóng chế độ khách xem"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}
                
                {/* TOOL: Nút Tạo Link Cá Nhân Hóa (CHỈ HIỆN CHO ADMIN/EDITOR VÀ KHI KHÔNG PHẢI LÀ LINK CHIA SẺ TRỰC TIẾP) */}
                {canEdit && !window.location.search.includes('invitationId') && (
                    <button 
                        onClick={() => setIsLinkGeneratorOpen(true)}
                        className="fixed bottom-20 left-4 z-[9999] bg-[#7d1f2a]/90 hover:bg-[#7d1f2a] text-white rounded-full p-3 shadow-lg backdrop-blur-md transition-all flex items-center gap-2 pr-4 border border-rose-300"
                        title="Tạo link mời riêng"
                    >
                        <LinkIcon className="w-5 h-5 animate-pulse" />
                        <span className="text-xs font-bold uppercase">Tạo Link Mời</span>
                    </button>
                )}

                <div className="w-full h-full bg-white max-w-[420px] mx-auto shadow-2xl relative overflow-y-auto">
                     {viewingInvitation.data.centerImage ? (
                        <TemplateRedGold 
                            data={viewingInvitation.data} 
                            readonly={true} 
                            invitationId={viewingInvitation.id}
                            guestName={guestNameFromUrl} // Truyền tên khách từ URL
                        />
                     ) : (
                        <TemplatePersonalized 
                            data={viewingInvitation.data} 
                            readonly={true} 
                            invitationId={viewingInvitation.id}
                            guestName={guestNameFromUrl} // Truyền tên khách từ URL
                        />
                     )}
                </div>
             </motion.div>
          )}


          {/* PRICING VIEW */}
          {view === 'pricing' && (
             <motion.div
             key="pricing"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             >
                <Pricing onSelectPlan={handleSelectPlan} />
             </motion.div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
             <motion.div 
             key="login"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 relative z-10"
           >
             <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-amber-300"></div>
                
                <h2 className="text-2xl font-bold text-center mb-2 serif text-gray-900">Đăng Nhập Hệ Thống</h2>
                <p className="text-gray-500 mb-8 text-sm">Đăng nhập để xác định quyền hạn (Admin / Editor / User).</p>
                
                <button 
                  onClick={handleFirebaseLogin}
                  disabled={isLoadingAuth}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium shadow-sm hover:bg-gray-50 hover:shadow transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoadingAuth ? (
                     <span className="w-5 h-5 border-2 border-gray-300 border-t-rose-500 rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      <span>Tiếp tục với Google</span>
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-gray-400">
                   <ShieldCheck className="w-3 h-3" /> Bảo mật bởi Google Firebase
                </div>
                
                <button onClick={() => setView('home')} className="block w-full text-center mt-6 text-sm text-gray-500 hover:text-rose-500 transition">
                    Quay lại trang chủ
                </button>
             </div>
           </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
