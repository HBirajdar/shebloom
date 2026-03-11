import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vedaclue/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }],
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

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('video');

export const uploadMultiple = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('images', 5);

// Keep old names as aliases for backward compatibility
export const imageUpload = uploadImage;
export const videoUpload = uploadVideo;
export const multiUpload = uploadMultiple;
