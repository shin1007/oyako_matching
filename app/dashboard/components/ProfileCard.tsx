"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface ProfileCardProps {
  userRole: string;
  profile: any;
}

export function ProfileCard({ userRole, profile }: ProfileCardProps) {
  // プレビュー拡大用モーダル
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  return (
    <div className={`rounded-lg ${userRole === 'child' ? 'bg-child-100 border-2 border-child-200' : 'bg-parent-100 border-2 border-parent-200'} p-6 shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-xl font-semibold ${userRole === 'child' ? 'text-child-900' : 'text-parent-900'}`}>プロフィール</h2>
          <p className={`text-sm mt-1 font-medium ${userRole === 'child' ? 'text-child-700' : 'text-parent-700'}`}>
            {userRole === 'parent' ? '親アカウント' : '子アカウント'}
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'} transition-colors`}
        >
          プロフィール編集
        </Link>
      </div>
      {profile ? (
        <div className="space-y-4">
          {/* Profile Image */}
          <div className="flex justify-center">
            {profile.profile_image_url ? (
              <>
                <img
                  src={profile.profile_image_url}
                  alt="プロフィール画像"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 cursor-pointer"
                  onClick={() => setShowPreviewModal(true)}
                />
                {showPreviewModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setShowPreviewModal(false)}>
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                      <img
                        src={profile.profile_image_url}
                        alt="拡大プロフィール画像"
                        className="max-w-full max-h-[80vh] rounded-lg border-2 border-gray-200"
                      />
                      <button
                        className="mt-4 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        onClick={() => setShowPreviewModal(false)}
                      >閉じる</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`w-24 h-24 rounded-full ${userRole === 'child' ? 'bg-gradient-to-br from-child-400 to-child-600' : 'bg-gradient-to-br from-parent-400 to-parent-600'} flex items-center justify-center text-white text-3xl font-bold`}>
                {(profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) ? 
                  (profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) : 
                  <span className="text-5xl">👤</span>
                }
              </div>
            )}
          </div>
          {/* Name */}
          <div>
            <p className={`text-sm ${userRole === 'child' ? 'text-child-700' : 'text-parent-700'}`}>氏名</p>
            <p className={`text-lg font-medium ${userRole === 'child' ? 'text-orange-900' : 'text-green-900'}`}>
              {profile.last_name_kanji && profile.first_name_kanji
                ? `${profile.last_name_kanji} ${profile.first_name_kanji}`
                : '未設定'}
            </p>
            {profile.last_name_hiragana && profile.first_name_hiragana && (
              <p className={`text-sm ${userRole === 'child' ? 'text-orange-600' : 'text-green-600'}`}>
                {profile.last_name_hiragana} {profile.first_name_hiragana}
              </p>
            )}
          </div>
          {/* Birth Date */}
          {profile.birth_date && (
            <div>
              <p className={`text-sm ${userRole === 'child' ? 'text-orange-700' : 'text-green-700'}`}>生年月日</p>
              <p className={userRole === 'child' ? 'text-orange-900' : 'text-green-900'}>
                {new Date(profile.birth_date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
          {/* Gender */}
          {profile.gender && (
            <div>
              <p className={`text-sm ${userRole === 'child' ? 'text-orange-700' : 'text-green-700'}`}>性別</p>
              <p className={userRole === 'child' ? 'text-orange-900' : 'text-green-900'}>
                {(() => {
                  const genderMap: Record<string, string> = {
                    'male': '男性',
                    'female': '女性',
                    'other': 'その他',
                    'prefer_not_to_say': '回答しない'
                  };
                  return genderMap[profile.gender] || '未設定';
                })()}
              </p>
            </div>
          )}
          {/* Birthplace */}
          {(profile.birthplace_prefecture || profile.birthplace_municipality) && (
            <div>
              <p className={`text-sm ${userRole === 'child' ? 'text-orange-700' : 'text-green-700'}`}>出身地</p>
              <p className={userRole === 'child' ? 'text-orange-900' : 'text-green-900'}>
                {profile.birthplace_prefecture}
                {profile.birthplace_municipality && ` ${profile.birthplace_municipality}`}
              </p>
            </div>
          )}
          {/* Bio */}
          {profile.bio && (
            <div>
              <p className={`text-sm ${userRole === 'child' ? 'text-orange-700' : 'text-green-700'}`}>自己紹介</p>
              <p className={`${userRole === 'child' ? 'text-orange-900' : 'text-green-900'} text-sm line-clamp-3`}>
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">👤</div>
          <p className={`${userRole === 'child' ? 'text-orange-700' : 'text-green-700'} mb-4`}>プロフィール情報が未設定です</p>
          <Link
            href="/dashboard/profile"
            className={`inline-block rounded-lg ${userRole === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm text-white`}
          >
            プロフィールを作成
          </Link>
        </div>
      )}
    </div>
  );
}
