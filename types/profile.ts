// プロフィール関連の汎用型定義
// 他のコンポーネント・画面で共通利用するための型

export type ProfileBase = {
  id: string;
  userId: string;
  role: 'parent' | 'child' | string;
  lastNameKanji?: string;
  firstNameKanji?: string;
  lastNameHiragana?: string;
  firstNameHiragana?: string;
  birthDate?: string;
  birthplacePrefecture?: string;
  birthplaceMunicipality?: string;
  gender?: string;
  profileImageUrl?: string | null;
  bio?: string | null;
  forumDisplayName?: string;
  photoUrl?: string | null;
};

export type TargetPerson = {
  id: string;
  nameKanji?: string;
  nameHiragana?: string;
  birthDate?: string;
  birthplacePrefecture?: string;
  birthplaceMunicipality?: string;
  gender?: string;
  photoUrl?: string | null;
};

export type ProfileWithTarget = ProfileBase & {
  targetPerson?: TargetPerson;
};

// SupabaseのprofilesテーブルRow型から汎用型へ変換する関数例
import { Database } from './database';

export function toProfileBase(row: Database['public']['Tables']['profiles']['Row']): ProfileBase {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.parent_gender ? 'parent' : 'child',
    lastNameKanji: row.last_name_kanji || '',
    firstNameKanji: row.first_name_kanji || '',
    lastNameHiragana: row.last_name_hiragana || '',
    firstNameHiragana: row.first_name_hiragana || '',
    birthDate: row.birth_date,
    birthplacePrefecture: row.birthplace_prefecture || undefined,
    birthplaceMunicipality: row.birthplace_municipality || undefined,
    gender: row.gender || undefined,
    profileImageUrl: row.profile_image_url,
    bio: row.bio,
    forumDisplayName: row.forum_display_name || '',
  };
}

export function toTargetPerson(row: Database['public']['Tables']['target_people']['Row']): TargetPerson {
  return {
    id: row.id,
    nameKanji: row.name_kanji || `${row.last_name_kanji || ''}${row.first_name_kanji || ''}`,
    nameHiragana: row.name_hiragana || `${row.last_name_hiragana || ''}${row.first_name_hiragana || ''}`,
    birthDate: row.birth_date || undefined,
    birthplacePrefecture: row.birthplace_prefecture || undefined,
    birthplaceMunicipality: row.birthplace_municipality || undefined,
    gender: row.gender || undefined,
  };
}
