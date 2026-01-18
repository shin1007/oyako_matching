/**
 * テストモードのユーティリティ関数
 * 
 * 開発環境でのテストを容易にするためのヘルパー関数
 */

/**
 * マイナンバー認証バイパステストモードが有効かどうかをチェック
 * 
 * @returns {boolean} マイナンバー認証バイパスが有効な場合は true
 */
export function isTestModeBypassVerificationEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && 
         process.env.TEST_MODE_BYPASS_VERIFICATION === 'true';
}

/**
 * サブスクリプションバイパステストモードが有効かどうかをチェック
 * 
 * @returns {boolean} サブスクリプションバイパスが有効な場合は true
 */
export function isTestModeBypassSubscriptionEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && 
         process.env.TEST_MODE_BYPASS_SUBSCRIPTION === 'true';
}

/**
 * テストモードが有効かどうかをチェック（いずれか一つが有効な場合）
 * 
 * テストモードは以下の条件を満たす場合のみ有効:
 * - NODE_ENV が 'development' である
 * - TEST_MODE_BYPASS_VERIFICATION または TEST_MODE_BYPASS_SUBSCRIPTION が 'true' である
 * 
 * @returns {boolean} テストモードが有効な場合は true
 */
export function isTestModeEnabled(): boolean {
  return isTestModeBypassVerificationEnabled() || isTestModeBypassSubscriptionEnabled();
}
