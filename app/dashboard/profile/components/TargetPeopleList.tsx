import React from 'react';

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

interface TargetPeopleListProps {
  searchingChildren: SearchingChild[];
  setSearchingChildren: (v: SearchingChild[]) => void;
  userRole: 'parent' | 'child' | null;
  loading: boolean;
}

export const TargetPeopleList: React.FC<TargetPeopleListProps> = ({ searchingChildren, setSearchingChildren, userRole, loading }) => (
  <div>
    {/* ここに子ども/親情報リストのUIを実装 */}
    {/* ... */}
  </div>
);
