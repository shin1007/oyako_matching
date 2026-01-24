// バリデーション・ユーティリティ関数集約
// すべて日本語コメントで記述

/**
 * メールアドレス形式チェック
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * パスワード強度チェック（8文字以上、大文字・小文字・数字を含む）
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/**
 * 日付形式チェック（YYYY-MM-DD）
 */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

/**
 * 正の整数かどうか
 */
export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * limitパラメータ補正（1〜100の範囲）
 */
export function parseLimit(limitParam: any, defaultValue = 20): number {
  const parsed = parseInt(limitParam, 10);
  if (!isNaN(parsed) && parsed > 0) {
    return Math.min(parsed, 100);
  }
  return defaultValue;
}

/**
 * offsetパラメータ補正（0以上）
 */
export function parseOffset(offsetParam: any, defaultValue = 0): number {
  const parsed = parseInt(offsetParam, 10);
  if (!isNaN(parsed) && parsed >= 0) {
    return parsed;
  }
  return defaultValue;
}

/**
 * 生年月日から年齢を計算し、12歳以上か判定
 */
export function verifyAge(birthDate: string): { isValid: boolean; age: number } {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return {
    isValid: age >= 12,
    age,
  };
}
