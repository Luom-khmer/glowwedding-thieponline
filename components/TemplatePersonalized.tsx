
import React, { useEffect, useState, useRef } from 'react';
import { InvitationData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Save, Upload, Check, Music, ZoomIn, ZoomOut, RotateCw, Heart, Loader2, Link, MapPin, Calendar, Clock } from 'lucide-react';
import { Button } from './Button';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { convertSolarToLunarFull } from '../utils/lunar';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface TemplatePersonalizedProps {
  data: InvitationData;
  onSave?: (newData: InvitationData) => void;
  readonly?: boolean;
  invitationId?: string;
}

interface EditingFieldState {
    key: keyof InvitationData | 'mapUrl' | 'googleSheetUrl';
    label: string;
    value: string;
    fontSize?: number;
}

export const TemplatePersonalized: React.FC<TemplatePersonalizedProps> = ({ data: initialData, onSave, readonly = false, invitationId }) => {
  const [localData, setLocalData] = useState<InvitationData>(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  
  // State for Animation Trigger
  const [isOpening, setIsOpening] = useState(false);

  // State for RSVP & Bank Popups
  const [showBankPopup, setShowBankPopup] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // --- RSVP STATE ---
  const [guestName, setGuestName] = useState('');
  const [guestRelation, setGuestRelation] = useState(''); 
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

  // Auto-play and Opening Effect
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsOpening(true);
        if (audioRef.current && !isPlaying) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Music Handler
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

  // Text Editor
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

  // Image Upload & Crop
  const triggerImageUpload = (field: string, aspect: number = 1) => {
    if (!isEditMode || readonly) return;
    activeImageFieldRef.current = field;
    setCurrentAspect(aspect);
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

  const performCrop = async () => {
      if (!cropImageSrc || !croppedAreaPixels || !activeImageFieldRef.current) return;
      try {
          const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation);
          if (!croppedImageBase64) return;
          
          const currentField = activeImageFieldRef.current as string;
          
          setLocalData(prev => {
            const newData = { ...prev };
            if (currentField === 'mainImage') newData.imageUrl = croppedImageBase64;
            else if (currentField === 'centerImage') newData.centerImage = croppedImageBase64;
            else if (currentField === 'footerImage') newData.footerImage = croppedImageBase64;
            else if (currentField === 'mapImage') newData.mapImageUrl = croppedImageBase64; 
            else if (currentField === 'qrCode') newData.qrCodeUrl = croppedImageBase64; 
            else if (currentField.startsWith('albumImages-')) {
                 const parts = currentField.split('-');
                 const index = parseInt(parts[1], 10);
                 if(!isNaN(index)) {
                    const newAlbum = [...(prev.albumImages || [])];
                    newAlbum[index] = croppedImageBase64;
                    newData.albumImages = newAlbum;
                 }
            } else if (currentField.startsWith('galleryImages-')) {
                const parts = currentField.split('-');
                const index = parseInt(parts[1], 10);
                if(!isNaN(index)) {
                    const newGallery = [...(prev.galleryImages || [])];
                    while(newGallery.length <= index) newGallery.push("");
                    newGallery[index] = croppedImageBase64;
                    newData.galleryImages = newGallery;
                }
            }
            return newData;
        });
        setIsCropping(false);
        setCropImageSrc(null);
        activeImageFieldRef.current = null;
      } catch (e) { console.error(e); }
  };

  const handleSave = () => {
      setIsEditMode(false);
      if (onSave) onSave(localData);
  };

  const handleRSVPSubmit = async () => {
      if (!guestName.trim()) {
          alert("Bạn quên nhập tên rồi nè!");
          return;
      }

      setIsSubmittingRSVP(true);
      try {
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
              console.log("Demo Saved:", { guestName, guestRelation, guestWishes, attendance });
              await new Promise(resolve => setTimeout(resolve, 500));
          }

          const sheetUrl = localData.googleSheetUrl;
          if (sheetUrl && sheetUrl.startsWith("http")) {
             fetch(sheetUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
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

  const EditableWrapper = ({ children, field, label, isText = true, defaultFontSize = 14, className = "", style = {}, onClick, aspect = 1, ...props }: any) => {
      const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (onClick && !isEditMode) { onClick?.(); return; }
          if (!isEditMode || readonly) return;
          if (isText) openTextEditor(field, label, defaultFontSize);
          else triggerImageUpload(field, aspect);
      };
      const storedStyle = localData.elementStyles?.[field] || {};
      const appliedStyle: React.CSSProperties = { ...style, fontSize: `${storedStyle.fontSize || defaultFontSize}px` };
      const editStyle: React.CSSProperties = (isEditMode && !readonly) ? { ...appliedStyle, border: '2px dashed #ef4444', backgroundColor: 'rgba(255, 255, 255, 0.4)', zIndex: 100, cursor: 'pointer', boxShadow: '0 0 10px rgba(255,0,0,0.2)' } : { cursor: onClick ? 'pointer' : 'default', ...appliedStyle };

      return (
          <motion.div className={`${className} relative`} style={editStyle} onClick={handleClick} {...props}>
              {children}
              {(isEditMode && !readonly) && <div className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-1 shadow-md z-50 scale-75">{isText ? <Pencil size={12} /> : <Upload size={12} />}</div>}
          </motion.div>
      )
  };

  const CinematicImage = ({ src, className = "", style, enableKenBurns = false, delay = 0 }: any) => {
      const isBase64 = src?.startsWith('data:');
      const shouldSkipEntry = isBase64;

      return (
          <div className={`w-full h-full overflow-hidden relative bg-gray-200 ${className}`} style={style}>
              <motion.img
                  key={src}
                  src={src}
                  className="w-full h-full object-cover"
                  alt="Wedding content"
                  initial={shouldSkipEntry ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 1.2, filter: 'blur(5px)' }}
                  whileInView={shouldSkipEntry ? undefined : { 
                      opacity: 1, 
                      scale: 1, 
                      filter: 'blur(0px)',
                      transition: { duration: 1.2, ease: "easeOut", delay: delay } 
                  }}
                  animate={enableKenBurns ? {
                      scale: [1, 1.1],
                      transition: {
                        duration: 15,
                        ease: "linear",
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                  } : undefined}
                  viewport={{ once: true }}
              />
          </div>
      );
  };

  // Helper Data
  const safeDate = localData.date || new Date().toISOString().split('T')[0];
  const [year, month, day] = safeDate.split('-').map(Number);
  const getAlbumImg = (idx: number) => localData.albumImages?.[idx] || 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop';
  const getGalleryImg = (idx: number) => localData.galleryImages?.[idx] || 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?q=80&w=600&auto=format&fit=crop';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    @font-face{font-family: "UTM-Cafeta"; src: url("https://statics.pancake.vn/web-media/04/eb/01/7a/e19221a44fabb6fd54c6339fd43b1c25ebbe20e97f6633beed4cbc79-w:0-h:0-l:31525-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "Ephesis-Regular"; src: url("https://statics.pancake.vn/web-media/65/48/68/4f/ca5a0c732f276b6fef504eddf0e2d6cdf65cf198b0440dde6d90c5a8-w:0-h:0-l:141767-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "SVN-Mightiest"; src: url("https://statics.pancake.vn/web-media/38/a8/63/6b/be3591beaa1faddc0f76fe23aac05f5d907411cd2b0e4652bc5ed081-w:0-h:0-l:23808-t:application/octet-stream.otf") format("opentype"); font-display:swap;}
    @font-face{font-family: "BlackMango-Medium"; src: url("https://statics.pancake.vn/web-media/f5/f1/41/aa/b6a0dd0c2a8cc07c0be70e066410a2cb9506e4ae9a3d88a8e238b53c-w:0-h:0-l:52546-t:application/octet-stream.otf") format("opentype"); font-display:swap;}
    @font-face{font-family: "UTM-Sloop"; src: url("https://statics.pancake.vn/web-media/bb/41/fd/fd/d607e5e05e3481a7e43e3f8e773d8f6d463215c4cab5107ce736fa5b-w:0-h:0-l:72326-t:application/octet-stream.ttf") format("truetype"); font-display:swap;}
    @font-face{font-family: "AlexBrush-Regular"; src: url("https://statics.pancake.vn/web-media/7f/17/e9/f1/cb9ca1db4d08288384fa9e241cbc74923dcbb9c5701b6caf519deb13-w:0-h:0-l:115720-t:font/ttf.ttf") format("truetype"); font-display:swap;}
    
    .personalized-root { width: 100%; max-width: 420px; margin: 0 auto; background-color: #fff; overflow-x: hidden; font-family: 'Roboto', sans-serif; position: relative; color: #000; font-size: 12px; line-height: 1.5; }
    .abs { position: absolute; }
    .rel { position: relative; }
    .bg-cover { background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%; height: 100%; }
    .inp-style { background: white; border: 1px solid rgba(142, 1, 1, 1); border-radius: 10px; color: rgba(153, 0, 0, 1); padding: 0 10px; width: 100%; height: 100%; outline: none; }
    .btn-red { background: rgba(177, 0, 0, 1); color: white; border-radius: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
    .section-container { width: 100%; background-position: center; background-size: cover; background-repeat: no-repeat; position: relative; }
  `;

  // Animation variants
  const fadeInUp = { hidden: { opacity: 0, y: 100 }, visible: { opacity: 1, y: 0, transition: { duration: 1.5 } } };
  const zoomIn = { hidden: { opacity: 0, scale: 0.3 }, visible: { opacity: 1, scale: 1, transition: { duration: 1.5 } } };
  const curtainLeftVar = { closed: { x: 0 }, open: { x: '-100%', transition: { duration: 2.5, ease: [0.4, 0, 0.2, 1] } } };
  const curtainRightVar = { closed: { x: 0 }, open: { x: '100%', transition: { duration: 2.5, ease: [0.4, 0, 0.2, 1] } } };

  const contentContainerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { 
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 2.5, ease: "easeOut", delay: 0.2, delayChildren: 2.2, staggerChildren: 0.15 } 
    }
  };

  return (
    <>
      <style>{css}</style>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <input type="file" ref={musicInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleMusicChange} />
      
      {/* Cropper Modal */}
      <AnimatePresence>
        {isCropping && cropImageSrc && (
            <div className="fixed inset-0 z-[1000] bg-black flex flex-col">
                <div className="relative flex-1 bg-black"><Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={currentAspect} rotation={rotation} onCropChange={setCrop} onCropComplete={(c, p) => setCroppedAreaPixels(p)} onZoomChange={setZoom} /></div>
                <div className="bg-white p-4 flex flex-col gap-3">
                     <div className="flex items-center gap-4">
                         <ZoomOut size={16} className="text-gray-400" />
                         <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600" />
                         <ZoomIn size={16} className="text-gray-400" />
                     </div>
                     <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => { setIsCropping(false); setCropImageSrc(null); }}>Hủy</Button>
                        <Button className="flex-1" onClick={performCrop} icon={<Check className="w-4 h-4" />}>Cắt Ảnh</Button>
                     </div>
                </div>
            </div>
        )}
      </AnimatePresence>
      
      {/* Text Edit Modal */}
      <AnimatePresence>
          {editingField && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => setEditingField(null)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold">Chỉnh sửa nội dung</h3><button onClick={() => setEditingField(null)}><X /></button></div>
                    <div className="mb-6 space-y-4">
                        {(editingField.key !== 'mapUrl' && editingField.key !== 'googleSheetUrl') && <input type="range" min="10" max="80" value={editingField.fontSize || 14} onChange={(e) => setEditingField({ ...editingField, fontSize: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg accent-rose-600" />}
                        {editingField.key === 'date' ? <input type="date" className="w-full p-2 border rounded" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} /> : 
                         editingField.key === 'time' ? <input type="time" className="w-full p-2 border rounded" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} /> :
                         (editingField.key === 'mapUrl' || editingField.key === 'googleSheetUrl') ? <input type="text" placeholder={editingField.key === 'googleSheetUrl' ? "Dán link Google Apps Script vào đây..." : "Dán link Google Maps vào đây..."} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} /> :
                         <textarea rows={4} className="w-full p-2 border rounded" value={editingField.value} onChange={(e) => setEditingField({ ...editingField, value: e.target.value })} />}
                    </div>
                    <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setEditingField(null)}>Hủy</Button><Button onClick={saveTextChange}>Lưu</Button></div>
                </motion.div>
             </motion.div>
          )}
      </AnimatePresence>

      <div className="personalized-root shadow-2xl relative">
        <audio ref={audioRef} src={localData.musicUrl || "https://statics.pancake.vn/web-media/5e/ee/bf/4a/afa10d3bdf98ca17ec3191ebbfd3c829d135d06939ee1f1b712d731d-w:0-h:0-l:2938934-t:audio/mpeg.mp3"} loop />
        
        {/* EDIT BUTTON */}
        {!readonly && (
            <button onClick={() => isEditMode ? handleSave() : setIsEditMode(true)} className="absolute top-4 right-4 z-[150] p-2 bg-white/60 hover:bg-white backdrop-blur-md rounded-full shadow-sm text-gray-700 hover:text-rose-600">{isEditMode ? <Save className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}</button>
        )}

        {/* CURTAINS */}
        <div className="abs inset-0 z-[999] pointer-events-none overflow-hidden h-[800px]">
             <motion.div variants={curtainLeftVar} initial="closed" animate={isOpening ? "open" : "closed"} className="abs top-0 left-0 w-full h-full bg-cover" style={{backgroundImage: 'url("https://statics.pancake.vn/web-media/0e/6c/18/fb/44e9347bb12368a07e646ad45939e6086fc1ce3b2b39c28663352c01-w:1260-h:2400-l:1296984-t:image/png.png")'}} />
             <motion.div variants={curtainRightVar} initial="closed" animate={isOpening ? "open" : "closed"} className="abs top-0 left-0 w-full h-full bg-cover" style={{backgroundImage: 'url("https://statics.pancake.vn/web-media/fb/1a/3d/db/5397c85e01e68520b6e686acfb8f4b71fc813f563e456d159b222a3c-w:1260-h:2400-l:1301050-t:image/png.png")'}} />
        </div>

        {/* --- SECTION 1: HEADER --- */}
        <motion.div 
           className="section-container" 
           style={{ height: '800px', backgroundImage: 'url("https://content.pancake.vn/1/s840x1600/fwebp/fd/42/7d/0c/1ca1e8525f99e3105eb930cd8ed684a64b07a0d9df7e0c725ca9779c-w:1260-h:2400-l:65030-t:image/png.png")' }}
           initial="hidden"
           animate={isOpening ? "visible" : "hidden"}
           variants={contentContainerVariants}
        >
            <motion.div variants={zoomIn} className="abs w-full text-center" style={{top: '80px', zIndex: 20}}>
                <EditableWrapper field="groomName" label="Tên Dâu Rể" defaultFontSize={30} className="font-sloop text-[30px] inline-block px-2">
                    {localData.groomName} & {localData.brideName}
                </EditableWrapper>
            </motion.div>
            
            <EditableWrapper field="mainImage" isText={false} className="abs shadow-xl" style={{top: '286px', left: '85px', width: '249px', height: '373px', border: '5px solid #fff', zIndex: 20}}>
                <CinematicImage src={localData.imageUrl} enableKenBurns={true} />
            </EditableWrapper>

            <motion.div variants={fadeInUp} className="abs w-full text-center" style={{top: '730px'}}>
                <h2 className="font-alex text-[32px] text-rose-800">Save The Date</h2>
            </motion.div>
        </motion.div>

        {/* --- SECTION 2: INFO --- */}
        <div className="section-container p-8 bg-amber-50" style={{ minHeight: '600px' }}>
            <div className="text-center space-y-6">
                 <h2 className="font-ephesis text-4xl text-rose-700">Gia Đình Hai Bên</h2>
                 
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100">
                     <h3 className="font-bold text-gray-700 uppercase tracking-widest text-sm mb-2">Nhà Trai</h3>
                     <EditableWrapper field="groomFather" className="text-lg font-medium">{localData.groomFather}</EditableWrapper>
                     <EditableWrapper field="groomMother" className="text-lg font-medium">{localData.groomMother}</EditableWrapper>
                     <div className="mt-4">
                        <EditableWrapper field="groomName" className="font-sloop text-4xl text-rose-600">{localData.groomName}</EditableWrapper>
                        <p className="text-xs text-gray-500 mt-1">Quý nam</p>
                     </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100">
                     <h3 className="font-bold text-gray-700 uppercase tracking-widest text-sm mb-2">Nhà Gái</h3>
                     <EditableWrapper field="brideFather" className="text-lg font-medium">{localData.brideFather}</EditableWrapper>
                     <EditableWrapper field="brideMother" className="text-lg font-medium">{localData.brideMother}</EditableWrapper>
                     <div className="mt-4">
                        <EditableWrapper field="brideName" className="font-sloop text-4xl text-rose-600">{localData.brideName}</EditableWrapper>
                        <p className="text-xs text-gray-500 mt-1">Ái nữ</p>
                     </div>
                 </div>
            </div>
        </div>

        {/* --- SECTION 3: CALENDAR & MAP --- */}
        <div className="section-container py-12 px-6 bg-white">
             <div className="text-center mb-8">
                 <EditableWrapper field="invitedTitle" className="font-ephesis text-4xl text-gray-800 mb-2">{localData.invitedTitle || "Trân Trọng Kính Mời"}</EditableWrapper>
                 <p className="text-gray-600 italic">Đến dự buổi tiệc chung vui cùng gia đình chúng tôi tại:</p>
             </div>

             <div className="bg-rose-50 p-6 rounded-2xl mb-8 border border-rose-100 text-center">
                 <EditableWrapper field="location" className="font-bold text-xl text-rose-800 mb-1">{localData.location}</EditableWrapper>
                 <EditableWrapper field="address" className="text-sm text-gray-600 mb-4 block">{localData.address}</EditableWrapper>
                 
                 <div className="flex justify-center items-center gap-6 my-6">
                     <div className="text-center">
                         <span className="block text-4xl font-oswald font-bold text-gray-800">{day}</span>
                         <span className="text-xs uppercase tracking-widest text-gray-500">Ngày</span>
                     </div>
                     <div className="h-10 w-px bg-rose-200"></div>
                     <div className="text-center">
                         <span className="block text-4xl font-oswald font-bold text-gray-800">{month}</span>
                         <span className="text-xs uppercase tracking-widest text-gray-500">Tháng</span>
                     </div>
                     <div className="h-10 w-px bg-rose-200"></div>
                     <div className="text-center">
                         <span className="block text-4xl font-oswald font-bold text-gray-800">{localData.time}</span>
                         <span className="text-xs uppercase tracking-widest text-gray-500">Giờ</span>
                     </div>
                 </div>
                 
                 <EditableWrapper field="lunarDate" className="text-sm italic text-gray-500">{localData.lunarDate}</EditableWrapper>
                 
                 {/* Map Link Button */}
                 {localData.mapUrl && (
                     <a href={localData.mapUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 bg-rose-600 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:bg-rose-700 transition-colors">
                         <MapPin size={16} /> Xem bản đồ
                     </a>
                 )}
             </div>
        </div>

        {/* --- SECTION 4: GALLERY --- */}
        <div className="section-container bg-black py-12 px-4">
             <div className="text-center mb-8">
                 <h2 className="font-ephesis text-4xl text-white mb-2">Album Hình Cưới</h2>
                 <div className="w-16 h-1 bg-rose-500 mx-auto rounded-full"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                 {[0, 1, 2, 3].map((i) => (
                    <EditableWrapper key={i} field={`albumImages-${i}`} isText={false} className={`rounded-lg overflow-hidden ${i === 2 ? 'col-span-2' : ''}`} style={{ height: i === 2 ? '250px' : '200px' }}>
                        <CinematicImage src={getAlbumImg(i)} />
                    </EditableWrapper>
                 ))}
             </div>
        </div>

        {/* --- SECTION 5: RSVP --- */}
        <div className="section-container py-12 px-6 bg-rose-50">
             <div className="bg-white p-8 rounded-2xl shadow-xl">
                 <h2 className="text-center font-ephesis text-4xl text-gray-800 mb-6">Gửi Lời Chúc & RSVP</h2>
                 
                 <div className="space-y-4">
                     <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-rose-400 transition" placeholder="Tên của bạn" value={guestName} onChange={e => setGuestName(e.target.value)} />
                     <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-rose-400 transition" placeholder="Bạn là gì của cô dâu chú rể?" value={guestRelation} onChange={e => setGuestRelation(e.target.value)} />
                     <textarea rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-rose-400 transition resize-none" placeholder="Lời chúc của bạn..." value={guestWishes} onChange={e => setGuestWishes(e.target.value)} />
                     
                     <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" value={attendance} onChange={e => setAttendance(e.target.value)}>
                         <option>Có Thể Tham Dự</option>
                         <option>Không Thể Tham Dự</option>
                     </select>
                     
                     <Button className="w-full mt-2" onClick={handleRSVPSubmit} disabled={isSubmittingRSVP}>
                         {isSubmittingRSVP ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Gửi Xác Nhận"}
                     </Button>
                 </div>
                 
                 <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                     <p className="text-sm text-gray-500 mb-4">Hoặc gửi mừng cưới qua QR</p>
                     <Button variant="outline" className="w-full" onClick={() => setShowBankPopup(true)}>Xem Mã QR & Số Tài Khoản</Button>
                 </div>
             </div>
        </div>

        {/* --- SECTION 6: FOOTER --- */}
        <div className="section-container h-[400px] relative">
             <EditableWrapper field="footerImage" isText={false} className="absolute inset-0 z-0">
                 <CinematicImage src={localData.footerImage} className="filter grayscale brightness-50" />
             </EditableWrapper>
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white text-center p-6">
                 <h2 className="font-ephesis text-5xl mb-4">Thank You</h2>
                 <p className="text-lg opacity-90">Sự hiện diện của quý khách là niềm vinh hạnh của chúng tôi.</p>
             </div>
        </div>

        {/* --- POPUPS --- */}
        <AnimatePresence>
            {showBankPopup && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" onClick={() => setShowBankPopup(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl mb-4">Mừng Cưới</h3>
                        <EditableWrapper field="qrCode" isText={false} className="w-48 h-48 mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden">
                             <img src={localData.qrCodeUrl} className="w-full h-full object-cover" alt="QR Code" />
                        </EditableWrapper>
                        <EditableWrapper field="bankInfo" className="whitespace-pre-line text-sm text-gray-600 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">{localData.bankInfo}</EditableWrapper>
                    </motion.div>
                </motion.div>
            )}
            
            {showSuccessModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" onClick={() => setShowSuccessModal(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-2xl max-w-sm w-full text-center relative overflow-hidden">
                        <Heart className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
                        <h3 className="font-ephesis text-4xl text-gray-800 mb-2">Cảm Ơn Bạn!</h3>
                        <p className="text-gray-600">Chúng mình đã nhận được lời chúc của bạn.</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Music Button */}
        <div className="fixed bottom-4 left-4 z-50">
            <button type="button" onClick={handleMusicClick} className="w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                {isPlaying ? <img src="https://content.pancake.vn/1/31/08/c9/52/c9f574ca2fa8481e1c8c657100583ddfbf47e33427d480a7dc32e788-w:200-h:200-l:242141-t:image/gif.gif" className="w-8 h-8" alt="playing" /> : <Music className="w-5 h-5 text-gray-600" />}
            </button>
            {(!readonly && isEditMode) && <div className="text-[10px] bg-black/70 text-white px-2 py-1 rounded mt-1 text-center">Đổi nhạc</div>}
        </div>

      </div>
    </>
  );
};
