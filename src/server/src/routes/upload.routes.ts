import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { imageUpload, videoUpload, multiUpload, isCloudinaryActive } from '../middleware/upload.middleware';
import { successResponse, errorResponse } from '../utils/response.utils';

const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyGenerator: (req) => (req as any).user?.id || req.ip, message: { success: false, error: 'Too many uploads. Please try again later.' } });

const r = Router();
r.use(uploadLimiter);

// Helper: get the public URL from an uploaded file
// Cloudinary files have a full URL in file.path
// Local disk files need to be prefixed with /uploads/
function fileUrl(file: any): string {
  if (file.path && file.path.startsWith('http')) return file.path; // Cloudinary
  return `/uploads/${file.filename}`; // Local disk
}

// POST /upload/image
r.post('/image', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  imageUpload(req, res, (err: any) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5MB' : (err.message || 'Image upload failed');
      errorResponse(res, msg, 400);
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        errorResponse(res, 'No image file received. Please select a JPG, PNG, or WebP image.', 400);
        return;
      }
      successResponse(res, {
        url: fileUrl(file),
        publicId: file.filename,
      }, 'Image uploaded');
    } catch (e) {
      next(e);
    }
  });
});

// POST /upload/video
r.post('/video', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  videoUpload(req, res, (err: any) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Video must be under 50MB' : (err.message || 'Video upload failed');
      errorResponse(res, msg, 400);
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        errorResponse(res, 'No video file received', 400);
        return;
      }
      const url = fileUrl(file);
      successResponse(res, {
        url,
        publicId: file.filename,
        thumbnail: isCloudinaryActive ? url.replace('/upload/', '/upload/so_0/') : url,
      }, 'Video uploaded');
    } catch (e) {
      next(e);
    }
  });
});

// POST /upload/multiple
r.post('/multiple', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  multiUpload(req, res, (err: any) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5MB' : (err.message || 'Upload failed');
      errorResponse(res, msg, 400);
      return;
    }
    try {
      const files = req.files as any[];
      if (!files || files.length === 0) {
        errorResponse(res, 'No files uploaded', 400);
        return;
      }
      const results = files.map((f: any) => ({
        url: fileUrl(f),
        publicId: f.filename,
      }));
      successResponse(res, results, 'Files uploaded');
    } catch (e) {
      next(e);
    }
  });
});

// DELETE /upload/:publicId
r.delete('/:publicId', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.params;
    if (isCloudinaryActive) {
      const cloudinary = require('../config/cloudinary').default;
      await cloudinary.uploader.destroy(decodeURIComponent(publicId));
    }
    successResponse(res, null, 'File deleted');
  } catch (e) {
    next(e);
  }
});

export default r;
