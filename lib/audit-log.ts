// 監査ログ記録ユーティリティ
// 今後Supabaseのaudit_logsテーブル等に保存することを想定
//
// 【運用ミスリスク対策メモ】
// - RLS: Supabase側で必ずRLSを有効化し、サービスロールキーの漏洩・誤用に注意すること。
//   アプリ側でも権限チェックを冗長化し、管理者操作は必ず監査ログを記録すること。
// - CORS: APIエンドポイントは許可ドメインのみを明示的に設定し、ワイルドカードや*は絶対に使わないこと。
// - Webhook: 受信時は必ずシークレット検証・IP制限・監査ログ記録を行うこと。
//   Webhookのシークレットは環境変数で安全に管理し、漏洩時は即時ローテーションすること。
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

export type AuditEventType =
  | 'login'
  | 'logout'
  | 'change_password'
  | 'profile_view'
  | 'profile_update'
  | 'message_send'
  | 'message_view'
  | 'matching_create'
  | 'matching_cancel'
  | 'admin_access'
  | 'forum_post_create'
  | 'forum_post_view'
  | 'forum_comment_create'
  | 'forum_report_create'
  | 'forum_report_view'
  | 'forum_category_view'
  | 'notification_view'
  | 'payment_create'
  | 'content_moderation'
  | 'other';

export interface AuditLogParams {
  userId: string | null;
  eventType: AuditEventType;
  detail?: string;
  ip?: string;
  meta?: Record<string, any>;
}

// 監査ログ書き込み（失敗時は最大3回リトライし、全て失敗した場合はSentry等でアラート）
export async function writeAuditLog({ userId, eventType, detail, ip, meta }: AuditLogParams) {
  let lastError: any = null;
  for (let i = 0; i < 3; i++) {
    try {
      await supabase.from('audit_logs').insert([
        {
          user_id: userId,
          event_type: eventType,
          detail,
          ip,
          meta,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    } catch (e) {
      lastError = e;
      // 100ms待ってリトライ
      await new Promise((res) => setTimeout(res, 100));
    }
  }
  // 本番ではSentry等でエラー通知
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.captureException(lastError);
  }
  console.error('Failed to write audit log after 3 attempts', lastError);
}

// Node.jsのcryptoを利用
import crypto from 'crypto';

// Webhookシークレット検証用ユーティリティ
// 例: Webhook受信APIで呼び出し、正しいシークレットでなければ即エラー
export function verifyWebhookSecret(receivedSecret: string | undefined): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected || !receivedSecret) return false;
  // ブラウザ環境では安全な比較不可
  if (typeof window !== 'undefined') return false;
  // タイミング攻撃対策のため、固定時間比較
  return receivedSecret.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSecret), Buffer.from(expected));
}
