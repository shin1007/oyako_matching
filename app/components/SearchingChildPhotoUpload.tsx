'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

interface Photo {
  id?: string;
  photoUrl: string;
  capturedAt: string;
  ageAtCapture: number | null;
  description: string;
  displayOrder: number;
}

interface SearchingChildPhotoUploadProps {
  searchingChildId: string | undefined;
  userId: string;
  photos: Photo[];
  onPhotosUpdate: (photos: Photo[]) => void;
  onError?: (message: string) => void;
  userRole?: 'parent' | 'child';
}

export default function SearchingChildPhotoUpload({
  searchingChildId,
  userId,
  photos,
  onPhotosUpdate,
  onError,
  userRole
}: SearchingChildPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage('');

    // 写真枚数制限チェック
    if (photos.length >= 1) {
      const error = '写真は1枚のみ登録できます。既存の写真を削除してから新しい写真をアップロードしてください。';
      setErrorMessage(error);
      onError?.(error);
      return;
    }

    setUploading(true);

    try {
      const newPhotos: Photo[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // ファイルタイプのチェック
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
          throw new Error('JPEG、PNG、またはWebP形式の画像を選択してください。');
        }

        // ファイルサイズのチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
        }

        // 画像圧縮
        const options = {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg' as const,
        };

        const compressedFile = await imageCompression(file, options);

        // アップロード
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/searching-child-${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('searching-children-photos')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('searching-children-photos')
          .getPublicUrl(fileName);

        // 新しい写真を配列に追加
        newPhotos.push({
          photoUrl: publicUrl,
          capturedAt: '',
          ageAtCapture: null,
          description: '',
          displayOrder: photos.length + newPhotos.length,
        });
      }

      // すべての写真をまとめてstateに追加
      onPhotosUpdate([...photos, ...newPhotos]);

      setErrorMessage('');
    } catch (error: any) {
      console.error('アップロードエラー:', error);
      const errorMsg = error.message || 'アップロードに失敗しました。もう一度お試しください。';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (index: number) => {
    const photo = photos[index];
    
    try {
      // Storageから削除
      if (photo.photoUrl) {
        const urlParts = photo.photoUrl.split('/searching-children-photos/');
        if (urlParts.length > 1) {
          const path = urlParts[1];
          await supabase.storage.from('searching-children-photos').remove([path]);
        }
      }

      // データベースから削除（保存済みの場合）
      if (photo.id && searchingChildId) {
        await supabase
          .from('searching_children_photos')
          .delete()
          .eq('id', photo.id);
      }

      // Stateから削除
      const newPhotos = photos.filter((_, i) => i !== index);
      // display_orderを更新
      const updatedPhotos = newPhotos.map((p, i) => ({ ...p, displayOrder: i }));
      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('削除エラー:', error);
      const errorMsg = '写真の削除に失敗しました。';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handlePhotoUpdate = (index: number, field: keyof Photo, value: any) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], [field]: value };
    onPhotosUpdate(newPhotos);
  };

  const bgGradient = userRole === 'child' 
    ? 'bg-orange-50 border-orange-200' 
    : 'bg-green-50 border-green-200';

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border-2 ${bgGradient} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-800">
            写真 ({photos.length}/1)
          </h4>
          {photos.length < 1 && (
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <span className={`inline-block rounded-lg px-3 py-1.5 text-xs text-white transition-colors ${
                uploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : userRole === 'child'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
              }`}>
                {uploading ? 'アップロード中...' : '+ 写真を追加'}
              </span>
            </label>
          )}
        </div>

        <p className="text-xs text-gray-600 mb-3">
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
                  {/* 写真プレビュー */}
                  <div className="flex-shrink-0">
                    <img
                      src={photo.photoUrl}
                      alt={`写真 ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </div>

                  {/* 写真情報 */}
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          撮影日
                        </label>
                        <input
                          type="date"
                          value={photo.capturedAt}
                          onChange={(e) => handlePhotoUpdate(index, 'capturedAt', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          撮影時の年齢
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={photo.ageAtCapture ?? ''}
                          onChange={(e) => handlePhotoUpdate(index, 'ageAtCapture', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="例: 5"
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        メモ・説明
                      </label>
                      <input
                        type="text"
                        value={photo.description}
                        onChange={(e) => handlePhotoUpdate(index, 'description', e.target.value)}
                        placeholder="例: 保育園の運動会"
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 削除ボタン */}
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
}
