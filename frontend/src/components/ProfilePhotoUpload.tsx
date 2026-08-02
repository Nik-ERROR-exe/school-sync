import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/profile';
import { resolveAssetUrl } from '../utils/assetUrl';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB — matches the backend limit.

interface ProfilePhotoUploadProps {
  name?: string;
  photoUrl?: string | null;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({ name, photoUrl }) => {
  const { checkAuth } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const displayUrl = previewUrl ?? resolveAssetUrl(photoUrl);
  const showPhoto = !!displayUrl && !imgFailed;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // Allow re-selecting the same file later.

    if (file.size > MAX_SIZE_BYTES) {
      setError('Photo must be 2 MB or smaller.');
      return;
    }

    setError(null);
    setUploading(true);
    setImgFailed(false);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      await profileApi.uploadPhoto(file);
      await checkAuth(); // Refresh user from /auth/me (single source of truth).
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl(null);
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/30 bg-slate-800">
        {showPhoto ? (
          <img
            key={displayUrl}
            src={displayUrl ?? undefined}
            alt="Profile"
            className="h-full w-full object-cover"
            onLoad={() => setImgFailed(false)}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-heading text-lg font-bold text-white">
            {(name || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 rounded-full bg-accent p-1.5 text-white shadow-md transition hover:bg-blue-400 disabled:opacity-60"
        aria-label="Upload profile photo"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <p className="mt-1 max-w-[11rem] text-right text-[10px] font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
