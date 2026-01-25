// 監査ログ記録ユーティリティ
// 今後Supabaseのaudit_logsテーブル等に保存することを想定
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

export async function writeAuditLog({ userId, eventType, detail, ip, meta }: AuditLogParams) {
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
  } catch (e) {
    // 本番ではSentry等でエラー通知
    console.error('Failed to write audit log', e);
  }
}
