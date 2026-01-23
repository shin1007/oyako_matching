import React from 'react';

interface UserHeaderProps {
  match: any;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ match }) => (
  <div className="rounded-lg bg-white p-4 shadow">
    <div className="flex items-center gap-4 mb-4">
      <div className="flex gap-2">
        {match.other_user_image ? (
          <img
            src={match.other_user_image}
            alt={match.other_user_name}
            className="h-12 w-12 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
            {match.other_user_role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {match.other_user_name}
        </h1>
        <p className="text-sm text-gray-900">
          {match.other_user_role === 'parent' ? '親' : '子'}
        </p>
        {match.status === 'blocked' && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">ブロック中</span>
        )}
      </div>
    </div>
    {/* 探している子どもの情報 */}
    {match.target_people && match.target_people.length > 0 && (
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-900 mb-2">この方が探している{match.other_user_role === 'parent' ? '子ども' : '親'}:</p>
        <div className="flex flex-wrap gap-2">
          {match.target_people.map((child: any) => (
            <div key={child.id} className="flex items-center gap-2 bg-blue-50 rounded p-2">
              {child.photo_url && (
                <img
                  src={child.photo_url}
                  alt={`${child.last_name_kanji || ''}${child.first_name_kanji || ''}`}
                  className="h-10 w-10 rounded object-cover border border-gray-200"
                />
              )}
              <p className="text-sm font-semibold text-gray-900">
                {child.last_name_kanji || ''}{child.first_name_kanji || ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);