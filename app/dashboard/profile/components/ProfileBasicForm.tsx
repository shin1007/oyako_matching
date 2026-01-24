import React from 'react';
import { ProfileBase } from '@/types/profile';

interface ProfileBasicFormProps {
  profile: ProfileBase;
  setProfile: (profile: ProfileBase) => void;
  loading?: boolean;
  userRole?: string;
}

import { PREFECTURES } from '@/lib/constants/prefectures';
import { isHiragana } from '@/lib/validation/hiragana';
import { katakanaToHiragana } from '@/lib/validation/kana';
export const ProfileBasicForm: React.FC<ProfileBasicFormProps> = ({
  profile,
  setProfile,
  loading,
  userRole
}) => {
  // ひらがなバリデーション用エラー
  const [hiraganaError, setHiraganaError] = React.useState<{ last: string; first: string }>({ last: '', first: '' });

  const handleLastNameKanjiChange = (v: string) => setProfile({ ...profile, lastNameKanji: v });
  const handleFirstNameKanjiChange = (v: string) => setProfile({ ...profile, firstNameKanji: v });
  const handleLastNameHiraganaChange = (v: string) => {
    const hira = katakanaToHiragana(v);
    setProfile({ ...profile, lastNameHiragana: hira });
    if (hira && !isHiragana(hira)) {
      setHiraganaError(e => ({ ...e, last: 'ひらがなのみで入力してください' }));
    } else {
      setHiraganaError(e => ({ ...e, last: '' }));
    }
  };
  const handleFirstNameHiraganaChange = (v: string) => {
    const hira = katakanaToHiragana(v);
    setProfile({ ...profile, firstNameHiragana: hira });
    if (hira && !isHiragana(hira)) {
      setHiraganaError(e => ({ ...e, first: 'ひらがなのみで入力してください' }));
    } else {
      setHiraganaError(e => ({ ...e, first: '' }));
    }
  };
  const handleBirthDateChange = (v: string) => setProfile({ ...profile, birthDate: v });
  const handleBirthplacePrefectureChange = (v: string) => setProfile({ ...profile, birthplacePrefecture: v, birthplaceMunicipality: '' });
  const handleBirthplaceMunicipalityChange = (v: string) => setProfile({ ...profile, birthplaceMunicipality: v });
  const handleBioChange = (v: string) => setProfile({ ...profile, bio: v });
  const handleRoleChange = (v: 'parent' | 'child' | string) => setProfile({ ...profile, role: v });
  return (
    <>
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-3">詳細な氏名情報</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastNameKanji" className="block text-sm font-medium text-gray-700">
              苗字（漢字）<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="lastNameKanji"
              type="text"
              value={profile.lastNameKanji || ''}
              onChange={e => handleLastNameKanjiChange(e.target.value)}
              required
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: 山田"
            />
          </div>
          <div>
            <label htmlFor="firstNameKanji" className="block text-sm font-medium text-gray-700">
              名前（漢字）<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="firstNameKanji"
              type="text"
              value={profile.firstNameKanji || ''}
              onChange={e => handleFirstNameKanjiChange(e.target.value)}
              required
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: 太郎"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastNameHiragana" className="block text-sm font-medium text-gray-700">
              苗字（ひらがな）
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
            </label>
            <input
              id="lastNameHiragana"
              type="text"
              value={profile.lastNameHiragana || ''}
              onChange={e => handleLastNameHiraganaChange(e.target.value)}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: やまだ"
            />
            {hiraganaError.last && (
              <p className="mt-1 text-xs text-red-600">{hiraganaError.last}</p>
            )}
          </div>
          <div>
            <label htmlFor="firstNameHiragana" className="block text-sm font-medium text-gray-700">
              名前（ひらがな）
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
            </label>
            <input
              id="firstNameHiragana"
              type="text"
              value={profile.firstNameHiragana || ''}
              onChange={e => handleFirstNameHiraganaChange(e.target.value)}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: たろう"
            />
            {hiraganaError.first && (
              <p className="mt-1 text-xs text-red-600">{hiraganaError.first}</p>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          氏名が一致するとマッチング度が+10点向上します。
        </p>
      </div>
    </div>

    <div>
      <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
        生年月日
        <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>🎯 マッチングで最重要</span>
      </label>
      <input
        id="birthDate"
        type="date"
        value={profile.birthDate || ''}
        onChange={e => handleBirthDateChange(e.target.value)}
        required
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
      />
      <p className="mt-1 text-xs text-gray-500">
        完全一致で基本スコア80点。年月のみ一致でも60点。マッチングに最も重要な項目です。
      </p>
    </div>

    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-3">
        出身地
        <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="birthplacePrefecture" className="block text-sm font-medium text-gray-700">
            都道府県
          </label>
          <select
            id="birthplacePrefecture"
            value={profile.birthplacePrefecture || ''}
            onChange={e => handleBirthplacePrefectureChange(e.target.value)}
            className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1`}
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
            value={profile.birthplaceMunicipality || ''}
            onChange={e => handleBirthplaceMunicipalityChange(e.target.value)}
            className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
            placeholder="例: 渋谷区、北区"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        都道府県が一致するとマッチング度が+10点向上します。市区町村まで一致するとさらに精度が上がります。
      </p>
    </div>

    <div>
      <label htmlFor="parentGender" className="block text-sm font-medium text-gray-700">
        性別（親）
        <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>⚠️ 逆方向マッチングで必須</span>
      </label>
      <select
        id="parentGender"
        value={profile.role}
        onChange={e => handleRoleChange(e.target.value as 'parent' | 'child' | string)}
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1`}
      >
        <option value="">未選択</option>
        <option value="male">男性</option>
        <option value="female">女性</option>
        <option value="other">その他</option>
        <option value="prefer_not_to_say">回答しない</option>
      </select>
      <p className="mt-1 text-xs text-gray-500">
        相手が親を探している場合、性別が一致しないと候補から除外されます。
      </p>
    </div>

    <div>
      <label htmlFor="forumDisplayName" className="block text-sm font-medium text-gray-700">
        掲示板での表示名
      </label>
      <input
        id="forumDisplayName"
        type="text"
        value={profile.forumDisplayName || ''}
        onChange={e => setProfile({ ...profile, forumDisplayName: e.target.value })}
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
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
        value={profile.bio || ''}
        onChange={e => handleBioChange(e.target.value)}
        rows={4}
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
        placeholder="簡単な自己紹介を記入してください"
      />
    </div>
    </>
  );
};
