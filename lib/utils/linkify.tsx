/**
 * テキスト内のURLと電話番号をReactコンポーネントに変換
 */
export function linkifyText(text: string): React.ReactNode[] {
  // URL正規表現
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  // 電話番号正規表現（日本の電話番号形式）
  const phonePattern = /(\d{2,4}-\d{2,4}-\d{4}|\d{10,11})/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // URLと電話番号の位置を取得
  const matches: { index: number; length: number; text: string; type: 'url' | 'phone' }[] = [];

  // URLを検索
  let urlMatch;
  while ((urlMatch = urlPattern.exec(text)) !== null) {
    matches.push({
      index: urlMatch.index,
      length: urlMatch[0].length,
      text: urlMatch[0],
      type: 'url',
    });
  }

  // 電話番号を検索
  let phoneMatch;
  while ((phoneMatch = phonePattern.exec(text)) !== null) {
    matches.push({
      index: phoneMatch.index,
      length: phoneMatch[0].length,
      text: phoneMatch[0],
      type: 'phone',
    });
  }

  // インデックスでソート
  matches.sort((a, b) => a.index - b.index);

  // 重複を除外（URLの中に電話番号パターンが含まれる場合など）
  const filteredMatches = matches.filter((match, i) => {
    if (i === 0) return true;
    const prevMatch = matches[i - 1];
    return match.index >= prevMatch.index + prevMatch.length;
  });

  filteredMatches.forEach((match, i) => {
    // マッチ前のテキストを追加
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // リンクを追加
    if (match.type === 'url') {
      parts.push(
        <a
          key={`link-${i}`}
          href={match.text}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
        >
          {match.text}
        </a>
      );
    } else if (match.type === 'phone') {
      parts.push(
        <a
          key={`phone-${i}`}
          href={`tel:${match.text.replace(/-/g, '')}`}
          className="underline hover:opacity-80"
        >
          {match.text}
        </a>
      );
    }

    lastIndex = match.index + match.length;
  });

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
