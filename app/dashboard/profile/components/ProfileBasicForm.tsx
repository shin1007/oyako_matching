import React from 'react';

type ParentGender = '' | 'male' | 'female' | 'other' | 'prefer_not_to_say';
interface ProfileBasicFormProps {
  lastNameKanji: string;
  setLastNameKanji: (v: string) => void;
  lastNameHiragana: string;
  setLastNameHiragana: (v: string) => void;
  firstNameKanji: string;
  setFirstNameKanji: (v: string) => void;
  firstNameHiragana: string;
  setFirstNameHiragana: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  birthplacePrefecture: string;
  setBirthplacePrefecture: (v: string) => void;
  birthplaceMunicipality: string;
  setBirthplaceMunicipality: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  parentGender: ParentGender;
  setParentGender: (v: ParentGender) => void;
  forumDisplayName: string;
  setForumDisplayName: (v: string) => void;
  userRole: 'parent' | 'child' | null;
  loading?: boolean;
}

import { PREFECTURES } from '@/lib/constants/prefectures';
export const ProfileBasicForm: React.FC<ProfileBasicFormProps> = ({
  lastNameKanji, setLastNameKanji,
  lastNameHiragana, setLastNameHiragana,
  firstNameKanji, setFirstNameKanji,
  firstNameHiragana, setFirstNameHiragana,
  birthDate, setBirthDate,
  birthplacePrefecture, setBirthplacePrefecture,
  birthplaceMunicipality, setBirthplaceMunicipality,
  bio, setBio,
  parentGender, setParentGender,
  forumDisplayName, setForumDisplayName,
  userRole, loading
}) => (
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
              value={lastNameKanji}
              onChange={e => setLastNameKanji(e.target.value)}
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
              value={firstNameKanji}
              onChange={e => setFirstNameKanji(e.target.value)}
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
              value={lastNameHiragana}
              onChange={e => setLastNameHiragana(e.target.value)}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: やまだ"
            />
          </div>
          <div>
            <label htmlFor="firstNameHiragana" className="block text-sm font-medium text-gray-700">
              名前（ひらがな）
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
            </label>
            <input
              id="firstNameHiragana"
              type="text"
              value={firstNameHiragana}
              onChange={e => setFirstNameHiragana(e.target.value)}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
              placeholder="例: たろう"
            />
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
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
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
            value={birthplacePrefecture}
            onChange={e => {
              setBirthplacePrefecture(e.target.value);
              setBirthplaceMunicipality('');
            }}
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
            value={birthplaceMunicipality}
            onChange={e => setBirthplaceMunicipality(e.target.value)}
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
        value={parentGender}
        onChange={e => setParentGender(e.target.value as ParentGender)}
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
        value={forumDisplayName}
        onChange={e => setForumDisplayName(e.target.value)}
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
        value={bio}
        onChange={e => setBio(e.target.value)}
        rows={4}
        className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-gray-900`}
        placeholder="簡単な自己紹介を記入してください"
      />
    </div>
  </>
);
