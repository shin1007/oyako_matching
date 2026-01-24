// バリデーション関数集約
// すべてのフォームでimportして利用すること

/**
 * メールアドレス形式チェック
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * パスワード強度チェック（8文字以上・大文字・小文字・数字）
 */
export function isStrongPassword(password: string): boolean {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return password.length >= 8 && hasUpper && hasLower && hasNumber;
}

/**
 * 必須入力チェック
 */
export function isRequired(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * パスワード一致チェック
 */
export function isPasswordMatch(pw: string, confirm: string): boolean {
  return pw === confirm;
}
