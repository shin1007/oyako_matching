-- profilesテーブルにroleカラムを追加
ALTER TABLE profiles ADD COLUMN role TEXT;

-- usersテーブルとのリレーション（user_idがprofilesに存在する前提）
-- 既にuser_idでリレーションされている場合は不要ですが、なければ以下を追加
-- ALTER TABLE profiles ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);

-- roleカラムの初期値を設定（任意、例: 'parent'）
-- UPDATE profiles SET role = 'parent' WHERE role IS NULL;

-- 必要に応じてroleに制約を追加（例: CHECK制約）
-- ALTER TABLE profiles ADD CONSTRAINT chk_role CHECK (role IN ('parent', 'child', 'admin'));
