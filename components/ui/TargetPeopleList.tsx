import React from 'react';
import { TargetPersonCard } from '@/components/ui/TargetPersonCard';

interface TargetPeopleListProps {
  targetPeople: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
    photo_url?: string | null;
  }>;
  role?: string;
}

export const TargetPeopleList: React.FC<TargetPeopleListProps> = ({ targetPeople, role }) => {
  if (!targetPeople || targetPeople.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-gray-900 mb-2">
        この方が探している{role === 'parent' ? '子ども' : '親'}:
      </p>
      <div className="flex flex-wrap gap-2">
        {targetPeople.map((person) => (
          <TargetPersonCard
            key={person.id}
            photoUrl={person.photo_url}
            name={`${person.last_name_kanji || ''}${person.first_name_kanji || ''}`}
            birthplace={
              person.birthplace_prefecture || person.birthplace_municipality
                ? `${person.birthplace_prefecture || ''}${person.birthplace_municipality ? ' ' + person.birthplace_municipality : ''}`
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};
