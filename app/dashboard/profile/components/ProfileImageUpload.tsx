
import React, { useRef, useState } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';

interface ProfileImageUploadProps {
  profileImageUrl: string | null;
  setProfileImageUrl: (v: string | null) => void;
  selectedImageFile: File | null;
  setSelectedImageFile: (f: File | null) => void;
  loading: boolean;
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  profileImageUrl, setProfileImageUrl, selectedImageFile, setSelectedImageFile, loading
}) => {
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 80, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ファイル選択時
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setErrorMessage('JPEG/PNG/WebP画像のみ対応しています');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('画像サイズは5MB以下にしてください');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    setSelectedImageFile(file);
  };

  // クロップ画像のロード
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  };

  // クロップ確定
  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;
    setUploading(true);
    setErrorMessage('');
    try {
      // クロップ画像をcanvasに描画
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context取得失敗');
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );
      // canvas→blob
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('画像変換に失敗しました');
      // 圧縮
      const compressed = await imageCompression(blob, { maxSizeMB: 1, maxWidthOrHeight: 512, useWebWorker: true });
      // File化
      const croppedFile = new File([compressed], selectedImageFile?.name || 'profile.jpg', { type: 'image/jpeg' });
      setSelectedImageFile(croppedFile);
      setShowCropper(false);
      setSelectedImage(null);
      setErrorMessage('');
      // プレビュー用URL生成
      const previewUrl = URL.createObjectURL(croppedFile);
      setProfileImageUrl(previewUrl);
    } catch (error) {
      setErrorMessage('画像の処理に失敗しました。もう一度お試しください。');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (uploading) return;
    setShowCropper(false);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* 現在の画像またはプレビュー */}
      <div className="flex justify-center">
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt="プロフィール画像"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-3xl font-bold">
            <span className="text-5xl">👤</span>
          </div>
        )}
      </div>

      {/* アップロードボタン */}
      <div className="flex justify-center">
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="inline-block rounded-lg px-4 py-2 text-sm text-white transition-colors bg-parent-600 hover:bg-parent-700">
            {profileImageUrl ? '画像を変更' : '画像をアップロード'}
          </span>
        </label>
      </div>

      <p className="text-xs text-gray-500 text-center">
        JPEG、PNG、WebP形式、最大5MB<br />アップロード後、正方形に切り取れます
      </p>

      {/* エラーメッセージ表示 */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">
          {errorMessage}
        </div>
      )}

      {/* クロッパーモーダル */}
      {showCropper && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">画像を切り取る</h3>
            <div className="mb-4 flex-1 overflow-auto" style={{ minHeight: 0 }}>
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1}
                circularCrop={false}
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="切り取り対象"
                  className="max-w-full h-auto"
                  onLoad={handleImageLoad}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                disabled={uploading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'アップロード中...' : '切り取りを確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
