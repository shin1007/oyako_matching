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
      <p className="text-xs font-semibold text-gray-700 mb-2">
        この方が探している{role === 'parent' ? '子ども' : '親'}:
      </p>
      <div className="space-y-2">
        {theirTargetPeople.map((searchingPerson) => (
          <div key={searchingPerson.id} className="flex gap-3 bg-blue-50 rounded p-2">
            {searchingPerson.photo_url && (
              <img
                src={searchingPerson.photo_url}
                alt={`${searchingPerson.last_name_kanji || ''}${searchingPerson.first_name_kanji || ''}`}
                className="h-16 w-16 rounded object-cover border border-gray-200 flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">
                {searchingPerson.last_name_kanji || ''}{searchingPerson.first_name_kanji || ''}
              </p>
              {(searchingPerson.birthplace_prefecture || searchingPerson.birthplace_municipality) && (
                <p className="text-xs text-gray-600">
                  出身地: {searchingPerson.birthplace_prefecture || ''}
                  {searchingPerson.birthplace_municipality ? ` ${searchingPerson.birthplace_municipality}` : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
