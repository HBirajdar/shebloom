import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, label = 'Photo', className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      toast.error('Only JPG, PNG, WebP images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    setProgress(0);
    try {
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / (e.total || 1)) * 100)),
      });
      onChange(res.data.data.url);
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Upload failed. Try again');
    } finally {
      setUploading(false);
      setProgress(0);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className={className}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="upload" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid #e5e7eb' }} />
          <button onClick={() => onChange('')}
            style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
          <button onClick={() => ref.current?.click()}
            style={{ display: 'block', marginTop: 6, padding: '4px 12px', borderRadius: 8, fontSize: 9, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #F43F5E, #FB7185)', border: 'none', cursor: 'pointer' }}>
            Change Image
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={uploading}
          style={{ width: '100%', padding: '20px 16px', border: '2px dashed #d1d5db', borderRadius: 12, background: '#f9fafb', cursor: 'pointer', textAlign: 'center', color: '#9ca3af' }}>
          {uploading ? (
            <div>
              <p style={{ marginBottom: 8, fontSize: 14 }}>Uploading... {progress}%</p>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 4 }}>
                <div style={{ height: 4, background: '#f43f5e', borderRadius: 4, width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 24, marginBottom: 4 }}>📷</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Tap to upload photo</p>
              <p style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WebP · Max 5MB</p>
            </>
          )}
        </button>
      )}
    </div>
  );
}
