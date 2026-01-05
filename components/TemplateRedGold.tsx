
import React, { useEffect, useState, useRef } from 'react';
import { InvitationData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Save, Upload, Check, Heart, Music, ZoomIn, ZoomOut, RotateCw, Loader2, Link, UploadCloud } from 'lucide-react';
import { Button } from './Button';
import { convertSolarToLunarFull } from '../utils/lunar';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TemplateRedGoldProps {
  data: InvitationData;
  onSave?: (newData: InvitationData) => void;
  onAutosave?: (newData: InvitationData) => void;
  readonly?: boolean;
  invitationId?: string; 
  guestName?: string; 
}

interface EditingFieldState {
    key: keyof InvitationData | 'mapUrl' | 'googleSheetUrl';
    label: string;
    value: string;
    fontSize?: number;
}

export const TemplateRedGold: React.FC<TemplateRedGoldProps> = ({ data: initialData, onSave, onAutosave, readonly = false, invitationId, guestName }) => {
  const [localData, setLocalData] = useState<InvitationData>(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);

  const [guestNameInput, setGuestNameInput] = useState(guestName || ''); 
  const [guestRelation, setGuestRelation] = useState(''); 
  const [guestWishes, setGuestWishes] = useState('');
  const [attendance, setAttendance] = useState('Có Thể Tham Dự');
  const [isSubmittingRSVP, setIsSubmittingRSVP] = useState(false);

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

  useEffect(() => {
    if (!isEditMode || readonly || !onAutosave) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
        onAutosave(localData);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [localData, isEditMode, onAutosave, readonly]);

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

  useEffect(() => {
      const timer = setTimeout(() => {
          setIsGateOpen(true);
      }, 500); // Open faster
      
      // Attempt auto-play immediately
      const playAudio = async () => {
          if (audioRef.current) {
              try {
                  await audioRef.current.play();
                  setIsPlaying(true);
              } catch (e) {
                  // Autoplay blocked
                  console.log("Autoplay blocked");
                  const unlock = () => {
                      audioRef.current?.play().then(() => setIsPlaying(true));
                      document.removeEventListener('click', unlock);
                      document.removeEventListener('touchstart', unlock);
                  };
                  document.addEventListener('click', unlock);
                  document.addEventListener('touchstart', unlock);
              }
          }
      };
      playAudio();

      return () => clearTimeout(timer);
  }, []);

  const handleRSVPSubmit = async () => {
      if (!guestNameInput.trim()) {
          alert("Bạn quên nhập tên rồi nè!");
          return;
      }
      setIsSubmittingRSVP(true);
      try {
          if (invitationId) {
              await addDoc(collection(db, "rsvps"), {
                  invitationId: invitationId,
                  guestName: guestNameInput,
                  guestRelation,
                  guestWishes,
                  attendance,
                  createdAt: new Date().toISOString()
              });
          }
          const sheetUrl = localData.googleSheetUrl;
          if (sheetUrl && sheetUrl.startsWith("http")) {
             fetch(sheetUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guestName: guestNameInput,
                    guestRelation,
                    guestWishes,
                    attendance,
                    submittedAt: new Date().toLocaleString('vi-VN')
                })
             }).catch(err => console.error("Lỗi gửi Google Sheet:", err));
          }
          setShowSuccessModal(true);
          setGuestNameInput('');
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
    setEditingField({ key: field, label: label, value: String(currentValue), fontSize: currentFontSize });
  };

  const saveTextChange = () => {
      if (editingField) {
          const newData = { ...localData, [editingField.key]: editingField.value };
          if (editingField.key === 'date') {
              const newLunarString = convertSolarToLunarFull(editingField.value);
              if (newLunarString) newData.lunarDate = newLunarString;
          }
          if (editingField.fontSize) {
              newData.elementStyles = {
                  ...newData.elementStyles,
                  [editingField.key]: { ...(newData.elementStyles?.[editingField.key] || {}), fontSize: editingField.fontSize }
              };
          }
          setLocalData(newData);
          setEditingField(null);
      }
  };

  const getAspectRatioForField = (field: string): number => {
      switch(field) {
          case 'mainImage': return 249 / 373;
          case 'centerImage': return 354 / 269;
          case 'footerImage': return 397 / 155;
          case 'qrCode': return 1 / 1;
          case 'albumImages-0': case 'albumImages-1': case 'albumImages-2': return 179 / 268;
          case 'albumImages-3': case 'albumImages-4': return 179 / 116;
          default: if (field.startsWith('galleryImages')) return 9 / 21; return 1;
      }
  }

  const triggerImageUpload = (field: string) => {
    if (!isEditMode || readonly) return;
    activeImageFieldRef.current = field;
    setCurrentAspect(getAspectRatioForField(field));
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
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
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const performCrop = async () => {
      if (!cropImageSrc || !croppedAreaPixels || !activeImageFieldRef.current) return;
      try {
          const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation);
          if (!croppedImageBase64) return;
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
                         while (newAlbum.length <= index) newAlbum.push(""); 
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
                        while (newGallery.length <= index) newGallery.push(""); 
                        newGallery[index] = croppedImageBase64;
                        newData.galleryImages = newGallery;
                    }
                }
           }
           return newData;
        });
        setIsCropping(false);
        setCropImageSrc(null);
        activeImageFieldRef.current = null;
      } catch (e) { console.error(e); }
  };

  const handleSave = () => { setIsEditMode(false); if (onSave) onSave(localData); };

  const EditableWrapper = ({ children, field, label, isText = true, defaultFontSize = 14, className = "", style = {}, onClick, ...props }: any) => {
      const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (onClick && !isEditMode) { onClick(); return; }
          if (!isEditMode || readonly) return;
          if (isText) openTextEditor(field, label, defaultFontSize); else triggerImageUpload(field);
      };
      const storedStyle = localData.elementStyles?.[field] || {};
      const appliedStyle: React.CSSProperties = { ...style, fontSize: `${storedStyle.fontSize || defaultFontSize}px`, };
      const editContainerStyles: React.CSSProperties = (isEditMode && !readonly) ? {
          ...appliedStyle, border: '2px dashed #ef4444', backgroundColor: 'rgba(255, 255, 255, 0.6)', zIndex: 999, cursor: 'pointer', borderRadius: '8px', boxShadow: '0 0 15px rgba(255, 0, 0, 0.3)',
      } : { cursor: onClick ? 'pointer' : 'default', ...appliedStyle };
      return (
          <motion.div className={`${className} relative transition-all duration-200`} style={editContainerStyles} onClick={handleClick} {...props}>
              {children}
              {(isEditMode && !readonly) && <div className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-1.5 shadow-md z-[1000] pointer-events-none scale-90">{isText ? <Pencil size={12} /> : <Upload size={12} />}</div>}
          </motion.div>
      )
  };

  // Simplified Cinematic Image for Smoothness
  const CinematicImage = ({ src, className = "", style, delay = 0 }: any) => {
      const isBase64 = src?.startsWith('data:');
      return (
          <div className={`w-full h-full overflow-hidden relative bg-gray-200 ${className}`} style={style}>
              <motion.img
                  key={src}
                  src={src}
                  className="w-full h-full object-cover"
                  alt="Wedding content"
                  initial={isBase64 ? { opacity: 1 } : { opacity: 0 }}
                  whileInView={{ opacity: 1, transition: { duration: 0.8 } }}
                  viewport={{ once: true }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60 pointer-events-none"></div>
          </div>
      );
  };

  const safeDate = localData.date || new Date().toISOString().split('T')[0];
  const [year, month, day] = safeDate.split('-').map(Number);
  const getAlbumImg = (idx: number) => localData.albumImages?.[idx] || 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop';

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
    .red-gold-root { width: 100%; max-width: 420px; margin: 0 auto; background-color: #fff; overflow-x: hidden; font-size: 12px; line-height: 1.5; font-family: 'Roboto', sans-serif; color: #000; position: relative; }
    .abs { position: absolute; } .rel { position: relative; } .w-full { width: 100%; } .h-full { height: 100%; } .bg-cover { background-size: cover; background-position: center; background-repeat: no-repeat; }
    .pointer-events-none { pointer-events: none; }
    .section-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: 100% 100%; z-index: 0; }
    .text-shadow-white { text-shadow: 2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff, -1px 1px #fff, -1px 1px #fff, -1px 1px #fff, 1px -1px #fff, -1px 1px #fff, 1px -1px #fff; }
    .font-cafeta { font-family: "UTM-Cafeta", sans-serif; } .font-ephesis { font-family: "Ephesis-Regular", cursive; } .font-mightiest { font-family: "SVN-Mightiest", serif; } .font-blackmango { font-family: "BlackMango-Medium", serif; } .font-sloop { font-family: "UTM-Sloop", cursive; } .font-azkia { font-family: "UTM-Azkia", cursive; } .font-alex { font-family: "AlexBrush-Regular", cursive; } .font-arial { font-family: 'Arial', sans-serif; } .font-oswald { font-family: 'Oswald', sans-serif; }
    .btn-red { background: rgba(177, 0, 0, 1); color: white; border-radius: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .inp-style { background: white; border: 1px solid rgba(142, 1, 1, 1); border-radius: 10px; color: rgba(153, 0, 0, 1); padding: 0 10px; width: 100%; height: 100%; outline: none; }
    @keyframes pulse-custom { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(177, 0, 0, 0.7); } 70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(177, 0, 0, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(177, 0, 0, 0); } }
    .animate-pulse-custom { animation: pulse-custom 2s infinite; }
  `;

  // Simplified Variants for Smoothness
  const fadeInUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const fadeInDown = { hidden: { opacity: 0, y: -30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const zoomIn = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } } };
  const contentContainerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1, delay: 0.2, staggerChildren: 0.1 } } };

  return (
    <>
      <style>{css}</style>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <input type="file" ref={musicInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleMusicChange} />
      
      <AnimatePresence>
        {isCropping && cropImageSrc && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black flex flex-col">
                <div className="relative flex-1 w-full bg-black"><Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={currentAspect} rotation={rotation} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} /></div>
                <div className="bg-white p-4 pb-8 space-y-4">
                     <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 uppercase w-12">Zoom</span><ZoomOut size={16} /><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" /><ZoomIn size={16} /></div>
                     <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 uppercase w-12">Xoay</span><RotateCw size={16} /><input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1" /></div>
                     <div className="flex gap-3 pt-2"><Button variant="secondary" className="flex-1" onClick={() => { setIsCropping(false); setCropImageSrc(null); }}>Hủy</Button><Button className="flex-1" onClick={performCrop} icon={<Check className="w-4 h-4" />}>Cắt & Sử Dụng</Button></div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {editingField && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => setEditingField(null)}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-lg flex items-center gap-2"><Pencil className="w-5 h-5 text-rose-500" />{editingField.label}</h3><button onClick={() => setEditingField(null)} className="text-gray-400 hover:text-gray-600"><X /></button></div>
                    <div className="mb-6 space-y-4">
                        {(editingField.key !== 'mapUrl' && editingField.key !== 'googleSheetUrl') && <input type="range" min="10" max="80" step={1} value={editingField.fontSize || 14} onChange={(e) => setEditingField({ ...editingField, fontSize: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg accent-rose-600" />}
                        {editingField.key === 'date' ? <input type="date" className="w-full p-3 border rounded-lg" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} /> : 
                         (editingField.key === 'mapUrl' || editingField.key === 'googleSheetUrl') ? <input type="text" className="w-full p-3 border rounded-lg" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} /> : 
                         <textarea autoFocus rows={4} className="w-full p-3 border rounded-lg" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} />}
                    </div>
                    <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setEditingField(null)}>Hủy</Button><Button onClick={saveTextChange} icon={<Check className="w-4 h-4"/>}>Lưu Thay Đổi</Button></div>
                </motion.div>
             </motion.div>
          )}
      </AnimatePresence>

      <div className="red-gold-root shadow-2xl relative">
        <audio ref={audioRef} src={localData.musicUrl || "https://statics.pancake.vn/web-media/5e/ee/bf/4a/afa10d3bdf98ca17ec3191ebbfd3c829d135d06939ee1f1b712d731d-w:0-h:0-l:2938934-t:audio/mpeg.mp3"} autoPlay loop />
        
        {!readonly && (
            <div className="absolute top-4 right-4 z-[150] flex items-center gap-2">
                 {isEditMode && saveStatus !== 'idle' && <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">{saveStatus === 'saving' ? <><UploadCloud className="w-3 h-3 animate-bounce" /> Đang lưu...</> : <><Check className="w-3 h-3 text-green-400" /> Đã lưu</>}</div>}
                 <button onClick={() => isEditMode ? handleSave() : setIsEditMode(true)} className={`p-2 backdrop-blur-md rounded-full shadow-sm transition-all ${isEditMode ? 'bg-rose-600 text-white shadow-rose-300' : 'bg-white/60 hover:bg-white text-gray-700'}`}>{isEditMode ? <Check className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}</button>
            </div>
        )}

        <div className={`abs inset-0 z-[100] pointer-events-none flex overflow-hidden`}>
            <motion.div initial={{ x: 0 }} animate={{ x: isGateOpen ? '-100%' : '0%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} className="w-1/2 h-full bg-[#8e0101] relative border-r-2 border-[#Bfa060] shadow-2xl origin-left" style={{ backgroundImage: 'linear-gradient(to right, #6d0000, #8e0101)' }} />
            <motion.div initial={{ x: 0 }} animate={{ x: isGateOpen ? '100%' : '0%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} className="w-1/2 h-full bg-[#8e0101] relative border-l-2 border-[#Bfa060] shadow-2xl origin-right" style={{ backgroundImage: 'linear-gradient(to left, #6d0000, #8e0101)' }} />
            <motion.div initial={{ opacity: 1, scale: 1 }} animate={{ opacity: isGateOpen ? 0 : 1, scale: isGateOpen ? 1.5 : 1 }} transition={{ duration: 1 }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101]">
                 <div className="w-32 h-32 bg-[#Bfa060] rounded-full flex items-center justify-center border-4 border-[#8e0101]"><span className="text-6xl text-[#8e0101] font-bold" style={{fontFamily: "SVN-Mightiest, serif"}}>囍</span></div>
            </motion.div>
        </div>

        <motion.div variants={contentContainerVariants} initial="hidden" animate={isGateOpen ? "visible" : "hidden"} className="relative w-full">
            <div className="rel w-full h-[800px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '80px', zIndex: 20}}>
                        <EditableWrapper field="groomName" label="Tên Hiển Thị" defaultFontSize={30} className="font-sloop text-[30px] text-shadow-white inline-block px-2 leading-tight">{localData.groomName || 'Anh Tú'} & {localData.brideName || 'Diệu Nhi'}</EditableWrapper>
                    </motion.div>
                    <motion.div variants={fadeInDown} className="abs" style={{top: '41px', left: '83px', width: '254px'}}><h2 className="text-center font-roboto text-[20px] tracking-[3px]">THIỆP MỜI</h2></motion.div>
                    <EditableWrapper field="mainImage" isText={false} className="abs shadow-xl" style={{top: '286px', left: '85px', width: '249px', height: '373px', border: '7px solid #8e0101', zIndex: 20}}><CinematicImage src={localData.imageUrl || 'https://statics.pancake.vn/web-media/ab/56/c3/d2/ae46af903d624877e4e71b00dc5ab4badaa10a8956d3c389ccbc73e9-w:1080-h:1620-l:151635-t:image/jpeg.jpeg'} /></EditableWrapper>
                    <motion.div variants={fadeInUp} className="abs w-full text-center" style={{top: '731px'}}><h2 className="font-alex text-[32px] text-[#7d1f2a]">{guestName ? guestName : "Khách quý"}</h2></motion.div>
                </div>
            </div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "50px" }} className="rel w-full h-[714px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '273px', zIndex: 20}}><EditableWrapper field="groomName" label="Tên Chú Rể" defaultFontSize={40} className="font-sloop text-[40px] text-shadow-white inline-block">{localData.groomName || 'Anh Tú'}</EditableWrapper></motion.div>
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '355px', zIndex: 20}}><EditableWrapper field="brideName" label="Tên Cô Dâu" defaultFontSize={40} className="font-sloop text-[40px] text-shadow-white inline-block">{localData.brideName || 'Diệu Nhi'}</EditableWrapper></motion.div>
                    <EditableWrapper field="centerImage" isText={false} className="abs shadow-xl" style={{top: '424px', left: '33px', width: '354px', height: '269px', border: '7px solid #8e0101', zIndex: 20}}><CinematicImage src={localData.centerImage || 'https://statics.pancake.vn/web-media/e2/8c/c5/37/905dccbcd5bc1c1b602c10c95acb9986765f735e075bff1097e7f457-w:736-h:981-l:47868-t:image/jpeg.jfif'} /></EditableWrapper>
                </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "50px" }} className="rel w-full h-[850px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full px-4 pt-10">
                    <motion.div variants={fadeInUp} className="text-center mb-8"><EditableWrapper field="invitedTitle" label="Tiêu đề mời" defaultFontSize={42} className="inline-block"><h2 className="font-ephesis leading-tight text-gray-800">{localData.invitedTitle || "Trân Trọng Kính Mời"}</h2></EditableWrapper></motion.div>
                    <div className="text-center space-y-4">
                        <EditableWrapper field="time" label="Giờ" defaultFontSize={22} className="inline-block"><span className="font-arial text-[22px] font-medium text-gray-800">{localData.time.replace(':', ' giờ ')}</span></EditableWrapper>
                        <EditableWrapper field="date" label="Ngày" defaultFontSize={48} className="inline-block"><span className="font-oswald text-[48px] font-bold text-gray-900 leading-none">{day}</span></EditableWrapper>
                    </div>
                </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "50px" }} className="rel w-full h-[522px]">
                <div className="section-bg pointer-events-none" style={{ backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}></div>
                <div className="content-layer relative z-10 w-full h-full">
                    <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '14px'}}><h2 className="font-ephesis text-[30px] leading-none">Xác Nhận Tham Dự<br/>&<br/>Gửi Lời Chúc</h2></motion.div>
                    {/* Tinh chỉnh width và left để không chạm biên đỏ */}
                    <div className="abs pointer-events-none" style={{top: '124px', left: '45px', width: '330px', height: '312px', background: '#902732', borderRadius: '16px'}}></div>
                    <div className="abs z-20" style={{top: '144px', left: '65px', width: '290px'}}>
                        <div style={{height: '43px', marginBottom: '14px'}}><input className="inp-style" placeholder="Tên của bạn là?" value={guestNameInput} onChange={(e) => setGuestNameInput(e.target.value)} /></div>
                        <div style={{height: '43px', marginBottom: '14px'}}><input className="inp-style" placeholder="Bạn là gì của Dâu Rể nhỉ?" value={guestRelation} onChange={(e) => setGuestRelation(e.target.value)} /></div>
                        <div style={{height: '43px', marginBottom: '14px'}}><input className="inp-style" placeholder="Gửi lời chúc đến Dâu Rể nhé!" value={guestWishes} onChange={(e) => setGuestWishes(e.target.value)} /></div>
                        <div style={{height: '43px'}}><select className="inp-style" value={attendance} onChange={(e) => setAttendance(e.target.value)}><option value="Có Thể Tham Dự">Có Thể Tham Dự</option><option value="Không Thể Tham Dự">Không Thể Tham Dự</option></select></div>
                        <div style={{marginTop: '24px', marginLeft: '13px', display: 'flex', justifyContent: 'center', gap: '8px'}}>
                            <button onClick={handleRSVPSubmit} disabled={isSubmittingRSVP} className="btn-red" style={{width: '168px', height: '43px', background: 'white', color: '#8e0101', fontSize: '14px', fontWeight: 'bold', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{isSubmittingRSVP ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}GỬI NGAY</button>
                            {(isEditMode && !readonly) && <button onClick={() => openTextEditor('googleSheetUrl', 'Link Google Sheet Script')} className="w-[43px] h-[43px] bg-white rounded-full flex items-center justify-center shadow-lg text-[#8e0101] hover:scale-110 transition-transform" title="Cấu hình Google Sheet"><Link size={20} /></button>}
                        </div>
                    </div>
                    <motion.div variants={zoomIn} className="abs" style={{top: '456px', left: '113px'}}><button onClick={() => setShowBankPopup(true)} className="btn-red" style={{width: '194px', height: '40px', fontSize: '14px', fontWeight: 'bold', borderRadius: '9px', border: 'none'}}>GỬI MỪNG CƯỚI</button></motion.div>
                </div>
            </motion.div>

            <div className="rel w-full h-[630px]">
                <div className="section-bg" style={{backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")'}}></div>
                <EditableWrapper field="footerImage" isText={false} className="abs w-full h-full" style={{top:0, left:0}}><CinematicImage src={localData.footerImage || 'https://statics.pancake.vn/web-media/ad/c0/11/16/06080e040619cef49e87d7e06a574eb61310d3dc4bdc9f0fec3638c9-w:854-h:1280-l:259362-t:image/jpeg.png'} /></EditableWrapper>
                <div className="abs w-full h-full pointer-events-none" style={{background:'rgba(255, 255, 255, 0.62)', top:0, left:0}}></div>
                <div className="abs pointer-events-none" style={{top:'354px', left:'-17px', width:'453px', height:'147px', background:'rgba(0, 0, 0, 0.48)'}}></div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }} className="abs bg-contain bg-center bg-no-repeat" style={{top:'338px', left:'11px', width:'397px', height:'155px', backgroundImage: 'url("https://statics.pancake.vn/web-media/cf/cf/28/5f/f9ca08165577556ed2df053b0962a0e8e670490844d7ad5e84fa48b2-w:1366-h:530-l:48754-t:image/png.png")'}}></motion.div>
                <motion.div variants={fadeInUp} className="abs w-full text-center" style={{top:'427px', left:'-30px', width:'480px'}}><p style={{fontFamily:'UTM-Azkia, sans-serif', fontSize:'38px', color:'#fff', textAlign:'center'}}>Rất hân hạnh được đón tiếp!</p></motion.div>
            </div>
        </motion.div>

        <AnimatePresence>
            {showBankPopup && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={() => setShowBankPopup(false)}>
                    <motion.div className="relative bg-white w-[400px] h-[381px] border border-gray-200 shadow-xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowBankPopup(false)} className="absolute top-2 right-2 z-10 p-2"><X className="w-6 h-6 text-gray-500" /></button>
                        <div className="abs pointer-events-none" style={{top: '87px', left: '85px', width: '230px', height: '227px', backgroundColor: 'rgba(144, 39, 50, 1)'}}></div>
                        <div className="abs w-full text-center" style={{top: '14px', left:'73px', width:'254px'}}><h2 style={{fontFamily: 'Ephesis-Regular, sans-serif', fontSize: '40px', fontWeight: 'bold'}}>Gửi Mừng Cưới</h2></div>
                        <EditableWrapper field="qrCode" isText={false} className="abs" style={{top: '102px', left: '101px', width: '200px', height: '198px', zIndex: 20}}>
                             <div className="w-full h-full bg-cover" style={{backgroundImage: `url("${localData.qrCodeUrl || 'https://statics.pancake.vn/web-media/e2/bc/35/38/dc2d9ddf74d997785eb0c802bd3237a50de1118e505f1e0a89ae4ec1-w:592-h:1280-l:497233-t:image/png.png'}")`}}></div>
                        </EditableWrapper>
                        <div className="abs w-full text-center" style={{top: '323px', left:'22px', width:'356px', zIndex: 20}}><EditableWrapper field="bankInfo" label="Thông Tin Ngân Hàng" className="text-[17px] font-bold inline-block bg-white/80 px-2 rounded"><h4 style={{whiteSpace: 'pre-line', fontFamily: 'Arial, sans-serif'}}>{localData.bankInfo}</h4></EditableWrapper></div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showSuccessModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="relative aspect-[3/4] w-full"><img src={localData.imageUrl || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=1080&auto=format&fit=crop'} className="w-full h-full object-cover" alt="Thank you" /><div className="absolute top-1/2 left-0 w-full -translate-y-1/2 bg-black/40 py-8 backdrop-blur-[2px] text-center"><h2 style={{fontFamily: 'Ephesis-Regular, cursive'}} className="text-6xl text-white mb-2">thank you</h2><p className="text-white text-lg tracking-wider italic">Rất hân hạnh được đón tiếp!</p></div><button onClick={() => setShowSuccessModal(false)} className="absolute top-2 right-2 text-white/80 hover:text-white bg-black/20 rounded-full p-1 transition-colors"><X size={24} /></button></div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="fixed bottom-4 left-4 z-50">
            <button type="button" onClick={handleMusicClick} className="w-14 h-14 bg-white/30 backdrop-blur rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform border-none outline-none relative group">{isPlaying ? <img src="https://content.pancake.vn/1/31/08/c9/52/c9f574ca2fa8481e1c8c657100583ddfbf47e33427d480a7dc32e788-w:200-h:200-l:242141-t:image/gif.gif" className="w-11 h-11" alt="Music playing" /> : <img src="https://content.pancake.vn/1/02/d4/a7/88/fef5132f979892c1778a688f2039942fc24b396b332750179775f87e-w:200-h:200-l:8183-t:image/png.png" className="w-11 h-11" alt="Music paused" />}{(isEditMode && !readonly) && <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full"><Upload className="w-6 h-6 text-white" /></div>}</button>
            {(isEditMode && !readonly) && <div className="text-white text-xs bg-black/50 px-2 py-1 rounded mt-1 text-center">Đổi nhạc</div>}
        </div>
      </div>
    </>
  );
};
