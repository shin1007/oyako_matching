-- 監査ログテーブルにタイムスタンプ列（event_timestamp）を追加
alter table public.audit_logs add column if not exists event_timestamp timestamptz;
