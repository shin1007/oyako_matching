// ひらがなバリデーション
// ひらがなのみ許可（空白可）

/**
 * ひらがなのみかどうかを判定
 * @param value 入力値
 * @returns ひらがなのみならtrue
 */
export function isHiragana(value: string): boolean {
  // ひらがな（U+3040-309F）、全角スペース、半角スペースのみ許可
  return /^[\u3040-\u309F\s]+$/.test(value.trim());
}
