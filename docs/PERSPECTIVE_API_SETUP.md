# Perspective API セットアップガイド

## 概要
このプロジェクトでは、掲示板のコンテンツモデレーション（不適切な投稿の検出）に Google の **Perspective API** を使用しています。

OpenAI の Moderation API から Perspective API に移行した理由：
- ✅ **完全無料**（1秒あたり1リクエストまで）
- ✅ **日本語対応**
- ✅ **高精度**な毒性検出
- ✅ **外部依存が少ない**（fetch APIのみ使用）

## 🚀 セットアップ手順

### 1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクト名を設定（例: `oyako-matching-production`）

### 2. Perspective API の有効化

1. [Perspective API のページ](https://console.cloud.google.com/apis/library/commentanalyzer.googleapis.com) にアクセス
2. **「有効にする」** ボタンをクリック
3. API が有効化されるまで数分待つ

### 3. API キーの作成

1. [認証情報ページ](https://console.cloud.google.com/apis/credentials) にアクセス
2. **「認証情報を作成」** → **「API キー」** をクリック
3. API キーが生成されます（例: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`）
4. **セキュリティのため、API キーに制限を設定することを強く推奨します**：
   - **「キーを制限」** をクリック
   - **アプリケーションの制限**: 「HTTP リファラー（ウェブサイト）」または「なし」
   - **API の制限**: 「キーを制限」→ 「Perspective Comment Analyzer API」のみを選択
5. **「保存」** をクリック

### 4. 環境変数の設定

プロジェクトのルートディレクトリにある `.env.local` ファイルに以下を追加してください：

```bash
# Perspective API（コンテンツモデレーション用）
PERSPECTIVE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**注意**: `.env.local` ファイルは `.gitignore` に含まれており、Gitにコミットされません。

### 5. 開発サーバーの再起動

環境変数を追加した後、開発サーバーを再起動してください：

```bash
npm run dev
```

## 🧪 動作確認

1. 掲示板で新しい投稿を作成してみてください
2. 以下のようなテストケースで動作を確認できます：

### 正常な投稿（承認されるべき）
```
タイトル: 育児の悩み相談
内容: 最近、子どもが夜泣きをするようになりました。何か良い対策はありますか？
```

### 不適切な投稿（拒否されるべき）
```
タイトル: テスト投稿
内容: あなたは馬鹿だ、死ね（※テスト用のみ）
```

不適切な投稿をした場合、以下のようなエラーメッセージが表示されます：
```
Content contains inappropriate material
```

## 📊 検出される内容

Perspective API は以下の要素を検出します：

- **TOXICITY**: 毒性（攻撃的、失礼、不合理なコメント）
- **SEVERE_TOXICITY**: 重度の毒性（非常に憎悪に満ちた、攻撃的なコメント）
- **IDENTITY_ATTACK**: 個人攻撃（人種、宗教、性別などに基づく攻撃）
- **INSULT**: 侮辱（侮辱的、軽蔑的な表現）
- **PROFANITY**: 冒涜（罵倒語、卑語）
- **THREAT**: 脅迫（暴力や危害を加えると脅すコメント）

### 閾値
各スコアが **0.7以上**（70%以上の確率）で不適切と判定されます。

この閾値は [lib/openai/index.ts](../lib/openai/index.ts) の以下の行で調整できます：
```typescript
const threshold = 0.7; // 0.0 〜 1.0 の範囲で設定
```

## 🔧 トラブルシューティング

### エラー: "PERSPECTIVE_API_KEY is not set"
- `.env.local` ファイルに `PERSPECTIVE_API_KEY` が正しく設定されているか確認
- 開発サーバーを再起動したか確認

### エラー: "Perspective API error: 400"
- API キーが正しいか確認
- Perspective API がプロジェクトで有効化されているか確認
- 投稿内容が空でないか確認

### エラー: "Perspective API error: 403"
- API キーに正しい権限が設定されているか確認
- API の使用制限（1秒あたり1リクエスト）を超えていないか確認

### モデレーションがスキップされる
環境変数が設定されていない場合、モデレーションはスキップされます（警告ログが出力されます）。
開発環境でのみ許可する場合は、この動作で問題ありません。

## 📚 参考リンク

- [Perspective API 公式ドキュメント](https://developers.perspectiveapi.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Perspective API リファレンス](https://developers.perspectiveapi.com/s/about-the-api-methods)
- [料金プラン](https://developers.perspectiveapi.com/s/about-the-api-rate-limits)

## 💰 コスト

- **完全無料**（通常の使用範囲内）
- 制限: 1秒あたり1リクエスト
- より高いレート制限が必要な場合は、[リクエストフォーム](https://forms.gle/qzTxzQBb9wr6BXpC7)から申請可能

## 🔒 セキュリティ

- API キーは必ず `.env.local` に保存し、Gitにコミットしないでください
- 本番環境では、API キーに適切な制限を設定してください
- 定期的に API キーをローテーションすることを推奨します
