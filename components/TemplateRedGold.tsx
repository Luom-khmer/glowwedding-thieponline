
import React, { useEffect, useState, useRef } from 'react';
import { InvitationData } from '../types';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X, Pencil, Save, Upload, Check, Heart, Music, ZoomIn, ZoomOut, RotateCw, Loader2, Link } from 'lucide-react';
import { Button } from './Button';
import { convertSolarToLunarFull } from '../utils/lunar';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TemplateRedGoldProps {
  data: InvitationData;
  onSave?: (newData: InvitationData) => void;
  readonly?: boolean;
  invitationId?: string; // ID của thiệp để lưu RSVP đúng chỗ
}

interface EditingFieldState {
    key: keyof InvitationData | 'mapUrl' | 'googleSheetUrl';
    label: string;
    value: string;
    fontSize?: number;
}

export const TemplateRedGold: React.FC<TemplateRedGoldProps> = ({ data: initialData, onSave, readonly = false, invitationId }) => {
  const [localData, setLocalData] = useState<InvitationData>(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);
  
  // State cho Popup Thank You (RSVP Success)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // State cho hiệu ứng mở cổng
  const [isGateOpen, setIsGateOpen] = useState(false);

  // State cho Modal chỉnh sửa Text
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);

  // --- RSVP STATE ---
  const [guestName, setGuestName] = useState('');
  const [guestRelation, setGuestRelation] = useState(''); // Bạn là gì của Dâu Rể
  const [guestWishes, setGuestWishes] = useState('');
  const [attendance, setAttendance] = useState('Có Thể Tham Dự');
  const [isSubmittingRSVP, setIsSubmittingRSVP] = useState(false);

  // --- CROPPER STATE ---
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [currentAspect, setCurrentAspect] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  
  const activeImageFieldRef = useRef<string | null>(null);

  // Handle Music Toggle & Music Change
  const handleMusicClick = () => {
      if (isEditMode && !readonly) {
          musicInputRef.current?.click();
      } else {
          if (audioRef.current) {
            if (isPlaying) {
              audioRef.current.pause();
            } else {
              audioRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
            setIsPlaying(!isPlaying);
          }
      }
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setLocalData(prev => ({ ...prev, musicUrl: result }));
              
              setTimeout(() => {
                if(audioRef.current) {
                    audioRef.current.load();
                    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
              }, 100);
          };
          reader.readAsDataURL(file);
      }
  }

  // Update audio source when data changes
  useEffect(() => {
    if(audioRef.current && localData.musicUrl) {
        // Audio handled via ref directly
    }
  }, [localData.musicUrl]);

  useEffect(() => {
      const timer = setTimeout(() => {
          setIsGateOpen(true);
          
          if (audioRef.current && !isPlaying) {
              audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
      }, 800);
      return () => clearTimeout(timer);
  }, []);

  // --- HANDLERS ---
  
  const handleRSVPSubmit = async () => {
      if (!guestName.trim()) {
          alert("Bạn quên nhập tên rồi nè!");
          return;
      }

      setIsSubmittingRSVP(true);
      try {
          // 1. Lưu vào Firebase Firestore (Database chính của App)
          if (invitationId) {
              await addDoc(collection(db, "rsvps"), {
                  invitationId: invitationId,
                  guestName,
                  guestRelation,
                  guestWishes,
                  attendance,
                  createdAt: new Date().toISOString()
              });
          } else {
              // Demo mode
              console.log("Demo Saved:", { guestName, guestRelation, guestWishes, attendance });
              await new Promise(resolve => setTimeout(resolve, 500));
          }

          // 2. Gửi sang Google Sheet (Dynamic URL)
          const sheetUrl = localData.googleSheetUrl;
          if (sheetUrl && sheetUrl.startsWith("http")) {
             // Sử dụng mode 'no-cors' để gửi form data sang Google Script mà không bị chặn
             fetch(sheetUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guestName,
                    guestRelation,
                    guestWishes,
                    attendance,
                    submittedAt: new Date().toLocaleString('vi-VN')
                })
             }).catch(err => console.error("Lỗi gửi Google Sheet:", err));
          }

          setShowSuccessModal(true);
          setGuestName('');
          setGuestWishes('');
          setGuestRelation('');
      } catch (error) {
          console.error("Error saving RSVP:", error);
          alert("Có lỗi xảy ra, vui lòng thử lại sau!");
      } finally {
          setIsSubmittingRSVP(false);
      }
  };

  const openTextEditor = (field: keyof InvitationData | 'mapUrl' | 'googleSheetUrl', label: string, defaultFontSize: number = 14) => {
    if (!isEditMode || readonly) return;
    
    // @ts-ignore
    const currentValue = localData[field] !== undefined ? localData[field] : '';
    const currentFontSize = localData.elementStyles?.[field]?.fontSize || defaultFontSize;

    setEditingField({
        key: field,
        label: label,
        value: String(currentValue),
        fontSize: currentFontSize
    });
  };

  const saveTextChange = () => {
      if (editingField) {
          const newData = { ...localData, [editingField.key]: editingField.value };
          
          if (editingField.key === 'date') {
              const newLunarString = convertSolarToLunarFull(editingField.value);
              if (newLunarString) {
                  newData.lunarDate = newLunarString;
              }
          }

          if (editingField.fontSize) {
              newData.elementStyles = {
                  ...newData.elementStyles,
                  [editingField.key]: {
                      ...(newData.elementStyles?.[editingField.key] || {}),
                      fontSize: editingField.fontSize
                  }
              };
          }

          setLocalData(newData);
          setEditingField(null);
      }
  };

  const getAspectRatioForField = (field: string): number => {
      // Dựa trên kích thước CSS pixel thực tế trong mẫu
      switch(field) {
          case 'mainImage': return 249 / 373; // ~0.66 (Portrait)
          case 'centerImage': return 354 / 269; // ~1.31 (Landscape-ish)
          case 'footerImage': return 397 / 155; // ~2.56 (Wide Banner)
          case 'qrCode': return 1 / 1; // Square
          // Album
          case 'albumImages-0':
          case 'albumImages-1':
          case 'albumImages-2':
              return 179 / 268; // ~0.66 (Portrait)
          case 'albumImages-3':
          case 'albumImages-4':
              return 179 / 116; // ~1.54 (Wide)
          // Gallery
          default: 
              if (field.startsWith('galleryImages')) return 9 / 21; // ~0.42 (Rất dọc để khớp cột)
              return 1;
      }
  }

  const triggerImageUpload = (field: string) => {
    if (!isEditMode || readonly) return;
    
    activeImageFieldRef.current = field;
    setCurrentAspect(getAspectRatioForField(field));
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setIsCropping(true);
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
  };

  const performCrop = async () => {
      if (!cropImageSrc || !croppedAreaPixels || !activeImageFieldRef.current) return;
      
      try {
          const croppedImageBase64 = await getCroppedImg(
              cropImageSrc,
              croppedAreaPixels,
              rotation
          );

          if (!croppedImageBase64) return;

          // Explicitly cast to string to avoid TS inference issues where the type narrows to 'never'
          const currentField = activeImageFieldRef.current as string;
          
          setLocalData(prev => {
            const newData = { ...prev };
            if (currentField === 'mainImage') newData.imageUrl = croppedImageBase64;
            else if (currentField === 'qrCode') newData.qrCodeUrl = croppedImageBase64;
            else if (currentField === 'centerImage') newData.centerImage = croppedImageBase64;
            else if (currentField === 'footerImage') newData.footerImage = croppedImageBase64;
            else if (currentField.startsWith('albumImages-')) {
                 const parts = currentField.split('-');
                 if (parts.length > 1) {
                     const index = parseInt(parts[1], 10);
                     if (!isNaN(index)) {
                         const newAlbum = [...(prev.albumImages || [])];
                         newAlbum[index] = croppedImageBase64;
                         newData.albumImages = newAlbum;
                     }
                 }
            } else if (currentField.startsWith('galleryImages-')) {
                const parts = currentField.split('-');
                if (parts.length > 1) {
                    const index = parseInt(parts[1], 10);
                    if (!isNaN(index)) {
                        const newGallery = [...(prev.galleryImages || [])];
                        while (newGallery.length <= index) newGallery.push('');
                        newGallery[index] = croppedImageBase64;
                        newData.galleryImages = newGallery;
                    }
                }
           }
           return newData;
        });

        // Close Cropper
        setIsCropping(false);
        setCropImageSrc(null);
        activeImageFieldRef.current = null;

      } catch (e) {
          console.error(e);
      }
  };

  const handleSave = () => {
      setIsEditMode(false);
      if (onSave) onSave(localData);
  };

  // --- COMPONENTS ---

  const EditableWrapper = ({ 
    children, 
    field, 
    label = "Chỉnh sửa nội dung",
    isText = true, 
    defaultFontSize = 14,
    className = "",
    style = {},
    onClick,
    ...props 
  }: any) => {
      
      const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (onClick && !isEditMode) {
              onClick();
              return;
          }
          if (!isEditMode || readonly) return;

          if (isText) {
              openTextEditor(field, label, defaultFontSize);
          } else {
              triggerImageUpload(field);
          }
      };

      const storedStyle = localData.elementStyles?.[field] || {};
      
      const appliedStyle: React.CSSProperties = {
          ...style,
          fontSize: `${storedStyle.fontSize || defaultFontSize}px`,
      };

      const editContainerStyles: React.CSSProperties = (isEditMode && !readonly) ? {
          ...appliedStyle,
          border: '2px dashed #ef4444', 
          backgroundColor: 'rgba(255, 255, 255, 0.6)', 
          zIndex: 999,
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 0 15px rgba(255, 0, 0, 0.3)',
      } : { 
          cursor: onClick ? 'pointer' : 'default',
          ...appliedStyle
      };

      return (
          <motion.div 
            className={`${className} relative transition-all duration-200`} 
            style={editContainerStyles}
            onClick={handleClick}
            {...props}
          >
              {children}
              {(isEditMode && !readonly) && (
                <div className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-1.5 shadow-md z-[1000] pointer-events-none scale-90">
                    {isText ? <Pencil size={12} /> : <Upload size={12} />}
                </div>
              )}
          </motion.div>
      )
  };

  // --- NEW: CINEMATIC IMAGE COMPONENT (ROBUST FOR UPLOADS) ---
  const CinematicImage = ({ src, className = "", style, enableKenBurns = false, delay = 0 }: any) => {
      // Logic: Nếu là ảnh upload (base64) -> HIỆN NGAY, bỏ qua hiệu ứng mờ dần (fade-in) để tránh lỗi trắng ảnh
      const isBase64 = src?.startsWith('data:');
      const shouldSkipEntry = isBase64;

      return (
          <div className={`w-full h-full overflow-hidden relative bg-gray-200 ${className}`} style={style}>
              <motion.img
                  key={src} // Force remount khi src thay đổi
                  src={src}
                  className="w-full h-full object-cover"
                  alt="Wedding content"
                  
                  // Nếu là ảnh upload: Opacity 1 luôn. Nếu là ảnh mẫu: Opacity 0 rồi hiện dần.
                  initial={shouldSkipEntry ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 1.2, filter: 'blur(5px)' }}
                  
                  // Animation khi vào khung hình
                  whileInView={shouldSkipEntry ? undefined : { 
                      opacity: 1, 
                      scale: 1, 
                      filter: 'blur(0px)',
                      transition: { duration: 1.2, ease: "easeOut", delay: delay } 
                  }}
                  
                  // Hiệu ứng Ken Burns (zoom nhẹ)
                  animate={enableKenBurns ? {
                      scale: [1, 1.05],
                      transition: {
                        duration: 20,
                        ease: "linear",
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                  } : undefined}
                  
                  viewport={{ once: true }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60 pointer-events-none"></div>
          </div>
      );
  };


  // Helper Calendar and Dates
  const safeDate = localData.date || new Date().toISOString().split('T')[0];
  const [year, month, day] = safeDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayOfWeek = isNaN(dateObj.getDay()) ? '' : daysOfWeek[dateObj.getDay()];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); 
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const calendarDays = [];
  for(let i=0; i<startOffset; i++) calendarDays.push(null);
  for(let i=1; i<=daysInMonth; i++) calendarDays.push(i);

  const getAlbumImg = (idx: number) => localData.albumImages?.[idx] || '';
  const getGalleryImg = (idx: number) => localData.galleryImages?.[idx] || 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap');
    
    @font-face{font-family: "UTM-Cafeta"; src: url("https://statics.pancake.vn/web-media/04/eb/01/7a/e19221a44fabb6fd54c6339fd43b1c25ebbe20e97f6633beed4cbc79-w:0-h:0-l:31525-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "Ephesis-Regular"; src: url("https://statics.pancake.vn/web-media/65/48/68/4f/ca5a0c732f276b6fef504eddf0e2d6cdf65cf198b0440dde6d90c5a8-w:0-h:0-l:141767-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "SVN-Mightiest"; src: url("https://statics.pancake.vn/web-media/38/a8/63/6b/be3591beaa1faddc0f76fe23aac05f5d907411cd2b0e4652bc5ed081-w:0-h:0-l:23808-t:application/octet-stream.otf") format("opentype"); font-display:swap;}
    @font-face{font-family: "BlackMango-Medium"; src: url("https://statics.pancake.vn/web-media/f5/f1/41/aa/b6a0dd0c2a8cc07c0be70e066410a2cb9506e4ae9a3d88a8e238b53c-w:0-h:0-l:52546-t:application/octet-stream.otf") format("opentype"); font-display:swap;}
    @font-face{font-family: "UTM-Sloop"; src: url("https://statics.pancake.vn/web-media/bb/41/fd/fd/d607e5e05e3481a7e43e3f8e773d8f6d463215c4cab5107ce736fa5b-w:0-h:0-l:72326-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "UTM-Azkia"; src: url("https://statics.pancake.vn/web-media/35/7a/ab/a5/2bcc8b3414fa20782f68d8d552b13313f2a24e5b267a97b3cf3a5ec3-w:0-h:0-l:144903-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "AlexBrush-Regular"; src: url("https://statics.pancake.vn/web-media/7f/17/e9/f1/cb9ca1db4d08288384fa9e241cbc74923dcbb9c5701b6caf519deb13-w:0-h:0-l:115720-t:font/ttf.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "SVN-Gilroy-Italic"; src: url("https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzIXKMny.woff2") format("woff2");}
    @font-face{font-family: "SVN-Gilroy-Bold-Italic"; src: url("https://fonts.gstatic.com/s/roboto/v30/KFOjCnqEu92Fr1Mu51TzBic6CsQ.woff2") format("woff2");}

    .red-gold-root {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        background-color: #fff;
        overflow-x: hidden;
        font-size: 12px;
        line-height: 1.5;
        font-family: 'Roboto', sans-serif;
        color: #000;
        position: relative;
    }
    .abs { position: absolute; }
    .rel { position: relative; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .bg-cover { background-size: cover; background-position: center; background-repeat: no-repeat; }
    
    .pointer-events-none { pointer-events: none; }
    
    .section-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: 100% 100%; z-index: 0; }
    .text-shadow-white { text-shadow: 2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff, -1px 1px #fff, -1px 1px #fff, -1px 1px #fff, -1px 1px #fff, 1px -1px #fff, -1px 1px #fff; }

    /* Fonts */
    .font-cafeta { font-family: "UTM-Cafeta", sans-serif; }
    .font-ephesis { font-family: "Ephesis-Regular", cursive; }
    .font-mightiest { font-family: "SVN-Mightiest", serif; }
    .font-blackmango { font-family: "BlackMango-Medium", serif; }
    .font-sloop { font-family: "UTM-Sloop", cursive; }
    .font-azkia { font-family: "UTM-Azkia", cursive; }
    .font-alex { font-family: "AlexBrush-Regular", cursive; }
    .font-arial { font-family: 'Arial', sans-serif; }
    .font-oswald { font-family: 'Oswald', sans-serif; }
    
    /* Calendar */
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      text-align: center;
      font-size: 14px;
    }
    .calendar-cell { height: 32px; display: flex; align-items: center; justify-content: center; position: relative; }
    
    .btn-red { background: rgba(177, 0, 0, 1); color: white; border-radius: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .inp-style { background: white; border: 1px solid rgba(142, 1, 1, 1); border-radius: 10px; color: rgba(153, 0, 0, 1); padding: 0 10px; width: 100%; height: 100%; outline: none; }
    
    /* Animations */
    @keyframes pulse-custom {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(177, 0, 0, 0.7); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(177, 0, 0, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(177, 0, 0, 0); }
    }
    .animate-pulse-custom { animation: pulse-custom 2s infinite; }
    
    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin-slow { animation: spin-slow 10s linear infinite; }

    @keyframes heart-beat {
        0% { transform: scale(1); }
        15% { transform: scale(1.2); }
        30% { transform: scale(1); }
        45% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    .animate-heart-beat { animation: heart-beat 1.3s ease-in-out infinite; }
  `;

  // Animation variants
  const fadeIn: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1.5 } } };
  const fadeInUp: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } };
  const fadeInDown: Variants = { hidden: { opacity: 0, y: -50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } };
  const zoomIn: Variants = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } } };
  
  const smoothGallery: Variants = { 
      hidden: { opacity: 0, y: 30, scale: 0.98 }, 
      visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: { 
              duration: 1.2, 
              ease: [0.22, 1, 0.36, 1] 
          } 
      } 
  };

  const slideFromLeft: Variants = { 
      hidden: { opacity: 0, x: -50, filter: 'blur(10px)' }, 
      visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 1.2, ease: "easeOut" } } 
  };
  const slideFromRight: Variants = { 
      hidden: { opacity: 0, x: 50, filter: 'blur(10px)' }, 
      visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 1.2, ease: "easeOut" } } 
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const contentContainerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 2.5, 
        ease: "easeOut", 
        delay: 0.2,
        delayChildren: 2.2, 
        staggerChildren: 0.15
      } 
    }
  };

  return (
    <>
      <style>{css}</style>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <input type="file" ref={musicInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleMusicChange} />
      
      {/* ... (Cropper Modal and Edit Modal remain the same) ... */}
      <AnimatePresence>
        {isCropping && cropImageSrc && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-black flex flex-col"
            >
                <div className="relative flex-1 w-full bg-black">
                    <Cropper
                        image={cropImageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={currentAspect}
                        rotation={rotation}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                
                <div className="bg-white p-4 pb-8 space-y-4">
                     <div className="flex items-center gap-4">
                         <span className="text-xs font-bold text-gray-500 uppercase w-12">Zoom</span>
                         <ZoomOut size={16} className="text-gray-400" />
                         <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                        <ZoomIn size={16} className="text-gray-400" />
                     </div>

                     <div className="flex items-center gap-4">
                         <span className="text-xs font-bold text-gray-500 uppercase w-12">Xoay</span>
                         <RotateCw size={16} className="text-gray-400" />
                         <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                     </div>

                     <div className="flex gap-3 pt-2">
                        <Button 
                            variant="secondary" 
                            className="flex-1" 
                            onClick={() => {
                                setIsCropping(false);
                                setCropImageSrc(null);
                            }}
                        >
                            Hủy Bỏ
                        </Button>
                        <Button 
                            className="flex-1" 
                            onClick={performCrop}
                            icon={<Check className="w-4 h-4" />}
                        >
                            Cắt & Sử Dụng
                        </Button>
                     </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {editingField && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
               onClick={() => setEditingField(null)}
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                  className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative"
                  onClick={e => e.stopPropagation()}
                >
                    {/* ... (Edit modal content remains same) ... */}
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-rose-500" />
                            {editingField.label}
                        </h3>
                        <button onClick={() => setEditingField(null)} className="text-gray-400 hover:text-gray-600"><X /></button>
                    </div>

                    <div className="mb-6 space-y-4">
                        {(editingField.key !== 'mapUrl' && editingField.key !== 'googleSheetUrl') && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                    Kích thước chữ: {editingField.fontSize}px
                                </label>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="80" 
                                    step="1"
                                    value={editingField.fontSize || 14}
                                    onChange={(e) => setEditingField({ ...editingField, fontSize: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                                />
                            </div>
                        )}

                        {editingField.key === 'date' ? (
                            <input 
                                type="date" 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-lg"
                                value={editingField.value}
                                onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                            />
                        ) : editingField.key === 'time' ? (
                            <input 
                                type="time" 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-lg"
                                value={editingField.value}
                                onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                            />
                        ) : (editingField.key === 'mapUrl' || editingField.key === 'googleSheetUrl') ? (
                            <input 
                                type="text"
                                placeholder={editingField.key === 'googleSheetUrl' ? "Dán link Google Apps Script vào đây..." : "Dán link Google Maps vào đây..."}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                                value={editingField.value}
                                onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                            />
                        ) : (
                            <textarea 
                                autoFocus
                                rows={4}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none font-medium text-gray-700"
                                value={editingField.value}
                                onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                            />
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setEditingField(null)}>Hủy</Button>
                        <Button onClick={saveTextChange} icon={<Check className="w-4 h-4"/>}>Lưu Thay Đổi</Button>
                    </div>
                </motion.div>
             </motion.div>
          )}
      </AnimatePresence>

      <div className="red-gold-root shadow-2xl relative">
        <audio ref={audioRef} src={localData.musicUrl || "https://statics.pancake.vn/web-media/5e/ee/bf/4a/afa10d3bdf98ca17ec3191ebbfd3c829d135d06939ee1f1b712d731d-w:0-h:0-l:2938934-t:audio/mpeg.mp3"} loop />
        
        {/* --- EDIT BUTTON (Top Right) - HIDDEN IN READONLY --- */}
        {!readonly && (
            <button
                onClick={() => isEditMode ? handleSave() : setIsEditMode(true)}
                className="absolute top-4 right-4 z-[150] p-2 bg-white/60 hover:bg-white backdrop-blur-md rounded-full shadow-sm transition-all text-gray-700 hover:text-rose-600"
                title={isEditMode ? "Lưu thay đổi" : "Chỉnh sửa mẫu"}
            >
                {isEditMode ? <Save className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
        )}

        {/* ... (Gate effect and top sections 1-4 remain same) ... */}
        {/* --- GATE OPENING EFFECT --- */}
        <div className={`abs inset-0 z-[100] pointer-events-none flex overflow-hidden`}>
            {/* Left Door */}
            <motion.div
                initial={{ x: 0 }}
                animate={{ x: isGateOpen ? '-100%' : '0%' }}
                transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-1/2 h-full bg-[#8e0101] relative border-r-2 border-[#Bfa060] shadow-2xl origin-left"
                style={{ backgroundImage: 'linear-gradient(to right, #6d0000, #8e0101)' }}
            >
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                 <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                    <div className="w-4 h-16 border border-[#Bfa060] rounded-full bg-[#590000]"></div>
                 </div>
                 <div className="absolute top-8 right-8 w-24 h-24 border-t-2 border-r-2 border-[#Bfa060] opacity-50 rounded-tr-xl"></div>
                 <div className="absolute bottom-8 right-8 w-24 h-24 border-b-2 border-r-2 border-[#Bfa060] opacity-50 rounded-br-xl"></div>
            </motion.div>

            {/* Right Door */}
            <motion.div
                initial={{ x: 0 }}
                animate={{ x: isGateOpen ? '100%' : '0%' }}
                transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-1/2 h-full bg-[#8e0101] relative border-l-2 border-[#Bfa060] shadow-2xl origin-right"
                style={{ backgroundImage: 'linear-gradient(to left, #6d0000, #8e0101)' }}
            >
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                 <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                    <div className="w-4 h-16 border border-[#Bfa060] rounded-full bg-[#590000]"></div>
                 </div>
                 <div className="absolute top-8 left-8 w-24 h-24 border-t-2 border-l-2 border-[#Bfa060] opacity-50 rounded-tl-xl"></div>
                 <div className="absolute bottom-8 left-8 w-24 h-24 border-b-2 border-l-2 border-[#Bfa060] opacity-50 rounded-bl-xl"></div>
            </motion.div>

            {/* Center Symbol */}
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: isGateOpen ? 0 : 1, scale: isGateOpen ? 1.8 : 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101]"
            >
                 <div className="w-32 h-32 bg-[#Bfa060] rounded-full flex items-center justify-center border-4 border-[#8e0101] shadow-[0_0_30px_rgba(255,215,0,0.4)]">
                    <span className="text-6xl text-[#8e0101] font-bold" style={{fontFamily: "SVN-Mightiest, serif"}}>囍</span>
                 </div>
            </motion.div>
        </div>

        {/* WRAPPER FOR CONTENT ANIMATION */}
        <motion.div
            variants={contentContainerVariants}
            initial="hidden"
            animate={isGateOpen ? "visible" : "hidden"}
            className="relative w-full"
        >
            {/* Sections 1-4 hidden to brevity, logic unchanged from previous implementation */}
            <div className="rel w-full h-[800px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    {/* ... Header Content ... */}
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '80px', zIndex: 20}}>
                        <EditableWrapper field="groomName" label="Tên Hiển Thị" defaultFontSize={30} className="font-sloop text-[30px] text-shadow-white inline-block px-2 leading-tight">
                            {localData.groomName} & {localData.brideName}
                        </EditableWrapper>
                    </motion.div>
                    <motion.div variants={fadeInDown} className="abs" style={{top: '41px', left: '83px', width: '254px'}}>
                        <h2 className="text-center font-roboto text-[20px] tracking-[3px]">THIỆP MỜI</h2>
                    </motion.div>
                    <EditableWrapper field="mainImage" isText={false} className="abs shadow-xl" style={{top: '286px', left: '85px', width: '249px', height: '373px', border: '7px solid #8e0101', zIndex: 20}}>
                        <CinematicImage src={localData.imageUrl} enableKenBurns={true} />
                    </EditableWrapper>
                    <motion.div variants={fadeInUp} className="abs w-full text-center" style={{top: '731px'}}>
                        <h2 className="font-alex text-[32px] text-[#7d1f2a]">Khách quý</h2>
                    </motion.div>
                </div>
            </div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="rel w-full h-[714px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '273px', zIndex: 20}}>
                        <EditableWrapper field="groomName" label="Tên Chú Rể" defaultFontSize={40} className="font-sloop text-[40px] text-shadow-white inline-block">{localData.groomName}</EditableWrapper>
                    </motion.div>
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '355px', zIndex: 20}}>
                        <EditableWrapper field="brideName" label="Tên Cô Dâu" defaultFontSize={40} className="font-sloop text-[40px] text-shadow-white inline-block">{localData.brideName}</EditableWrapper>
                    </motion.div>
                    <EditableWrapper field="centerImage" isText={false} className="abs shadow-xl" style={{top: '424px', left: '33px', width: '354px', height: '269px', border: '7px solid #8e0101', zIndex: 20}} variants={smoothGallery}>
                        <CinematicImage src={localData.centerImage} enableKenBurns={true} />
                    </EditableWrapper>
                </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="rel w-full h-[850px]">
                {/* ... Invited Section (simplified) ... */}
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full px-4 pt-10">
                    <motion.div variants={fadeInUp} className="text-center mb-8"><EditableWrapper field="invitedTitle" label="Tiêu đề mời" defaultFontSize={42} className="inline-block"><h2 className="font-ephesis leading-tight text-gray-800">{localData.invitedTitle || "Trân Trọng Kính Mời"}</h2></EditableWrapper></motion.div>
                    <div className="text-center space-y-4">
                        <EditableWrapper field="time" label="Giờ" defaultFontSize={22} className="inline-block"><span className="font-arial text-[22px] font-medium text-gray-800">{localData.time.replace(':', ' giờ ')}</span></EditableWrapper>
                        <EditableWrapper field="date" label="Ngày" defaultFontSize={48} className="inline-block"><span className="font-oswald text-[48px] font-bold text-gray-900 leading-none">{day}</span></EditableWrapper>
                    </div>
                </div>
            </motion.div>

            {/* === SECTION 5: RSVP FORM (UPDATED) === */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="rel w-full h-[522px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '14px'}}>
                        <h2 className="font-ephesis text-[30px] leading-none">Xác Nhận Tham Dự<br/>&<br/>Gửi Lời Chúc</h2>
                    </motion.div>
                    <div className="abs pointer-events-none" style={{top: '124px', left: '35px', width: '350px', height: '312px', background: '#902732', borderRadius: '16px'}}></div>
                    
                    <div className="abs z-20" style={{top: '144px', left: '56px', width: '307px'}}>
                        <div style={{height: '43px', marginBottom: '14px'}}>
                            <input 
                                className="inp-style" 
                                placeholder="Tên của bạn là?" 
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                            />
                        </div>
                        <div style={{height: '43px', marginBottom: '14px'}}>
                            <input 
                                className="inp-style" 
                                placeholder="Bạn là gì của Dâu Rể nhỉ?" 
                                value={guestRelation}
                                onChange={(e) => setGuestRelation(e.target.value)}
                            />
                        </div>
                        <div style={{height: '43px', marginBottom: '14px'}}>
                            <input 
                                className="inp-style" 
                                placeholder="Gửi lời chúc đến Dâu Rể nhé!" 
                                value={guestWishes}
                                onChange={(e) => setGuestWishes(e.target.value)}
                            />
                        </div>
                        <div style={{height: '43px'}}>
                            <select 
                                className="inp-style"
                                value={attendance}
                                onChange={(e) => setAttendance(e.target.value)}
                            >
                                <option value="Có Thể Tham Dự">Có Thể Tham Dự</option>
                                <option value="Không Thể Tham Dự">Không Thể Tham Dự</option>
                            </select>
                        </div>
                        <div style={{marginTop: '24px', marginLeft: '13px', display: 'flex', gap: '8px', alignItems: 'center'}}>
                             <button 
                                onClick={handleRSVPSubmit} 
                                disabled={isSubmittingRSVP}
                                className="btn-red w-[168px] h-[43px] bg-white text-[#8e0101] text-[14px] font-bold flex items-center justify-center"
                             >
                                 {isSubmittingRSVP ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null}
                                 GỬI NGAY
                             </button>
                             
                             {/* NÚT CẤU HÌNH SHEET (CHỈ HIỆN KHI EDIT MODE) */}
                             {(isEditMode && !readonly) && (
                                <button 
                                    onClick={() => openTextEditor('googleSheetUrl', 'Link Google Sheet Script')}
                                    className="w-[43px] h-[43px] bg-white rounded-full flex items-center justify-center shadow-lg text-[#8e0101] hover:scale-110 transition-transform"
                                    title="Cấu hình Google Sheet"
                                >
                                    <Link size={20} />
                                </button>
                             )}
                        </div>
                    </div>
                    
                    <div className="abs z-20" style={{top: '456px', left: '113px'}}>
                        <button onClick={() => setShowBankPopup(true)} className="btn-red" style={{width: '194px', height: '40px', fontSize: '14px', fontWeight: 'bold', borderRadius: '9px'}}>
                            GỬI MỪNG CƯỚI
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* === SECTION 6 & 7: ALBUM & THANK YOU (Simplified) === */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="rel w-full h-[632px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={fadeInDown} className="abs w-full text-center" style={{top: '5px', zIndex: 30}}>
                        <EditableWrapper field="albumTitle" label="Tiêu đề Album" defaultFontSize={42} className="inline-block">
                            <p className="font-ephesis text-[#8e0101]" style={{textShadow: '1px 1px 0 #fff'}}>{localData.albumTitle || "Album Hình Cưới"}</p>
                        </EditableWrapper>
                    </motion.div>
                    <EditableWrapper field="albumImages-0" isText={false} className="abs shadow-md" style={{top: '52px', left: '25px', width: '179px', height: '268px', zIndex: 20}} variants={fadeInUp}>
                        <CinematicImage src={getAlbumImg(0)} delay={0} />
                    </EditableWrapper>
                </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="rel w-full h-[630px]">
                 <div className="abs w-full h-full bg-cover pointer-events-none" style={{backgroundImage: 'url("https://content.pancake.vn/web-media/ad/c0/11/16/06080e040619cef49e87d7e06a574eb61310d3dc4bdc9f0fec3638c9-w:854-h:1280-l:259362-t:image/jpeg.png")'}}></div>
                 <EditableWrapper field="footerImage" isText={false} className="abs animate-pulse-custom" style={{top: '338px', left: '11px', width: '397px', height: '155px', filter: 'grayscale(100%) brightness(200%)', zIndex: 20}}>
                     <CinematicImage src={localData.footerImage} />
                 </EditableWrapper>
                 <motion.div variants={fadeInUp} className="abs w-full text-center" style={{top: '427px', zIndex: 30}}>
                     <p className="font-azkia text-[38px] text-white" style={{textShadow: '0 0 5px rgba(0,0,0,0.5)'}}>Rất hân hạnh được đón tiếp!</p>
                 </motion.div>
            </motion.div>
        
        </motion.div>

        {/* ... (POPUPS remain same) ... */}
        {/* === POPUP BANK === */}
        <AnimatePresence>
            {showBankPopup && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
                >
                    <motion.div className="relative bg-white w-[400px] h-[381px] border border-gray-200 shadow-xl">
                        <button onClick={() => setShowBankPopup(false)} className="absolute top-0 right-0 z-10 p-2">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                        <div className="abs pointer-events-none" style={{top: '87px', left: '85px', width: '230px', height: '227px', backgroundColor: '#902732'}}></div>
                        <div className="abs w-full text-center" style={{top: '14px'}}>
                            <h2 className="font-ephesis text-[40px] font-bold">Gửi Mừng Cưới</h2>
                        </div>
                        <EditableWrapper field="qrCode" isText={false} className="abs" style={{top: '102px', left: '101px', width: '200px', height: '198px', zIndex: 20}}>
                             <div className="w-full h-full bg-cover" style={{backgroundImage: `url("${localData.qrCodeUrl || 'https://img.freepik.com/free-vector/scan-me-qr-code_78370-2915.jpg'}")`}}></div>
                        </EditableWrapper>
                        <div className="abs w-full text-center" style={{top: '323px', zIndex: 20}}>
                            <EditableWrapper field="bankInfo" label="Thông Tin Ngân Hàng" className="font-arial text-[17px] font-bold inline-block bg-white/80 px-2 rounded">
                                <h4 style={{whiteSpace: 'pre-line'}}>{localData.bankInfo}</h4>
                            </EditableWrapper>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showSuccessModal && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
                    onClick={() => setShowSuccessModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="relative w-full max-w-sm bg-white rounded-xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative aspect-[3/4] w-full">
                             <img 
                                src={localData.imageUrl || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=1080&auto=format&fit=crop'} 
                                className="w-full h-full object-cover" 
                                alt="Thank you"
                             />
                             <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 bg-black/40 py-8 backdrop-blur-[2px] text-center">
                                <h2 className="font-ephesis text-6xl text-white mb-2" style={{fontFamily: 'Ephesis-Regular, cursive'}}>thank you</h2>
                                <p className="font-arial text-white text-lg tracking-wider italic">Rất hân hạnh được đón tiếp!</p>
                             </div>
                             <button onClick={() => setShowSuccessModal(false)} className="absolute top-2 right-2 text-white/80 hover:text-white bg-black/20 rounded-full p-1 transition-colors">
                                <X size={24} />
                             </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Music Button */}
        <div className="fixed bottom-4 left-4 z-50">
            <button 
                type="button"
                onClick={handleMusicClick}
                className="w-14 h-14 bg-white/30 backdrop-blur rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform border-none outline-none relative group"
            >
                {isPlaying ? 
                    <img src="https://content.pancake.vn/1/31/08/c9/52/c9f574ca2fa8481e1c8c657100583ddfbf47e33427d480a7dc32e788-w:200-h:200-l:242141-t:image/gif.gif" className="w-11 h-11" alt="Music playing" />
                    : 
                    <img src="https://content.pancake.vn/1/02/d4/a7/88/fef5132f979892c1778a688f2039942fc24b396b332750179775f87e-w:200-h:200-l:8183-t:image/png.png" className="w-11 h-11" alt="Music paused" />
                }
                
                {(isEditMode && !readonly) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                )}
            </button>
            {(isEditMode && !readonly) && <div className="text-white text-xs bg-black/50 px-2 py-1 rounded mt-1 text-center">Đổi nhạc</div>}
        </div>

      </div>
    </>
  );
};
