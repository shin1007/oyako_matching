'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onError?: (message: string) => void;
  onUploadComplete?: (publicUrl: string) => void;
  userRole?: 'parent' | 'child';
}

export default function ImageUpload({ currentImageUrl, onImageSelect, onError, onUploadComplete, userRole }: ImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    // ファイルタイプのチェック
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      const error = 'JPEG、PNG、またはWebP形式の画像を選択してください。';
      setErrorMessage(error);
      onError?.(error);
      return;
    }

    // ファイルサイズのチェック（512KB = 0.5MB以下、アップロード前に圧縮するため緩めに5MB）
    if (file.size > 5 * 1024 * 1024) {
      const error = 'ファイルサイズが大きすぎます。5MB以下の画像を選択してください。';
      setErrorMessage(error);
      onError?.(error);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> => {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // 正方形の目標サイズ（500x500px）
      const targetSize = 500;
      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 高品質なリサイズのための設定
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        targetSize,
        targetSize
      );

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          0.95 // 高品質
        );
      });
    },
    []
  );

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    setErrorMessage('');
    setUploading(true);

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      if (!croppedBlob) {
        const error = '画像の処理に失敗しました。';
        setErrorMessage(error);
        onError?.(error);
        setUploading(false);
        return;
      }

      // 画像圧縮オプション
      const options = {
        maxSizeMB: 0.5, // 最大500KB
        maxWidthOrHeight: 500, // 既に500pxにリサイズ済みだが念のため
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };

      // 圧縮処理
      const compressedFile = await imageCompression(
        new File([croppedBlob], 'profile-image.jpg', { type: 'image/jpeg' }),
        options
      );

      onImageSelect(compressedFile);

      // 即座にアップロード処理を実行
      await uploadImage(compressedFile);

      setShowCropper(false);
      setSelectedImage(null);
      setErrorMessage('');
    } catch (error) {
      console.error('画像処理エラー:', error);
      const errorMsg = '画像の処理に失敗しました。もう一度お試しください。';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      // Supabase client の取得
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

      // 既存の画像を削除
      if (currentImageUrl) {
        try {
          const urlParts = currentImageUrl.split('/profile-images/');
          if (urlParts.length > 1) {
            const oldPath = urlParts[1];
            await supabase.storage.from('profile-images').remove([oldPath]);
          }
        } catch (deleteError) {
          console.error('既存画像の削除に失敗しました:', deleteError);
        }
      }

      // 新しい画像をアップロード
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // アップロード完了を親コンポーネントに通知
      onUploadComplete?.(publicUrl);
    } catch (error) {
      console.error('アップロードエラー:', error);
      const errorMsg = 'アップロードに失敗しました。もう一度お試しください。';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const bgGradient = userRole === 'child' 
    ? 'bg-gradient-to-br from-orange-400 to-orange-600' 
    : 'bg-gradient-to-br from-green-400 to-green-600';

  return (
    <div className="space-y-4">
      {/* 現在の画像またはプレビュー */}
      <div className="flex justify-center">
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt="プロフィール画像"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
          />
        ) : (
          <div className={`w-32 h-32 rounded-full ${bgGradient} flex items-center justify-center text-white text-3xl font-bold`}>
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
          <span className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors">
            {currentImageUrl ? '画像を変更' : '画像をアップロード'}
          </span>
        </label>
      </div>

      <p className="text-xs text-gray-500 text-center">
        JPEG、PNG、WebP形式、最大5MB
        <br />
        アップロード後、正方形に切り取れます
      </p>

      {/* エラーメッセージ表示 */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">
          {errorMessage}
        </div>
      )}

      {/* クロッパーモーダル */}
      {showCropper && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-medium mb-4">画像を切り取る</h3>
            
            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // 正方形
                circularCrop={false}
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="切り取り対象"
                  className="max-w-full h-auto"
                />
              </ReactCrop>
            </div>

            <div className="flex gap-3 justify-end">
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
}
