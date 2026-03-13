import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ─── Detect Cloudinary availability ────────────────
const cloudinaryReady = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// ─── Local disk storage (always works) ─────────────
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Sanitize filename to prevent path traversal
function safeName(original: string): string {
  return path.basename(original).replace(/[^a-zA-Z0-9._-]/g, '_');
}

const localImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + safeName(file.originalname)),
});

const localVideoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + safeName(file.originalname)),
});

// ─── Build storage based on availability ───────────
let imageStorage: multer.StorageEngine = localImageStorage;
let videoStorage: multer.StorageEngine = localVideoStorage;

if (cloudinaryReady) {
  try {
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const cloudinary = require('../config/cloudinary').default;
    imageStorage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'vedaclue/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1000, crop: 'limit' }],
      } as any,
    });
    videoStorage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'vedaclue/videos',
        allowed_formats: ['mp4', 'mov'],
        resource_type: 'video',
      } as any,
    });
    console.log('[Upload] Using Cloudinary storage');
  } catch (err) {
    console.warn('[Upload] Cloudinary init failed, using local disk:', (err as any).message);
  }
} else {
  console.log('[Upload] Cloudinary not configured — using local disk storage');
}

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP images allowed'));
};

const videoFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['video/mp4', 'video/quicktime', 'video/mov'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only MP4 and MOV videos allowed'));
};

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
}).single('image');

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: videoFileFilter,
}).single('video');

export const uploadMultiple = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
}).array('images', 5);

// Backward-compat aliases
export const imageUpload = uploadImage;
export const videoUpload = uploadVideo;
export const multiUpload = uploadMultiple;

// Helper: is Cloudinary being used?
export const isCloudinaryActive = cloudinaryReady;
