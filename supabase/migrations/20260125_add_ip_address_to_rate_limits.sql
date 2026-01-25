-- レートリミット用にip_addressカラムを追加
ALTER TABLE rate_limits ADD COLUMN ip_address TEXT;
-- user_idとip_addressの組み合わせでユニーク制約を追加（どちらか一方がNULLでもOKなように）
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_user_id_ip_address_key ON rate_limits (user_id, ip_address);
