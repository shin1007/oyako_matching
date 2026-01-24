import React from 'react';
import { TargetPersonCard } from '@/components/ui/TargetPersonCard';
import { TargetPerson } from '@/types/profile';

interface TargetPeopleListProps {
  targetPeople: TargetPerson[];
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
            person={person}
          />
        ))}
      </div>
    </div>
  );
};
