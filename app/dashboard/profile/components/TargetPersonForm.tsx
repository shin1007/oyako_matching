import React from 'react';
import { PREFECTURES } from '@/lib/constants/prefectures';
import { TargetPhotoManager } from './TargetPhotoManager';

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

interface TargetPersonFormProps {
  searchingChildren: SearchingChild[];
  updateSearchingChild: (index: number, field: keyof SearchingChild, value: string) => void;
  updateSearchingChildPhotos: (index: number, photos: Photo[]) => void;
  removeSearchingChild: (index: number) => void;
  addSearchingChild: () => void;
  userRole: 'parent' | 'child' | null;
  loading: boolean;
}

export const TargetPersonForm: React.FC<TargetPersonFormProps> = ({
  searchingChildren,
  updateSearchingChild,
  updateSearchingChildPhotos,
  removeSearchingChild,
  addSearchingChild,
  userRole,
  loading
}) => (
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
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>🎯 最重要（最大80点）</span>
            </label>
            <input
              id={`searchingChildBirthDate-${index}`}
              type="date"
              value={child.birthDate}
              onChange={e => updateSearchingChild(index, 'birthDate', e.target.value)}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1`}
            />
          </div>
          <div>
            <label htmlFor={`searchingChildGender-${index}`} className="block text-sm font-medium text-gray-700">
              性別
              {userRole === 'child' && <span className="ml-2 text-xs text-red-600">⚠️ 必須チェック</span>}
            </label>
            <select
              id={`searchingChildGender-${index}`}
              value={child.gender}
              onChange={e => updateSearchingChild(index, 'gender', e.target.value as SearchingChild['gender'])}
              className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1`}
            >
              <option value="">未選択</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
            {userRole === 'child' && (
              <p className="mt-1 text-xs text-gray-500">
                性別が不一致の場合、候補から除外されます
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新形式：詳細な氏名
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
            </label>
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
                    onChange={e => updateSearchingChild(index, 'lastNameKanji', e.target.value)}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
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
                    onChange={e => updateSearchingChild(index, 'firstNameKanji', e.target.value)}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
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
                    onChange={e => updateSearchingChild(index, 'lastNameHiragana', e.target.value)}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
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
                    onChange={e => updateSearchingChild(index, 'firstNameHiragana', e.target.value)}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
                    placeholder="例: たろう"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出身地
              <span className={`ml-2 text-xs ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>+10点</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`searchingChildBirthplacePrefecture-${index}`} className="block text-xs font-medium text-gray-600">
                  都道府県
                </label>
                <select
                  id={`searchingChildBirthplacePrefecture-${index}`}
                  value={child.birthplacePrefecture}
                  onChange={e => updateSearchingChild(index, 'birthplacePrefecture', e.target.value)}
                  className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
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
                  onChange={e => updateSearchingChild(index, 'birthplaceMunicipality', e.target.value)}
                  className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 shadow-sm ${userRole === 'child' ? 'focus:border-child-500 focus:ring-child-500' : 'focus:border-parent-500 focus:ring-parent-500'} focus:outline-none focus:ring-1 text-sm`}
                  placeholder="例: 渋谷区"
                />
              </div>
            </div>
          </div>
          <div>
            <TargetPhotoManager
              photos={child.photos || []}
              setPhotos={photos => updateSearchingChildPhotos(index, photos)}
              loading={loading}
              userRole={userRole === 'parent' ? 'parent' : 'child'}
            />
          </div>
        </div>
      </div>
    ))}
    {searchingChildren.length < 5 && (
      <button
        type="button"
        onClick={addSearchingChild}
        className={`w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 ${userRole === 'child' ? 'hover:border-child-500 hover:text-child-600' : 'hover:border-parent-500 hover:text-parent-600'} transition-colors`}
      >
        + {userRole === 'child' ? '親' : '子ども'}を追加
      </button>
    )}
  </div>
);
