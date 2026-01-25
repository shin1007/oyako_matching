# 監査ログ出力テスト手順

## 1. Next.jsサーバーを起動

```
npm run dev
```

## 2. テストスクリプトの実行

```
npx ts-node scripts/audit-log-test.ts
```

- 必要に応じて `BASE_URL` やテストユーザー情報を編集してください
- 認証が必要なAPIはcookieやtokenをセットするよう修正してください

## 3. Supabaseの監査ログテーブルを確認

- Supabaseコンソールで `audit_logs` テーブル（または設定したテーブル）を開き、
  - user_id
  - event_type
  - ip_address
  - user_agent
  - description
  などが正しく記録されているか確認してください

## 4. 異常系テスト

- 無効なトークンや不正なリクエストも送信し、失敗時の監査ログも記録されることを確認してください

---

### 備考
- Stripe webhook等はcurl等で手動テストも可能です
- テスト用のダミーデータやユーザーは適宜ご用意ください
