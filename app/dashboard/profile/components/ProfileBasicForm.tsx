import React from 'react';

interface ProfileBasicFormProps {
  lastNameKanji: string;
  setLastNameKanji: (v: string) => void;
  lastNameHiragana: string;
  setLastNameHiragana: (v: string) => void;
  firstNameKanji: string;
  setFirstNameKanji: (v: string) => void;
  firstNameHiragana: string;
  setFirstNameHiragana: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  birthplacePrefecture: string;
  setBirthplacePrefecture: (v: string) => void;
  birthplaceMunicipality: string;
  setBirthplaceMunicipality: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  parentGender: string;
  setParentGender: (v: string) => void;
  forumDisplayName: string;
  setForumDisplayName: (v: string) => void;
  userRole: 'parent' | 'child' | null;
  loading: boolean;
}

export const ProfileBasicForm: React.FC<ProfileBasicFormProps> = ({
  lastNameKanji, setLastNameKanji,
  lastNameHiragana, setLastNameHiragana,
  firstNameKanji, setFirstNameKanji,
  firstNameHiragana, setFirstNameHiragana,
  birthDate, setBirthDate,
  birthplacePrefecture, setBirthplacePrefecture,
  birthplaceMunicipality, setBirthplaceMunicipality,
  bio, setBio,
  parentGender, setParentGender,
  forumDisplayName, setForumDisplayName,
  userRole, loading
}) => (
  <div>
    {/* ここに基本プロフィールフォームのUIを実装 */}
    {/* 例: 氏名、ふりがな、生年月日、性別、出身地、自己紹介など */}
    {/* ... */}
  </div>
);
