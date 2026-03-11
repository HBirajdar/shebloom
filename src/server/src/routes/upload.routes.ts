import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import { imageUpload, videoUpload, multiUpload } from '../middleware/upload.middleware';
import cloudinary from '../config/cloudinary';

const r = Router();

// POST /upload/image
r.post('/image', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  imageUpload(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message || 'Image upload failed' });
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }
      res.json({
        success: true,
        data: {
          url: file.path,
          publicId: file.filename,
        },
      });
    } catch (e) {
      next(e);
    }
  });
});

// POST /upload/video
r.post('/video', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  videoUpload(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message || 'Video upload failed' });
      return;
    }
    try {
      const file = req.file as any;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }
      res.json({
        success: true,
        data: {
          url: file.path,
          publicId: file.filename,
          thumbnail: file.path.replace('/upload/', '/upload/so_0/'),
        },
      });
    } catch (e) {
      next(e);
    }
  });
});

// POST /upload/multiple
r.post('/multiple', authenticate, (req: AuthRequest, res: Response, next: NextFunction) => {
  multiUpload(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message || 'Upload failed' });
      return;
    }
    try {
      const files = req.files as any[];
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No files uploaded' });
        return;
      }
      const results = files.map((f: any) => ({
        url: f.path,
        publicId: f.filename,
      }));
      res.json({ success: true, data: results });
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
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default r;
