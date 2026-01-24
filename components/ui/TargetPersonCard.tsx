import React from 'react';

interface TargetPersonCardProps {
  photoUrl?: string | null;
  name: string;
  birthplace?: string;
  className?: string;
}

/**
 * 子ども・ターゲット情報の共通表示カード
 */
export const TargetPersonCard: React.FC<TargetPersonCardProps> = ({
  photoUrl,
  name,
  birthplace,
  className = '',
}) => (
  <div className={`flex items-center gap-2 bg-blue-50 rounded p-2 ${className}`}>
    {photoUrl && (
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 rounded object-cover border border-gray-200"
      />
    )}
    <div>
      <p className="text-sm font-semibold text-gray-900">{name}</p>
      {birthplace && (
        <p className="text-xs text-gray-900">出身地: {birthplace}</p>
      )}
    </div>
  </div>
);
