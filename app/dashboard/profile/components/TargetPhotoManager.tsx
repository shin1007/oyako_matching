"use client";

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

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
  userRole?: 'parent' | 'child'; // undefinedは使わない
}


export const TargetPhotoManager: React.FC<TargetPhotoManagerProps> = ({ photos, setPhotos, loading, userRole }) => {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // supabaseはシングルトンとしてimport
  const MAX_PHOTOS_PER_CHILD = 1;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMessage('');
    if (photos.length >= MAX_PHOTOS_PER_CHILD) {
      setErrorMessage('写真は1枚のみ登録できます。既存の写真を削除してから新しい写真をアップロードしてください。');
      return;
    }
    setUploading(true);
    console.log('[TargetPhotoManager] アップロード開始', { files, photos });
    try {
      // 認証ユーザーID取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('ユーザー認証情報の取得に失敗しました。再ログインしてください。');
      }
      const userId = user.id;
      const newPhotos: Photo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[TargetPhotoManager] ファイル検証:`, file);
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
          throw new Error('JPEG、PNG、またはWebP形式の画像を選択してください。');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
        }
        const options = {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg' as const,
        };
        const compressedFile = await imageCompression(file, options);
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        // ファイル名の先頭にuserIdを付与
        const fileName = `${userId}/profile-upload-${Date.now()}-${i}.${fileExt}`;
        console.log('[TargetPhotoManager] Storageアップロード開始', fileName);
        // Storageはハイフン区切り
        const { error: uploadError } = await supabase.storage
          .from('target-people-photos')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          console.error('[TargetPhotoManager] Storageアップロード失敗', uploadError);
          throw uploadError;
        }
        // Storageの公開URL取得もハイフン区切り
        const { data: { publicUrl } } = supabase.storage
          .from('target-people-photos')
          .getPublicUrl(fileName);
        console.log('[TargetPhotoManager] Storageアップロード成功', publicUrl);
        newPhotos.push({
          photoUrl: publicUrl,
          capturedAt: '',
          ageAtCapture: null,
          description: '',
          displayOrder: photos.length + newPhotos.length,
        });
      }
      setPhotos([...photos, ...newPhotos]);
      setErrorMessage('');
      console.log('[TargetPhotoManager] アップロード完了', newPhotos);
    } catch (error: any) {
      setErrorMessage(error.message || 'アップロードに失敗しました。もう一度お試しください。');
      console.error('[TargetPhotoManager] アップロードエラー', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      console.log('[TargetPhotoManager] アップロード処理終了');
    }
  };

  const handleDeletePhoto = async (index: number) => {
    const photo = photos[index];
    try {
      if (photo.photoUrl) {
        // Storageはハイフン区切り
        const urlParts = photo.photoUrl.split('/target-people-photos/');
        if (urlParts.length > 1) {
          const path = urlParts[1];
          await supabase.storage.from('target-people-photos').remove([path]);
        }
      }
      const newPhotos = photos.filter((_, i) => i !== index);
      const updatedPhotos = newPhotos.map((p, i) => ({ ...p, displayOrder: i }));
      setPhotos(updatedPhotos);
    } catch (error) {
      setErrorMessage('写真の削除に失敗しました。');
    }
  };

  const handlePhotoUpdate = (index: number, field: keyof Photo, value: any) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], [field]: value };
    setPhotos(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border-2 bg-gray-50 border-gray-200 p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-800">
            写真 ({photos.length}/{MAX_PHOTOS_PER_CHILD})
          </h4>
          {photos.length < MAX_PHOTOS_PER_CHILD && (
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <span
                className={`inline-block rounded-lg px-4 py-2 text-white text-sm font-bold transition-colors ${
                  uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : userRole === 'child'
                      ? 'bg-child-600 hover:bg-child-700'
                      : userRole === 'parent'
                        ? 'bg-parent-600 hover:bg-parent-700'
                        : 'bg-gray-400'
                }`}
              >
                {uploading ? 'アップロード中...' : '+ 写真を追加'}
              </span>
            </label>
          )}
        </div>
        <p className="text-xs text-gray-900 mb-3">
          JPEG、PNG、WebP形式、最大5MB、1枚のみ登録可能
          <br />
          撮影日時と年齢を記録すると、将来的にAIで現在の姿を推定できるようになります。
        </p>
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-3">
            {errorMessage}
          </div>
        )}
        {photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            写真が登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {photos.map((photo, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={photo.photoUrl}
                      alt={`写真 ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-900 mb-1">
                          撮影日
                        </label>
                        <input
                          type="date"
                          value={photo.capturedAt}
                          onChange={(e) => handlePhotoUpdate(index, 'capturedAt', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-parent-500 focus:border-parent-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-900 mb-1">
                          撮影時の年齢
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={photo.ageAtCapture ?? ''}
                          onChange={(e) => handlePhotoUpdate(index, 'ageAtCapture', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="例: 5"
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-parent-500 focus:border-parent-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-900 mb-1">
                        メモ・説明
                      </label>
                      <input
                        type="text"
                        value={photo.description}
                        onChange={(e) => handlePhotoUpdate(index, 'description', e.target.value)}
                        placeholder="例: 保育園の運動会"
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-parent-500 focus:border-parent-500" />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                      disabled={uploading}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 italic">
        💡 ヒント: 写真の撮影日時と年齢を記録しておくと、将来的にAI技術を使って現在の姿を推定する機能を利用できるようになります。
      </div>
    </div>
  );
};
