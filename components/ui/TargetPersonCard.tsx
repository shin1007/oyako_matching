import React from 'react';
import { TargetPerson } from '@/types/profile';

interface TargetPersonCardProps {
  person: TargetPerson;
  className?: string;
}

/**
 * 子ども・ターゲット情報の共通表示カード
 */
export const TargetPersonCard: React.FC<TargetPersonCardProps> = ({
  person,
  className = '',
}) => (
  <div className={`flex items-center gap-2 bg-blue-50 rounded p-2 ${className}`}>
    {person.photoUrl && (
      <img
        src={person.photoUrl}
        alt={
          (person.lastNameKanji || '') + (person.firstNameKanji || '') ||
          (person.lastNameHiragana || '') + (person.firstNameHiragana || '') ||
          ''
        }
        className="h-10 w-10 rounded object-cover border border-gray-200"
      />
    )}
    <div>
      <p className="text-sm font-semibold text-gray-900">
        {(person.lastNameKanji || '') + (person.firstNameKanji || '') ||
         (person.lastNameHiragana || '') + (person.firstNameHiragana || '') ||
         ''}
      </p>
      {(person.birthplacePrefecture || person.birthplaceMunicipality) && (
        <p className="text-xs text-gray-900">出身地: {person.birthplacePrefecture || ''}{person.birthplaceMunicipality ? ' ' + person.birthplaceMunicipality : ''}</p>
      )}
    </div>
  </div>
);
