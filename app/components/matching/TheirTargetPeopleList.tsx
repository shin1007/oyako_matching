import { TargetPersonCard } from '@/components/ui/TargetPersonCard';

interface TheirTargetPeopleListProps {
  theirTargetPeople: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
    photo_url?: string | null;
  }>;
  role?: string;
}

export function TheirTargetPeopleList({ theirTargetPeople, role }: TheirTargetPeopleListProps) {
  if (!theirTargetPeople || theirTargetPeople.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-900 mb-2">
        この方が探している{role === 'parent' ? '子ども' : '親'}:
      </p>
      <div className="space-y-2">
        {theirTargetPeople.map((searchingPerson) => (
          <TargetPersonCard
            key={searchingPerson.id}
            photoUrl={searchingPerson.photo_url}
            name={`${searchingPerson.last_name_kanji || ''}${searchingPerson.first_name_kanji || ''}`}
            birthplace={
              searchingPerson.birthplace_prefecture || searchingPerson.birthplace_municipality
                ? `${searchingPerson.birthplace_prefecture || ''}${searchingPerson.birthplace_municipality ? ' ' + searchingPerson.birthplace_municipality : ''}`
                : undefined
            }
            className="h-16"
          />
        ))}
      </div>
    </div>
  );
}
