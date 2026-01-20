import { createAdminClient } from '@/lib/supabase/admin';
// 監査ログ記録用ユーティリティ
// 日本語コメント付き
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

/**
 * 監査ログをSupabaseに記録する
 * @param params ログ内容
 */
export async function logAuditEvent(params: {
  user_id?: string | null;
  event_type: string;
  target_table?: string | null;
  target_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}) {
  const supabase = createClient<Database>();
  const { error } = await supabase.from('audit_logs').insert([
    {
      user_id: params.user_id ?? null,
      event_type: params.event_type,
      target_table: params.target_table ?? null,
      target_id: params.target_id ?? null,
      description: params.description ?? null,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
    },
  ]);
  if (error) {
    // 本番ではSentry等で通知
    console.error('監査ログ記録エラー', error);
  }
}
