import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  label?: string;
}

export default function MultiImageUpload({ values = [], onChange, maxImages = 4, label = 'Gallery' }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (values.length >= maxImages) {
      toast.error(`Max ${maxImages} images allowed`);
      return;
    }
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
      onChange([...values, res.data.data.url]);
      toast.success('Photo added!');
    } catch {
      toast.error('Upload failed. Try again');
    } finally {
      setUploading(false);
      setProgress(0);
      if (ref.current) ref.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>}
      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{values.length}/{maxImages} images</p>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {values.map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={url} alt={`gallery-${i}`} style={{ width: '100%', height: 80, borderRadius: 10, objectFit: 'cover', border: '2px solid #e5e7eb' }} />
            <button onClick={() => removeImage(i)}
              style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
        ))}

        {values.length < maxImages && (
          <button onClick={() => ref.current?.click()} disabled={uploading}
            style={{ width: '100%', height: 80, border: '2px dashed #d1d5db', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            {uploading ? (
              <span style={{ fontSize: 10, fontWeight: 600 }}>{progress}%</span>
            ) : (
              <>
                <span style={{ fontSize: 18 }}>+</span>
                <span style={{ fontSize: 9, fontWeight: 600 }}>Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
