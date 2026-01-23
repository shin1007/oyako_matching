import React from 'react';

export const ParentWarningBox: React.FC = () => (
  <div className="mb-4 rounded-lg border-l-8 border-red-500 bg-red-50 p-4 shadow flex gap-3">
    <div className="text-3xl">⚠️</div>
    <div>
      <div className="font-bold text-red-700 mb-1">【ご利用にあたっての重要なお願い】</div>
      <div className="text-sm text-red-800 mb-2">
        お子様との再会を望むお気持ちは大切ですが、以下の行為は刑法（未成年者略取・誘拐罪）やストーカー規制法、住居侵入罪などの法令に抵触し、警察の捜査対象となる可能性があります。
      </div>
      <ul className="list-disc ml-5 text-sm text-red-800 mb-2">
        <li>相手の同意なく、現在の居住地や学校、職場へ押し掛けること</li>
        <li>相手の意思に反して、無理やり連れ出そうとすること</li>
        <li>拒絶されているにもかかわらず、執拗にメッセージを送り続けること</li>
      </ul>
      <div className="text-xs text-gray-700 mb-2">お互いの安全と法的保護のため、節度ある交流をお願いいたします。</div>
      <div className="text-xs text-gray-700">
        <span className="font-bold">未成年者略取・誘拐罪（刑法224条）</span><br />
        たとえ親であっても、監護権（育てている側の権利）を持つ親の同意なく子供を連れ去ると犯罪になります。連れ去られた子供を引き戻すとしても同様です。<br />
        <span className="font-bold">ストーカー行為等の規制等に関する法律</span><br />
        2021年の改正以降、GPSによる位置情報の取得や、拒否されている中での連続したメッセージ送信も規制対象に含まれます。<br />
        <span className="font-bold">住居侵入罪（刑法130条）</span><br />
        敷地内に無断で入る行為です。<br />
        <span className="font-bold">民法（不法行為）</span><br />
        精神的苦痛を与えたとして、慰謝料請求の対象になります。
      </div>
    </div>
  </div>
);