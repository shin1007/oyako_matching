import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-8 inline-block text-blue-600 hover:text-blue-700">
            ← ホームに戻る
          </Link>

          <h1 className="mb-8 text-4xl font-bold text-gray-900">利用規約</h1>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第1条 総則</h2>
              <p>
                本利用規約（以下「本規約」）は、親子マッチング（以下「本サービス」）の利用に関する一般的な条件を定めるものです。本サービスをご利用になる場合は、本規約にご同意いただいたものとみなします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第2条 定義</h2>
              <p className="mb-3">本規約において、以下の用語は次の意味を持ちます：</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>「親」とは、本サービスに親として登録したユーザーを指します</li>
                <li>「子ども」とは、本サービスに子どもとして登録したユーザーを指します</li>
                <li>「マッチング」とは、本サービスが親と子どもを引き合わせるプロセスを指します</li>
                <li>「コンテンツ」とは、ユーザーが本サービスに投稿するテキスト、画像、その他の情報を指します</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第3条 登録および年齢制限</h2>
              <p className="mb-3">
                本サービスのご利用にあたっては、以下の条件を満たす必要があります：
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>親の場合：成人（18歳以上）であること</li>
                <li>子どもの場合：12歳以上18歳未満であること</li>
                <li>18歳以上の子どもの場合は、親として登録してください</li>
                <li>マイナンバーカード認証による本人確認を完了していること</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第4条 ユーザーアカウント</h2>
              <p className="mb-3">
                ユーザーは、登録時に提供する情報について、正確かつ最新の情報を保証するものとします。
              </p>
              <p>
                ユーザーは、自身のアカウント情報および不正アクセスを防止するため、必要な対策を講じるものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第5条 禁止事項</h2>
              <p className="mb-3">本サービスの利用において、以下の行為は禁止されています：</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>他のユーザーの権利を侵害する行為</li>
                <li>詐欺、脅迫、ハラスメント</li>
                <li>不正アクセス、ハッキング、ウイルス配布</li>
                <li>本サービスのシステムに負荷をかける行為</li>
                <li>援助交際などの金銭的な取引の提案</li>
                <li>児童虐待やネグレクトなど児童に危害を加える行為</li>
                <li>スパムメッセージやマーケティング目的の行為</li>
                <li>その他本サービスの運営を妨害する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第6条 ユーザーコンテンツ</h2>
              <p className="mb-3">
                ユーザーが本サービスに投稿するコンテンツについて、本サービスは以下の権利を保有します：
              </p>
              <p>
                ユーザーは、本サービスに対して、コンテンツを利用、編集、配布する権利を非排他的、ロイヤリティフリーで許諾するものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第7条 知的財産権</h2>
              <p>
                本サービスのすべての知的財産権（著作権、商標権、特許権など）は、本サービスの提供者に帰属します。ユーザーは、本規約で許可されている範囲以外で、これらの知的財産権を使用することはできません。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第8条 料金および支払い</h2>
              <p className="mb-3">
                親ユーザーは、本サービスの一部機能の利用に対して、月額¥980の料金をお支払いいただきます。
              </p>
              <p>
                子どもユーザーは、本サービスのすべての機能を無料でご利用いただけます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第9条 保証の否認</h2>
              <p>
                本サービスは「現状有姿」で提供されています。本サービスの提供者は、本サービスの正確性、完全性、確実性についていかなる保証も行いません。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第10条 免責事項</h2>
              <p>
                本サービスの利用に起因する損失または損害について、本サービスの提供者は一切の責任を負いません。これには、マッチングが成立しなかった場合や、マッチング後の紛争も含まれます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第11条 ストーカー規制法への準拠</h2>
              <p>
                本サービスは、ストーカー規制法の要件に準拠し、ユーザーの安全保護を最優先としています。本サービスはマイナンバーカード認証による厳格な本人確認を実施し、非公開照合によりプライバシーを保護しています。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第12条 規約の変更</h2>
              <p>
                本サービスの提供者は、事前の通知の有無を問わず、本規約を変更することができます。変更後の本規約は、本サービスで公表した時点で有効となります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">第13条 準拠法および管轄</h2>
              <p>
                本規約は日本法に準拠し、本規約に関する紛争は日本の裁判所に帰属するものとします。
              </p>
            </section>

            <section className="border-t pt-8">
              <p className="text-sm text-gray-600">
                最終更新日：2026年1月18日
              </p>
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
