# カラースキーム トークン化完了サマリー

## 概要
親子マッチングアプリの役割別配色を統一するため、緑系（親）とオレンジ系（子ども）の色指定をCSS変数（Tailwindデザイントークン）へ集約しました。

## デザイントークン定義
**ファイル**: `app/globals.css`

### 子ども用（オレンジ系）
```css
--color-child-50: #fff7ed;   /* orange-50 */
--color-child-100: #ffedd5;  /* orange-100 */
--color-child-200: #fed7aa;  /* orange-200 */
--color-child-300: #fdba74;  /* orange-300 */
--color-child-400: #fb923c;  /* orange-400 */
--color-child-500: #f97316;  /* orange-500 */
--color-child-600: #ea580c;  /* orange-600 */
--color-child-700: #c2410c;  /* orange-700 */
--color-child-800: #9a3412;  /* orange-800 */
--color-child-900: #7c2d12;  /* orange-900 */
```

### 親用（グリーン系）
```css
--color-parent-50: #f0fdf4;  /* green-50 */
--color-parent-100: #dcfce7; /* green-100 */
--color-parent-200: #bbf7d0; /* green-200 */
--color-parent-300: #86efac; /* green-300 */
--color-parent-400: #4ade80; /* green-400 */
--color-parent-500: #22c55e; /* green-500 */
--color-parent-600: #16a34a; /* green-600 */
--color-parent-700: #15803d; /* green-700 */
--color-parent-800: #166534; /* green-800 */
--color-parent-900: #14532d; /* green-900 */
```

## トークン化完了ファイル一覧

### ページ
- ✅ `app/page.tsx` - トップページ（親/子カード、削除成功メッセージ）
- ✅ `app/matching/page.tsx` - マッチング（類似度カード、ボタン、バッジ）
- ✅ `app/messages/page.tsx` - メッセージ一覧（承認ボタン、CTAボタン、バッジ）
- ✅ `app/messages/[id]/page.tsx` - メッセージ詳細（吹き出し、入力枠、送信ボタン）
- ✅ `app/payments/subscribe/page.tsx` - サブスク登録（親プラン枠、価格、ボタン）
- ✅ `app/dashboard/page.tsx` - ダッシュボード（背景、見出し、カード、グラデーション）
- ✅ `app/dashboard/security/page.tsx` - セキュリティ設定（背景、リンク）
- ✅ `app/dashboard/profile/page.tsx` - プロフィール編集（成功メッセージ）
- ✅ `app/forum/page.tsx` - フォーラム一覧（新規投稿ボタン、タブ）
- ✅ `app/forum/[id]/page.tsx` - フォーラム詳細（バッジ、入力フォーカス、ボタン）
- ✅ `app/forum/parent/page.tsx` - 親向けフォーラム（背景、見出し、ボタン）
- ✅ `app/forum/child/page.tsx` - 子ども向けフォーラム（背景、見出し、ボタン）

### コンポーネント
- ✅ `app/components/security/ChangePasswordForm.tsx` - パスワード変更（バナー、ボタン）
- ✅ `app/components/SearchingChildPhotoUpload.tsx` - 写真アップロード（枠、追加ボタン）

## 使用方法

### 条件分岐での使用例
```tsx
// ユーザーの役割に応じて背景色を変更
<div className={`min-h-screen ${userRole === 'child' ? 'bg-child-50' : 'bg-parent-50'}`}>

// ボタンの色を役割別に
<button className={`px-4 py-2 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}>
  マッチング申請
</button>

// 入力フォーカス枠の色
<input className={`border ${userRole === 'child' ? 'focus:border-child-500' : 'focus:border-parent-500'}`} />
```

### isParent変数での使用例
```tsx
// フォーラムページなど
<button className={`rounded-lg ${isParent ? 'bg-parent-600 hover:bg-parent-700' : 'bg-child-600 hover:bg-child-700'}`}>
  投稿する
</button>
```

## 残存する色指定

### システム色（トークン化不要）
以下の色は役割に関係なく、システム全体で統一的に使われるためトークン化しません：

- **青系（Blue）**: リンク、情報通知、メッセージ導線
- **赤系（Red）**: エラーメッセージ、削除・拒否ボタン
- **黄系（Yellow）**: 警告、承認待ち
- **グレー系（Gray）**: 背景、テキスト、枠線など中立要素

### 具体例
```tsx
// エラーメッセージ（赤）
<div className="bg-red-50 text-red-600">エラーが発生しました</div>

// 承認待ち（黄）
<button className="bg-yellow-500 text-white">承認待ち</button>

// メッセージへ導線（青）
<Link href="/messages" className="bg-blue-600 hover:bg-blue-700">メッセージへ</Link>

// 中立的な背景・テキスト（グレー）
<div className="bg-gray-50 text-gray-900">コンテンツ</div>
```

## メリット

1. **統一感**: 役割別配色が一元管理され、全ページで一貫性を保証
2. **変更容易**: `globals.css`の値変更だけで全体の配色調整が可能
3. **可読性**: `bg-child-600`のように意味ベースでクラス指定でき、役割が明確
4. **保守性**: 直書きを排除し、将来のテーマ拡張や多言語対応が容易

## 動作確認手順

```bash
npm run dev
```

1. 親アカウントでログイン → 緑系配色が全ページで反映されることを確認
2. 子どもアカウントでログイン → オレンジ系配色が全ページで反映されることを確認
3. matching/messages/dashboard/forumの各ページで役割別色が適切に表示されることを確認

## 今後の拡張

新規ページやコンポーネントを追加する際は、以下のガイドラインに従ってください：

- 役割別の色指定には必ず`child-*`/`parent-*`トークンを使用
- 条件分岐は`userRole === 'child'`または`isParent`で統一
- システム色（blue/red/yellow/gray）は役割に関係なく直接指定してOK

## 参考リンク

- Tailwind CSS v4 デザイントークン: https://tailwindcss.com/docs/v4-beta
- プロジェクトドキュメント: `COLOR_SCHEME_UNIFICATION.md`
