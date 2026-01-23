import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-8 inline-block text-blue-600 hover:text-blue-700">
            ← ホームに戻る
          </Link>

          <h1 className="mb-8 text-4xl font-bold text-gray-900">プライバシーポリシー</h1>

          <div className="space-y-8 text-gray-900">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">1. はじめに</h2>
              <p>
                親子マッチング（以下「本サービス」）は、個人情報の取り扱いについて、以下のプライバシーポリシー（以下「本ポリシー」）を定めています。本サービスをご利用いただく場合は、本ポリシーに同意いただいたものとみなします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">2. 収集する個人情報</h2>
              <p className="mb-3">本サービスでは、以下の個人情報を収集する場合があります：</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>マイナンバーカード認証による本人確認情報</li>
                <li>プロフィール情報（名前、年齢、性別、生年月日など）</li>
                <li>お子さまに関する情報</li>
                <li>メールアドレス、電話番号</li>
                <li>お支払い情報</li>
                <li>通信ログ、IPアドレス</li>
                <li>写真やビデオなどのメディアデータ</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">3. 個人情報の利用目的</h2>
              <p className="mb-3">収集した個人情報は、以下の目的で利用します：</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>本人確認および登録処理</li>
                <li>サービスの提供および改善</li>
                <li>マッチング機能の提供</li>
                <li>メッセージ機能の提供</li>
                <li>お支払い処理</li>
                <li>サービスに関するお知らせやご連絡</li>
                <li>不正利用の防止およびセキュリティ対策</li>
                <li>法令遵守および裁判上の請求への対応</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">4. 個人情報の第三者への提供</h2>
              <p>
                本サービスは、法令で定める場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。ただし、以下の場合は例外とします：
              </p>
              <ul className="ml-6 list-disc space-y-2 pt-3">
                <li>法令に基づく要求がある場合</li>
                <li>人の生命、身体、財産の保護のため必要と考える場合</li>
                <li>本サービスの権利や財産の保護のため必要と考える場合</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">5. セキュリティ対策</h2>
              <p>
                本サービスは、個人情報を安全に管理するため、以下のセキュリティ対策を講じています：
              </p>
              <ul className="ml-6 list-disc space-y-2 pt-3">
                <li>SSL/TLS暗号化通信の使用</li>
                <li>データベースの暗号化</li>
                <li>アクセス制御の実施</li>
                <li>定期的なセキュリティ監査</li>
                <li>従業員への情報セキュリティ教育</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">6. マイナンバーカード認証について</h2>
              <p>
                本サービスではマイナンバーカード認証を使用して、ご本人確認を行っています。認証時に取得される情報は厳格に管理され、本人確認以外の目的には使用されません。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">7. クッキーについて</h2>
              <p>
                本サービスでは、ユーザーの利便性向上とサービス改善のため、クッキーを使用しています。クッキーの使用を望まない場合は、ブラウザの設定で無効にすることができます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">8. 個人情報へのアクセス権</h2>
              <p>
                ユーザーは、本サービスで保有するご自身の個人情報について、開示を請求する権利があります。詳細はお問い合わせください。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">9. ポリシーの変更</h2>
              <p>
                本ポリシーは、予告なく変更される場合があります。変更後の本ポリシーは、本サービスで公表した時点で有効となります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">10. お問い合わせ</h2>
              <p>
                個人情報の取り扱いに関するご質問やご不明な点については、お問い合わせフォームよりご連絡ください。
              </p>
            </section>

            <section className="border-t pt-8">
              <p className="text-sm text-gray-900">
                最終更新日：2026年1月18日
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-900">
          <p>&copy; 2024 親子マッチング. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
