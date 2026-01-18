/**
 * テストモードのユーティリティ関数
 * 
 * 開発環境でのテストを容易にするためのヘルパー関数
 */

/**
 * テストモードが有効かどうかをチェック
 * 
 * テストモードは以下の条件を満たす場合のみ有効:
 * - NODE_ENV が 'development' である
 * - ENABLE_TEST_MODE 環境変数が 'true' である
 * 
 * @returns {boolean} テストモードが有効な場合は true
 */
export function isTestModeEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && 
         process.env.ENABLE_TEST_MODE === 'true';
}
