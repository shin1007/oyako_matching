"use client";
import React, { useState } from 'react';
import { getGenderLabel } from '@/app/components/matching/matchingUtils';

interface ProfileCardProps {
  target: {
    photo_url?: string | null;
    last_name_kanji?: string;
    first_name_kanji?: string;
    gender?: string;
    birth_date?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
  };
  userRole: string | null;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ target, userRole }) => {
  return <ProfileCardInner target={target} userRole={userRole} />;
};

const ProfileCardInner: React.FC<ProfileCardProps> = ({ target, userRole }) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center p-6 min-w-[220px] h-full">
      {target.photo_url && (
        <>
          <img
            src={target.photo_url}
            alt="プロフィール写真"
            className="w-24 h-24 rounded-lg object-cover mb-2 border border-gray-200 cursor-pointer"
            onClick={() => setShowPreviewModal(true)}
          />
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setShowPreviewModal(false)}>
              <div className="bg-white rounded-lg p-4 max-w-lg w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <img
                  src={target.photo_url}
                  alt="拡大プロフィール写真"
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
      )}
      <div className="font-bold text-lg text-gray-900 mb-1">{target.last_name_kanji}{target.first_name_kanji}</div>
      <div className="text-sm text-gray-600 mb-1">性別: {getGenderLabel(target.gender, userRole === 'parent' ? 'child' : 'parent')}</div>
      <div className="text-sm text-gray-600">生年月日: {target.birth_date}</div>
      <div className="text-sm text-gray-600">出身地: {target.birthplace_prefecture} {target.birthplace_municipality}</div>
    </div>
  );
};
