import React from 'react';

interface ProfileImageUploadProps {
  profileImageUrl: string | null;
  setProfileImageUrl: (v: string | null) => void;
  selectedImageFile: File | null;
  setSelectedImageFile: (f: File | null) => void;
  loading: boolean;
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  profileImageUrl, setProfileImageUrl, selectedImageFile, setSelectedImageFile, loading
}) => (
  <div>
    {/* ここにプロフィール画像アップロードUIを実装 */}
    {/* ... */}
  </div>
);
