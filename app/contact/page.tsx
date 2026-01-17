import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-8 inline-block text-blue-600 hover:text-blue-700">
            ← ホームに戻る
          </Link>

          <h1 className="mb-8 text-4xl font-bold text-gray-900">お問い合わせ</h1>

          <div className="space-y-8">
            <section className="rounded-lg bg-white p-8 shadow">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">ご質問・ご不明な点について</h2>
              <p className="mb-6 text-gray-700">
                本サービスに関するご質問や、ご不明な点がございましたら、お気軽にお問い合わせください。
              </p>
              <p className="mb-6 text-gray-700">
                以下のメールアドレスにご連絡いただくか、このページ下部のメールフォームをご利用ください。
              </p>

              <div className="mb-8 rounded-lg bg-blue-50 p-6">
                <p className="mb-2 text-sm text-gray-600">メールアドレス</p>
                <a
                  href="mailto:shin1007@gmail.com"
                  className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  shin1007@gmail.com
                </a>
                <p className="mt-4 text-sm text-gray-600">
                  通常、お問い合わせから2営業日以内にご返信させていただきます。
                </p>
              </div>
            </section>

            <section className="rounded-lg bg-white p-8 shadow">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">よくある質問</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Q: 本当に安全なのか？</h3>
                  <p className="text-gray-700">
                    A: はい、本サービスではマイナンバーカードによる厳格な本人確認を実施しています。また、ストーカー規制法に準拠した非公開照合システムにより、ユーザーのプライバシーを最大限に保護しています。
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Q: 本当に親子で再会できるのか？</h3>
                  <p className="text-gray-700">
                    A: マッチングは相互の同意に基づいており、確実な再会を保証するものではありません。しかし、AIを活用した高精度なマッチング機能により、出会いの可能性を最大化しています。
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Q: 月額980円はいつから請求されるのか？</h3>
                  <p className="text-gray-700">
                    A: 親ユーザーとして登録した後、最初の登録月は無料となり、翌月から月額980円の請求が開始されます。キャンセルはいつでも可能です。
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Q: 子どもとして登録する時の親の同意は必要か？</h3>
                  <p className="text-gray-700">
                    A: 12歳以上18歳未満の方は、親権者の同意のもとで登録してください。本サービスは安全な環境を提供するため、児童の安全保護を最優先としています。
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Q: アカウントを削除したい</h3>
                  <p className="text-gray-700">
                    A: ダッシュボードの「セキュリティ」セクションから、いつでもアカウントを削除できます。削除後、すべての個人情報は完全に削除されます。
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg bg-green-50 p-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">緊急の場合</h2>
              <p className="mb-4 text-gray-700">
                ハラスメントやストーキング被害などの緊急の場合は、直ちにお近くの警察にご相談ください。本サービスでも適切なサポートを行いますので、メールでご報告ください。
              </p>
              <a
                href="mailto:shin1007@gmail.com?subject=緊急：ハラスメント報告"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
              >
                メールで報告する
              </a>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>&copy; 2024 親子マッチング. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
