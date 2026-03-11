import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vedaclue/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  } as any,
});

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vedaclue/videos',
    allowed_formats: ['mp4', 'mov'],
    resource_type: 'video',
  } as any,
});

export const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');

export const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

export const multiUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('files', 5);
