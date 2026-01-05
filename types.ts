
export interface Template {
  id: string;
  name: string;
  thumbnailUrl: string;
  style: 'modern' | 'classic' | 'floral' | 'luxury' | 'red-gold' | 'personalized';
  color: string;
}

export interface InvitationData {
  groomName: string;
  groomFather: string;
  groomMother: string;
  brideName: string;
  brideFather: string;
  brideMother: string;
  date: string;
  time: string;
  location: string;
  address: string;
  message: string;
  imageUrl?: string;
  // Các trường tùy chỉnh
  mapUrl?: string;       // Link Google Maps tùy chỉnh
  mapImageUrl?: string;  // Ảnh tròn đại diện cho bản đồ (Mới)
  qrCodeUrl?: string;    // Ảnh QR Ngân hàng
  bankInfo?: string;     // Thông tin số tài khoản
  musicUrl?: string;     // Link nhạc nền (mp3)
  
  // Link Google Sheet Webhook riêng cho từng thiệp
  googleSheetUrl?: string; 

  // Các ảnh mới
  centerImage?: string;  // Ảnh ở giữa phần thông tin cha mẹ
  footerImage?: string;  // Ảnh ở chân trang (đen trắng)
  albumImages?: string[]; // Mảng 5 ảnh album
  
  // Section Trân trọng kính mời (3 ảnh)
  galleryImages?: string[]; 
  lunarDate?: string; // Ngày âm lịch
  
  // Địa chỉ nhà trai/gái
  groomAddress?: string;
  brideAddress?: string;

  // Tiêu đề tùy chỉnh
  invitedTitle?: string; // Thay thế cho "Trân Trọng Kính Mời"
  albumTitle?: string;   // Thay thế cho "Album Hình Cưới"

  // Cấu hình style riêng cho từng element (VD: Font size)
  elementStyles?: Record<string, { fontSize?: number }>;

  // Template Style
  style?: 'modern' | 'classic' | 'floral' | 'luxury' | 'red-gold' | 'personalized';
}

export interface SavedInvitation {
  id: string;
  customerName: string; 
  createdAt: string;
  data: InvitationData;
  link: string;
}

export type UserRole = 'admin' | 'editor' | 'user';

export interface User {
  uid: string;
  name: string;
  email: string;
  picture: string;
  role: UserRole;
}

export type ViewState = 'home' | 'templates' | 'editor' | 'preview' | 'login' | 'pricing' | 'guest-manager' | 'guest-view' | 'admin-dashboard' | 'tool-generator';

export const TEMPLATES: Template[] = [
  {
    id: 't6',
    name: 'Thiệp dùng tên riêng',
    thumbnailUrl: 'https://statics.pancake.vn/web-media/3c/3b/ca/e1/e12ca0e6af675d653327f5a3b5d2c7c2385f71d26b8fee7604b45828-w:1706-h:2560-l:224512-t:image/jpeg.jpg',
    style: 'personalized',
    color: 'bg-amber-50'
  },
  {
    id: 't5',
    name: 'Mẫu Đỏ Truyền Thống',
    thumbnailUrl: 'https://statics.pancake.vn/web-media/ab/56/c3/d2/ae46af903d624877e4e71b00dc5ab4badaa10a8956d3c389ccbc73e9-w:1080-h:1620-l:151635-t:image/jpeg.jpeg',
    style: 'red-gold',
    color: 'bg-rose-50'
  }
];

export const DEFAULT_INVITATION_DATA: InvitationData = {
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
  style: 'red-gold', // Default fallback
  elementStyles: {}
};
