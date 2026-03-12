import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { imageUpload, videoUpload, multiUpload } from '../middleware/upload.middleware';
import cloudinary from '../config/cloudinary';
import { successResponse, errorResponse } from '../utils/response.utils';

const r = Router();

// POST /upload/image
r.post('/image', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  imageUpload(req, res, (err: any) => {
    if (err) {
      errorResponse(res, err.message || 'Image upload failed', 400);
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        errorResponse(res, 'No file uploaded', 400);
        return;
      }
      successResponse(res, {
        url: file.path,
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
      errorResponse(res, err.message || 'Video upload failed', 400);
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        errorResponse(res, 'No file uploaded', 400);
        return;
      }
      successResponse(res, {
        url: file.path,
        publicId: file.filename,
        thumbnail: file.path.replace('/upload/', '/upload/so_0/'),
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
      errorResponse(res, err.message || 'Upload failed', 400);
      return;
    }
    try {
      const files = req.files as any[];
      if (!files || files.length === 0) {
        errorResponse(res, 'No files uploaded', 400);
        return;
      }
      const results = files.map((f: any) => ({
        url: f.path,
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
    await cloudinary.uploader.destroy(decodeURIComponent(publicId));
    successResponse(res, null, 'File deleted');
  } catch (e) {
    next(e);
  }
});

export default r;
