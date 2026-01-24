export function getGenderLabel(gender?: string, role?: string) {
  if (!gender) return '性別未設定';
  const mapParent = {
    male: '男性',
    female: '女性',
    other: 'その他',
    prefer_not_to_say: '回答しない',
  } as const;
  const mapChild = {
    male: '男の子',
    female: '女の子',
    other: 'その他',
  } as const;
  if (role === 'parent') {
    return mapParent[gender as keyof typeof mapParent] ?? '性別未設定';
  }
  return mapChild[gender as keyof typeof mapChild] ?? mapParent[gender as keyof typeof mapParent] ?? '性別未設定';
}

export function calculateAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getRoleLabel(role: string) {
  return role === 'parent' ? '親' : role === 'child' ? '子' : '不明';
}
