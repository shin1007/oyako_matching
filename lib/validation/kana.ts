// カタカナ→ひらがな変換ユーティリティ

/**
 * カタカナをひらがなに変換
 * @param value 入力値
 * @returns ひらがな文字列
 */
export function katakanaToHiragana(value: string): string {
  // 半角カタカナ→全角カタカナ
  const hankakuToZenkaku = (str: string) => str.replace(/([\uff66-\uff9f])/g, (s) => {
    // 半角カタカナを全角カタカナに変換
    const code = s.charCodeAt(0);
    // 濁点・半濁点対応
    if (code === 0xff9e) return '゛';
    if (code === 0xff9f) return '゜';
    return String.fromCharCode(code - 0xff66 + 0x30a1);
  });

  // まず半角→全角
  let result = hankakuToZenkaku(value);
  // 濁点・半濁点の結合
  result = result.replace(/([\u30ab\u30ad\u30af\u30b1\u30b3\u30b5\u30b7\u30b9\u30bb\u30bd\u30bf\u30c1\u30c4\u30c6\u30c8\u30cf\u30d2\u30d5\u30d8\u30db\u30a6\u30ac\u30ae\u30b0\u30b2\u30b4\u30b6\u30b8\u30ba\u30bc\u30be\u30c0\u30c2\u30c5\u30c7\u30c9\u30d0\u30d3\u30d6\u30d9\u30dc\u30f4])([゛゜])/g, (m, c, d) => {
    // 濁点・半濁点を合成文字に
    const map: { [key: string]: string } = {
      'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
      'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
      'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
      'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
      'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
      'ウ゛': 'ヴ',
    };
    return map[c + d] || c;
  });
  // 全角カタカナ→ひらがな
  result = result.replace(/[\u30a1-\u30f6]/g, (match) => {
    const code = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(code);
  });
  return result;
}
