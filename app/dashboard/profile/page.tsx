'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { PREFECTURES, COMMON_MUNICIPALITIES } from '@/lib/constants/prefectures';

interface SearchingChild {
  id?: string;
  birthDate: string;
  nameHiragana: string;
  nameKanji: string;
  lastNameKanji: string;
  lastNameHiragana: string;
  firstNameKanji: string;
  firstNameHiragana: string;
  gender: 'male' | 'female' | 'other' | '';
  birthplacePrefecture: string;
  birthplaceMunicipality: string;
  displayOrder: number;
}

export default function ProfilePage() {
  // 親のプロフィール
  const [fullName, setFullName] = useState('');
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

  // 子ども/親情報
  const [searchingChildren, setSearchingChildren] = useState<SearchingChild[]>([
    { 
      birthDate: '', 
      nameHiragana: '', 
      nameKanji: '',
      lastNameKanji: '',
      lastNameHiragana: '',
      firstNameKanji: '',
      firstNameHiragana: '',
      gender: '', 
      birthplacePrefecture: '',
      birthplaceMunicipality: '',
      displayOrder: 0 
    }
  ]);
  const [userRole, setUserRole] = useState<'parent' | 'child' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

      // Load user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (userData?.role) {
        setUserRole(userData.role as 'parent' | 'child');
      }

      // Load profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
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
      }

      // Load searching children
      const { data: childrenData, error: childrenError } = await supabase
        .from('searching_children')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (childrenData && childrenData.length > 0) {
        setSearchingChildren(childrenData.map(child => ({
          id: child.id,
          birthDate: child.birth_date || '',
          nameHiragana: child.name_hiragana || '',
          nameKanji: child.name_kanji || '',
          lastNameKanji: (child as any).last_name_kanji || '',
          lastNameHiragana: (child as any).last_name_hiragana || '',
          firstNameKanji: (child as any).first_name_kanji || '',
          firstNameHiragana: (child as any).first_name_hiragana || '',
          gender: child.gender || '',
          birthplacePrefecture: (child as any).birthplace_prefecture || '',
          birthplaceMunicipality: (child as any).birthplace_municipality || '',
          displayOrder: child.display_order
        })));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // Save profile with new fields
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          last_name_kanji: lastNameKanji || null,
          last_name_hiragana: lastNameHiragana || null,
          first_name_kanji: firstNameKanji || null,
          first_name_hiragana: firstNameHiragana || null,
          birth_date: birthDate,
          birthplace_prefecture: birthplacePrefecture || null,
          birthplace_municipality: birthplaceMunicipality || null,
          bio: bio,
          gender: parentGender || null,
          forum_display_name: forumDisplayName || null,
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Delete all existing searching children
      await supabase
        .from('searching_children')
        .delete()
        .eq('user_id', user.id);

      // Insert new searching children (only non-empty ones)
      const childrenToInsert = searchingChildren
        .filter(child => 
          child.birthDate || child.nameHiragana || child.nameKanji || 
          child.lastNameKanji || child.lastNameHiragana || 
          child.firstNameKanji || child.firstNameHiragana || 
          child.gender || child.birthplacePrefecture || child.birthplaceMunicipality
        )
        .map((child, index) => ({
          user_id: user.id,
          birth_date: child.birthDate || null,
          name_hiragana: child.nameHiragana || null,
          name_kanji: child.nameKanji || null,
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
        const { error: childrenError } = await supabase
          .from('searching_children')
          .insert(childrenToInsert);

        if (childrenError) throw childrenError;
      }

      setSuccess('プロフィールを保存しました');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload to get IDs
      await loadProfile();
    } catch (err: any) {
      const message = String(err?.message || 'プロフィールの保存に失敗しました');
      if (message.includes("Could not find the table")) {
        setError('必要なテーブルがありません。Supabaseのマイグレーション（001_initial_schema.sql, 006_multiple_searching_children.sql）を実行してから再試行してください。');
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
        nameHiragana: '', 
        nameKanji: '',
        lastNameKanji: '',
        lastNameHiragana: '',
        firstNameKanji: '',
        firstNameHiragana: '',
        gender: '',
        birthplacePrefecture: '',
        birthplaceMunicipality: '',
        displayOrder: searchingChildren.length 
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

  const handleDeleteAccount = async () => {
    if (deleting) return; // Prevent double submission
    
    setDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アカウントの削除に失敗しました');
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  氏名（統合用）
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="例: 山田太郎"
                />
                <p className="mt-1 text-xs text-gray-500">後方互換性のために保持されています</p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">詳細な氏名情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="lastNameKanji" className="block text-sm font-medium text-gray-700">
                        苗字（漢字）
                      </label>
                      <input
                        id="lastNameKanji"
                        type="text"
                        value={lastNameKanji}
                        onChange={(e) => setLastNameKanji(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        placeholder="例: 山田"
                      />
                    </div>
                    <div>
                      <label htmlFor="firstNameKanji" className="block text-sm font-medium text-gray-700">
                        名前（漢字）
                      </label>
                      <input
                        id="firstNameKanji"
                        type="text"
                        value={firstNameKanji}
                        onChange={(e) => setFirstNameKanji(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        placeholder="例: 太郎"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="lastNameHiragana" className="block text-sm font-medium text-gray-700">
                        苗字（ひらがな）
                      </label>
                      <input
                        id="lastNameHiragana"
                        type="text"
                        value={lastNameHiragana}
                        onChange={(e) => setLastNameHiragana(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        placeholder="例: やまだ"
                      />
                    </div>
                    <div>
                      <label htmlFor="firstNameHiragana" className="block text-sm font-medium text-gray-700">
                        名前（ひらがな）
                      </label>
                      <input
                        id="firstNameHiragana"
                        type="text"
                        value={firstNameHiragana}
                        onChange={(e) => setFirstNameHiragana(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        placeholder="例: たろう"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  生年月日
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">出身地</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="birthplacePrefecture" className="block text-sm font-medium text-gray-700">
                      都道府県
                    </label>
                    <select
                      id="birthplacePrefecture"
                      value={birthplacePrefecture}
                      onChange={(e) => {
                        setBirthplacePrefecture(e.target.value);
                        // Reset municipality when prefecture changes
                        setBirthplaceMunicipality('');
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map(prefecture => (
                        <option key={prefecture} value={prefecture}>{prefecture}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="birthplaceMunicipality" className="block text-sm font-medium text-gray-700">
                      市区町村
                    </label>
                    <input
                      id="birthplaceMunicipality"
                      type="text"
                      value={birthplaceMunicipality}
                      onChange={(e) => setBirthplaceMunicipality(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      placeholder="例: 渋谷区、北区"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="parentGender" className="block text-sm font-medium text-gray-700">
                  性別（親）
                </label>
                <select
                  id="parentGender"
                  value={parentGender}
                  onChange={(e) => setParentGender(e.target.value as typeof parentGender)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">未選択</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                  <option value="prefer_not_to_say">回答しない</option>
                </select>
              </div>

              <div>
                <label htmlFor="forumDisplayName" className="block text-sm font-medium text-gray-700">
                  掲示板での表示名
                </label>
                <input
                  id="forumDisplayName"
                  type="text"
                  value={forumDisplayName}
                  onChange={(e) => setForumDisplayName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="例: ゆうこママ、たろうパパ"
                />
                <p className="mt-1 text-sm text-gray-500">
                  ピアサポート掲示板で表示される名前です。本名を避け、ニックネームを設定することをお勧めします。
                </p>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  自己紹介
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="簡単な自己紹介を記入してください"
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {userRole === 'child' ? '探している親の情報' : '探している子どもの情報'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {userRole === 'child' 
                    ? '親子マッチングのための情報です。任意項目です。' 
                    : '親子マッチングのための情報です。任意項目です。最大5人まで登録できます。'}
                </p>

                <div className="space-y-6">
                  {searchingChildren.map((child, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg relative">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          {userRole === 'child' ? '親' : '子ども'} {index + 1}
                        </h4>
                        {searchingChildren.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSearchingChild(index)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label htmlFor={`searchingChildBirthDate-${index}`} className="block text-sm font-medium text-gray-700">
                            生年月日
                          </label>
                          <input
                            id={`searchingChildBirthDate-${index}`}
                            type="date"
                            value={child.birthDate}
                            onChange={(e) => updateSearchingChild(index, 'birthDate', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={`searchingChildGender-${index}`} className="block text-sm font-medium text-gray-700">
                            性別
                          </label>
                          <select
                            id={`searchingChildGender-${index}`}
                            value={child.gender}
                            onChange={(e) => updateSearchingChild(index, 'gender', e.target.value as SearchingChild['gender'])}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">未選択</option>
                            <option value="male">男性</option>
                            <option value="female">女性</option>
                            <option value="other">その他</option>
                          </select>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-md">
                          <h5 className="text-xs font-semibold text-gray-600 mb-3">詳細な氏名（後方互換性用）</h5>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label htmlFor={`searchingChildNameHiragana-${index}`} className="block text-xs font-medium text-gray-600">
                                名前（ひらがな）
                              </label>
                              <input
                                id={`searchingChildNameHiragana-${index}`}
                                type="text"
                                value={child.nameHiragana}
                                onChange={(e) => updateSearchingChild(index, 'nameHiragana', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                placeholder="例: たろう"
                              />
                            </div>
                            <div>
                              <label htmlFor={`searchingChildNameKanji-${index}`} className="block text-xs font-medium text-gray-600">
                                名前（漢字）
                              </label>
                              <input
                                id={`searchingChildNameKanji-${index}`}
                                type="text"
                                value={child.nameKanji}
                                onChange={(e) => updateSearchingChild(index, 'nameKanji', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                placeholder="例: 太郎"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">新形式：詳細な氏名</label>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`searchingChildLastNameKanji-${index}`} className="block text-xs font-medium text-gray-600">
                                  苗字（漢字）
                                </label>
                                <input
                                  id={`searchingChildLastNameKanji-${index}`}
                                  type="text"
                                  value={child.lastNameKanji}
                                  onChange={(e) => updateSearchingChild(index, 'lastNameKanji', e.target.value)}
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  placeholder="例: 山田"
                                />
                              </div>
                              <div>
                                <label htmlFor={`searchingChildFirstNameKanji-${index}`} className="block text-xs font-medium text-gray-600">
                                  名前（漢字）
                                </label>
                                <input
                                  id={`searchingChildFirstNameKanji-${index}`}
                                  type="text"
                                  value={child.firstNameKanji}
                                  onChange={(e) => updateSearchingChild(index, 'firstNameKanji', e.target.value)}
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  placeholder="例: 太郎"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`searchingChildLastNameHiragana-${index}`} className="block text-xs font-medium text-gray-600">
                                  苗字（ひらがな）
                                </label>
                                <input
                                  id={`searchingChildLastNameHiragana-${index}`}
                                  type="text"
                                  value={child.lastNameHiragana}
                                  onChange={(e) => updateSearchingChild(index, 'lastNameHiragana', e.target.value)}
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  placeholder="例: やまだ"
                                />
                              </div>
                              <div>
                                <label htmlFor={`searchingChildFirstNameHiragana-${index}`} className="block text-xs font-medium text-gray-600">
                                  名前（ひらがな）
                                </label>
                                <input
                                  id={`searchingChildFirstNameHiragana-${index}`}
                                  type="text"
                                  value={child.firstNameHiragana}
                                  onChange={(e) => updateSearchingChild(index, 'firstNameHiragana', e.target.value)}
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  placeholder="例: たろう"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">出身地</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor={`searchingChildBirthplacePrefecture-${index}`} className="block text-xs font-medium text-gray-600">
                                都道府県
                              </label>
                              <select
                                id={`searchingChildBirthplacePrefecture-${index}`}
                                value={child.birthplacePrefecture}
                                onChange={(e) => updateSearchingChild(index, 'birthplacePrefecture', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                              >
                                <option value="">選択</option>
                                {PREFECTURES.map(prefecture => (
                                  <option key={prefecture} value={prefecture}>{prefecture}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`searchingChildBirthplaceMunicipality-${index}`} className="block text-xs font-medium text-gray-600">
                                市区町村
                              </label>
                              <input
                                id={`searchingChildBirthplaceMunicipality-${index}`}
                                type="text"
                                value={child.birthplaceMunicipality}
                                onChange={(e) => updateSearchingChild(index, 'birthplaceMunicipality', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                placeholder="例: 渋谷区"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {searchingChildren.length < 5 && (
                    <button
                      type="button"
                      onClick={addSearchingChild}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      + {userRole === 'child' ? '親' : '子ども'}を追加
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : 'プロフィールを保存'}
              </button>
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

              {showDeleteWarning && !showDeleteConfirm && (
                <div className="rounded-lg bg-red-50 p-6 border border-red-200">
                  <h4 className="text-lg font-medium text-red-900 mb-3">
                    ⚠️ 警告：アカウント削除について
                  </h4>
                  <div className="text-sm text-red-800 mb-4 space-y-2">
                    <p>以下のデータが完全に削除されます：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>プロフィール情報</li>
                      <li>{userRole === 'child' ? '探している親の情報' : '探している子どもの情報'}</li>
                      <li>思い出エピソード</li>
                      <li>タイムカプセル</li>
                      <li>マッチング情報とメッセージ</li>
                      <li>掲示板の投稿とコメント</li>
                      <li>サブスクリプション情報</li>
                      <li>パスキー認証情報</li>
                    </ul>
                    <p className="font-semibold mt-3">
                      この操作は取り消すことができません。
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteWarning(false)}
                      className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteWarning(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      削除を続行
                    </button>
                  </div>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="rounded-lg bg-red-50 p-6 border-2 border-red-300">
                  <h4 className="text-lg font-medium text-red-900 mb-3">
                    🚨 最終確認
                  </h4>
                  <p className="text-sm text-red-800 mb-4">
                    本当にアカウントを削除しますか？すべてのデータが完全に削除され、元に戻すことはできません。
                  </p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? '削除中...' : '完全に削除する'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
