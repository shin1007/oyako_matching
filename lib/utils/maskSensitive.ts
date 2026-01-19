/**
 * 機密性の高い値をマスクするユーティリティ
 * @param obj マスク対象のオブジェクト
 * @param keys マスクしたいキー名配列（デフォルト: code, token, token_hash, password）
 * @returns マスク済みオブジェクト
 */
export function maskSensitive(obj: Record<string, any>, keys: string[] = ['code', 'token', 'token_hash', 'password']): Record<string, any> {
  const masked: Record<string, any> = { ...obj };
  for (const key of keys) {
    if (masked[key] !== undefined) {
      masked[key] = '****';
    }
  }
  return masked;
}
