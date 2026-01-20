-- 監査ログテーブル: audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  target_table text,
  target_id text,
  description text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

-- インデックス（検索用）
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_event_type on public.audit_logs(event_type);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
