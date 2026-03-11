// @ts-nocheck
import { useState, useRef } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || value || '';

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminAPI.upload(formData);
      const url = res.data.data.url;
      onChange(url);
      setPreview(null); // Clear local preview, use server URL
      toast.success('Image uploaded!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setPreview(null); // Revert to previous image
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">{label}</label>
      )}
      <div
        onClick={handleClick}
        className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-rose-400 transition-colors bg-gray-50"
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Preview"
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl">📷</span>
            <span className="text-[8px] text-gray-400 font-bold mt-0.5">Upload</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
            <div className="animate-spin w-6 h-6 border-3 border-rose-400 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {displayUrl && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          className="mt-1.5 px-3 py-1 rounded-lg text-[9px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #F43F5E, #FB7185)' }}
        >
          Change Image
        </button>
      )}
    </div>
  );
}
