import { apiRequest } from '@/lib/api/request';
'use client';
import { DeleteProfileDialog } from './components/DeleteProfileDialog';
import { ProfileImageUpload } from './components/ProfileImageUpload';
import { useState, useEffect, useRef } from 'react';
import { useRoleTheme } from '@/contexts/RoleThemeContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { PREFECTURES, COMMON_MUNICIPALITIES } from '@/lib/constants/prefectures';
import ImageUpload from '@/app/components/ImageUpload';
import { TargetPhotoManager } from './components/TargetPhotoManager';
import { TargetPersonInfoHeader } from './components/TargetPersonInfoHeader';
import { ProfileBasicForm } from './components/ProfileBasicForm';
import { TargetPersonForm } from './components/TargetPersonForm';

interface Photo {
  id?: string;
  photoUrl: string;
  capturedAt: string;
  ageAtCapture: number | null;
  description: string;
  displayOrder: number;
}

interface SearchingChild {
  id?: string;
  birthDate: string;
  lastNameKanji: string;
  lastNameHiragana: string;
  firstNameKanji: string;
  firstNameHiragana: string;
  gender: 'male' | 'female' | 'other' | '';
  birthplacePrefecture: string;
  birthplaceMunicipality: string;
  displayOrder: number;
  photos?: Photo[];
}

export default function ProfilePage() {
  const { userRole, setUserRole } = useRoleTheme();
  // 親のプロフィール
  const [lastNameKanji, setLastNameKanji] = useState('');
  const [lastNameHiragana, setLastNameHiragana] = useState('');
  const [firstNameKanji, setFirstNameKanji] = useState('');
  const [firstNameHiragana, setFirstNameHiragana] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthplacePrefecture, setBirthplacePrefecture] = useState('');
  const [birthplaceMunicipality, setBirthplaceMunicipality] = useState('');
  const [bio, setBio] = useState('');
  const [parentGender, setParentGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [forumDisplayName, setForumDisplayName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // 子ども/親情報
  const [searchingChildren, setSearchingChildren] = useState<SearchingChild[]>([
    { 
      birthDate: '', 
      lastNameKanji: '',
      lastNameHiragana: '',
      firstNameKanji: '',
      firstNameHiragana: '',
      gender: '', 
      birthplacePrefecture: '',
      birthplaceMunicipality: '',
      displayOrder: 0,
      photos: []
    }
  ]);
  // userRole, setUserRoleは上で宣言済み
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const tempImagePathRef = useRef<string | null>(null);
  const hasSavedRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Load user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (userData?.role) {
        setUserRole(userData.role as 'parent' | 'child'); // グローバルテーマにも反映
      }

      // Load profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setLastNameKanji((data as any).last_name_kanji || '');
        setLastNameHiragana((data as any).last_name_hiragana || '');
        setFirstNameKanji((data as any).first_name_kanji || '');
        setFirstNameHiragana((data as any).first_name_hiragana || '');
        setBirthDate(data.birth_date || '');
        setBirthplacePrefecture((data as any).birthplace_prefecture || '');
        setBirthplaceMunicipality((data as any).birthplace_municipality || '');
        setBio(data.bio || '');
        setParentGender((data as any).gender || '');
        setForumDisplayName((data as any).forum_display_name || '');
        setProfileImageUrl(data.profile_image_url || null);
        // プロフィール読み込み時点で保存済みの画像を基準にする
        tempImagePathRef.current = null;
        hasSavedRef.current = true;
      }

      // Load searching children
      const { data: childrenData, error: childrenError } = await supabase
        .from('target_people')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (childrenData && childrenData.length > 0) {
        // Load photos for each child
        const childrenWithPhotos = await Promise.all(
          childrenData.map(async (child) => {
            const { data: photosData } = await supabase
              .from('target_people_photos')
              .select('*')
              .eq('target_person_id', child.id)
              .order('display_order', { ascending: true });

            const photos: Photo[] = photosData?.map(photo => ({
              id: photo.id,
              photoUrl: photo.photo_url,
              capturedAt: photo.captured_at || '',
              ageAtCapture: photo.age_at_capture,
              description: photo.description || '',
              displayOrder: photo.display_order
            })) || [];

            return {
              id: child.id,
              birthDate: child.birth_date || '',
              lastNameKanji: (child as any).last_name_kanji || '',
              lastNameHiragana: (child as any).last_name_hiragana || '',
              firstNameKanji: (child as any).first_name_kanji || '',
              firstNameHiragana: (child as any).first_name_hiragana || '',
              gender: child.gender || '',
              birthplacePrefecture: (child as any).birthplace_prefecture || '',
              birthplaceMunicipality: (child as any).birthplace_municipality || '',
              displayOrder: child.display_order,
              photos
            };
          })
        );
        setSearchingChildren(childrenWithPhotos);
      }
    } catch (err: any) {
      // Profile might not exist yet or table is missing
      console.error(err);
      const message = String(err?.message || err);
      if (message.includes("Could not find the table 'public.profiles'")) {
        setError('プロフィールテーブルがデータベースに存在しません。Supabaseマイグレーションを適用してください（001_initial_schema.sql など）。');
      }
    } finally {
      setLoading(false);
    }
  };

  const extractProfilePath = (url: string | null) => {
    if (!url) return null;
    const parts = url.split('/profile-images/');
    return parts.length > 1 ? parts[1] : null;
  };

  const deleteTempImage = async () => {
    const path = tempImagePathRef.current;
    if (!path) return;
    try {
      await supabase.storage.from('profile-images').remove([path]);
    } catch (err) {
      console.error('一時アップロード画像の削除に失敗しました:', err);
    } finally {
      tempImagePathRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // バリデーション
    if (!lastNameKanji || !firstNameKanji) {
      setError('苗字（漢字）と名前（漢字）は必須です');
      setSaving(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // 画像をアップロードする場合
      let uploadedImageUrl = profileImageUrl;
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;
        
        // 既存の画像を削除
        if (profileImageUrl) {
          try {
            // Supabase Storage URLから相対パスを抽出
            // URL形式: https://{project}.supabase.co/storage/v1/object/public/profile-images/{user_id}/profile-xxx.jpg
            const urlParts = profileImageUrl.split('/profile-images/');
            if (urlParts.length > 1) {
              const oldPath = urlParts[1];
              await supabase.storage.from('profile-images').remove([oldPath]);
            }
          } catch (deleteError) {
            console.error('既存画像の削除に失敗しました:', deleteError);
            // 削除に失敗しても続行
          }
        }

        // 新しい画像をアップロード
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('profile-images')
          .upload(fileName, selectedImageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);
        
        uploadedImageUrl = publicUrl;
      }

      // Save profile with new fields (full_name は削除)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          last_name_kanji: lastNameKanji,
          last_name_hiragana: lastNameHiragana || null,
          first_name_kanji: firstNameKanji,
          first_name_hiragana: firstNameHiragana || null,
          birth_date: birthDate,
          birthplace_prefecture: birthplacePrefecture || null,
          birthplace_municipality: birthplaceMunicipality || null,
          bio: bio,
          gender: parentGender || null,
          forum_display_name: forumDisplayName || null,
          profile_image_url: uploadedImageUrl,
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Delete all existing searching children
      await supabase
        .from('target_people')
        .delete()
        .eq('user_id', user.id);

      // Insert new searching children (only non-empty ones)
      const childrenToInsert = searchingChildren
        .filter(child => 
          child.lastNameKanji || child.firstNameKanji ||
          child.birthDate || 
          child.lastNameHiragana || child.firstNameHiragana || 
          child.gender || child.birthplacePrefecture || child.birthplaceMunicipality
        )
        .map((child, index) => ({
          user_id: user.id,
          birth_date: child.birthDate || null,
          last_name_kanji: child.lastNameKanji || null,
          last_name_hiragana: child.lastNameHiragana || null,
          first_name_kanji: child.firstNameKanji || null,
          first_name_hiragana: child.firstNameHiragana || null,
          gender: child.gender || null,
          birthplace_prefecture: child.birthplacePrefecture || null,
          birthplace_municipality: child.birthplaceMunicipality || null,
          display_order: index
        }));

      if (childrenToInsert.length > 0) {
        const { data: insertedChildren, error: childrenError } = await supabase
          .from('target_people')
          .insert(childrenToInsert)
          .select();

        if (childrenError) throw childrenError;

        // Save photos for each child
        // Filter to get only non-empty children that were inserted
        const nonEmptyChildren = searchingChildren.filter(child => 
          child.lastNameKanji || child.firstNameKanji ||
          child.birthDate || 
          child.lastNameHiragana || child.firstNameHiragana || 
          child.gender || child.birthplacePrefecture || child.birthplaceMunicipality
        );

        if (insertedChildren && insertedChildren.length === nonEmptyChildren.length) {
          // Match children by display_order for more robust matching
          for (const insertedChild of insertedChildren) {
            const originalChild = nonEmptyChildren.find(
              child => child.displayOrder === insertedChild.display_order
            );

            if (originalChild?.photos && originalChild.photos.length > 0) {
              // Delete existing photos for this child
              await supabase
                .from('target_people_photos')
                .delete()
                .eq('target_person_id', insertedChild.id);

              // Insert new photos
              const photosToInsert = originalChild.photos.map((photo, photoIndex) => ({
                target_person_id: insertedChild.id,
                user_id: user.id,
                photo_url: photo.photoUrl,
                captured_at: photo.capturedAt || null,
                age_at_capture: photo.ageAtCapture,
                description: photo.description || null,
                display_order: photoIndex
              }));

              const { error: photosError } = await supabase
                .from('target_people_photos')
                .insert(photosToInsert);

              if (photosError) throw photosError;
            }
          }
        } else if (insertedChildren) {
          // Log warning if counts don't match
          console.warn(`Mismatch in children count: inserted ${insertedChildren.length}, expected ${nonEmptyChildren.length}`);
        }
      }

      setSuccess('プロフィールを保存しました');
      setTimeout(() => setSuccess(''), 3000);
      // 保存完了時は一時パスを破棄し保存済み扱いにする
      tempImagePathRef.current = null;
      hasSavedRef.current = true;
      
      // Reload to get IDs
      await loadProfile();
    } catch (err: any) {
      // 詳細なエラー内容を出力
      if (err && typeof err === 'object') {
        console.error('プロフィール保存エラー詳細:', {
          status: err.status,
          body: err.body,
          message: err.message,
          stack: err.stack,
          ...err
        });
      } else {
        console.error('プロフィール保存エラー:', err);
      }
      const message = String(err?.message || 'プロフィールの保存に失敗しました');
      if (message.includes("Could not find the table")) {
        setError('必要なテーブルがありません。Supabaseのマイグレーション（001_initial_schema.sql, 006_multiple_target_people.sql）を実行してから再試行してください。');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const addSearchingChild = () => {
    if (searchingChildren.length >= 5) {
      const message = userRole === 'child' ? '探している親は最大5人までです' : '探している子どもは最大5人までです';
      setError(message);
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSearchingChildren([
      ...searchingChildren,
      { 
        birthDate: '', 
        lastNameKanji: '',
        lastNameHiragana: '',
        firstNameKanji: '',
        firstNameHiragana: '',
        gender: '',
        birthplacePrefecture: '',
        birthplaceMunicipality: '',
        displayOrder: searchingChildren.length,
        photos: []
      }
    ]);
  };

  const removeSearchingChild = (index: number) => {
    if (searchingChildren.length <= 1) return;
    const newChildren = searchingChildren.filter((_, i) => i !== index);
    // Update display orders
    setSearchingChildren(newChildren.map((child, i) => ({
      ...child,
      displayOrder: i
    })));
  };

  const updateSearchingChild = (index: number, field: keyof SearchingChild, value: string) => {
    const newChildren = [...searchingChildren];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setSearchingChildren(newChildren);
  };

  const updateSearchingChildPhotos = (index: number, photos: Photo[]) => {
    const newChildren = [...searchingChildren];
    newChildren[index] = { ...newChildren[index], photos };
    setSearchingChildren(newChildren);
  };

  // ブラウザ戻る（アンマウント）やキャンセル時に、一時アップロードした画像を削除
  useEffect(() => {
    return () => {
      if (!hasSavedRef.current) {
        deleteTempImage();
      }
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (deleting) return; // Prevent double submission
    
    setDeleting(true);
    setError('');

    try {
      const res = await apiRequest('/api/auth/delete-account', { method: 'POST' });
      if (!res.ok) {
        throw new Error(res.error || 'アカウントの削除に失敗しました');
      }

      // Ensure session is signed out on client side
      await supabase.auth.signOut();
      
      // Small delay to ensure session is fully cleared
      await new Promise(resolve => setTimeout(resolve, 500));

      // Success - redirect to home page
      router.push('/?deleted=true');
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'アカウントの削除に失敗しました';
      
      // Translate Supabase rate limit error to Japanese
      if (errorMessage.includes('For security purposes')) {
        const match = errorMessage.match(/after (\d+) seconds?/);
        if (match) {
          const seconds = match[1];
          errorMessage = `セキュリティのため、${seconds}秒後に再試行してください。`;
        } else {
          errorMessage = 'セキュリティのため、しばらくしてから再試行してください。';
        }
      }
      
      setError(errorMessage);
      setShowDeleteConfirm(false);
      setShowDeleteWarning(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-2xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-8 shadow">

              {/* マッチングアルゴリズム説明へのリンク */}
              <div className={`mb-6 rounded-lg p-6 border bg-gradient-to-r ${userRole === 'child' ? 'from-orange-50 to-orange-100 border-child-200' : 'from-green-50 to-green-100 border-parent-200'}`}>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  プロフィールとマッチングスコアについて
                </h2>
                <div className="text-sm text-gray-700">
                  <p className="leading-relaxed mb-2">
                    入力した情報をもとに、親子双方の情報を比較し<strong className={userRole === 'child' ? 'text-child-700' : 'text-parent-700'}>マッチングスコア</strong>を自動計算します。
                  </p>
                  <a
                    href="/docs/MATCHING_ALGORITHM.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block mt-2 px-4 py-2 text-white rounded-lg transition-colors ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
                  >
                    マッチングアルゴリズムの詳細を見る
                  </a>
                </div>
              </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className={`rounded-lg p-4 text-sm ${userRole === 'child' ? 'bg-child-50 text-child-600' : 'bg-parent-50 text-parent-600'}`}>
                  {success}
                </div>
              )}

              {/* プロフィール画像 */}
              <ProfileImageUpload
                profileImageUrl={profileImageUrl}
                setProfileImageUrl={setProfileImageUrl}
                selectedImageFile={selectedImageFile}
                setSelectedImageFile={setSelectedImageFile}
                loading={loading}
                userRole={userRole}
              />

              <ProfileBasicForm
                lastNameKanji={lastNameKanji}
                setLastNameKanji={setLastNameKanji}
                firstNameKanji={firstNameKanji}
                setFirstNameKanji={setFirstNameKanji}
                lastNameHiragana={lastNameHiragana}
                setLastNameHiragana={setLastNameHiragana}
                firstNameHiragana={firstNameHiragana}
                setFirstNameHiragana={setFirstNameHiragana}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                birthplacePrefecture={birthplacePrefecture}
                setBirthplacePrefecture={setBirthplacePrefecture}
                birthplaceMunicipality={birthplaceMunicipality}
                setBirthplaceMunicipality={setBirthplaceMunicipality}
                parentGender={parentGender}
                setParentGender={setParentGender}
                forumDisplayName={forumDisplayName}
                setForumDisplayName={setForumDisplayName}
                bio={bio}
                setBio={setBio}
                userRole={userRole}
              />

              <div className="border-t border-gray-200 pt-6">
                <TargetPersonInfoHeader userRole={userRole} />


                {/* 写真管理（1人目のみ） */}
                <TargetPhotoManager
                  photos={searchingChildren[0]?.photos || []}
                  setPhotos={photos => updateSearchingChildPhotos(0, photos)}
                  loading={loading}
                  userRole={userRole}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 rounded-lg ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'} px-4 py-3 text-white disabled:opacity-50`}
                >
                  {saving ? '保存中...' : 'プロフィールを保存'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // 選択した画像をクリア（保存しない場合は破棄）
                    setSelectedImageFile(null);
                    // 一時アップロードを削除
                    deleteTempImage();
                    // プロフィール画像を元の状態に戻す
                    loadProfile();
                    setError('');
                    setSuccess('');
                    hasSavedRef.current = true;
                  }}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-gray-200 px-4 py-3 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </form>

            {/* Account Deletion Section */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                アカウント削除
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
              </p>
              
              {!showDeleteWarning && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteWarning(true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  退会する
                </button>
              )}

              <DeleteProfileDialog
                open={showDeleteWarning || showDeleteConfirm}
                onClose={() => {
                  setShowDeleteWarning(false);
                  setShowDeleteConfirm(false);
                }}
                onConfirm={() => {
                  setShowDeleteWarning(false);
                  setShowDeleteConfirm(false);
                  handleDeleteAccount();
                }}
                loading={deleting}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
