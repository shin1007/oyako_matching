import React from 'react';

interface Photo {
  id?: string;
  photoUrl: string;
  capturedAt: string;
  ageAtCapture: number | null;
  description: string;
  displayOrder: number;
}

interface TargetPhotoManagerProps {
  photos: Photo[];
  setPhotos: (v: Photo[]) => void;
  loading: boolean;
}

export const TargetPhotoManager: React.FC<TargetPhotoManagerProps> = ({ photos, setPhotos, loading }) => (
  <div>
    {/* ここに写真管理UIを実装 */}
    {/* ... */}
  </div>
);
