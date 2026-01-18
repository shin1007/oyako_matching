/**
 * ローカルコンテンツモデレーション
 * bad-wordsライブラリと日本語カスタム辞書を使用
 * 外部APIに依存せず、完全無料で動作
 */

import { badWordsJa, violencePatterns, insultPatterns } from '../moderation/badwords-ja';

// bad-wordsライブラリは使用せず、シンプルなワードフィルターを実装
// これによりESMインポートの問題を回避

/**
 * テキストに不適切なワードが含まれているかチェック
 */
function containsBadWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // 日本語不適切ワード
  for (const word of badWordsJa) {
    if (text.includes(word)) {
      return true;
    }
  }
  
  // 英語の基本的な不適切ワード（一部）
  const englishBadWords = ['fuck', 'shit', 'bitch', 'bastard', 'damn'];
  for (const word of englishBadWords) {
    if (lowerText.includes(word)) {
      return true;
    }
  }
  
  return false;
}

/**
 * コンテンツのモデレーション
 * 不適切なワード、暴力的表現、侮辱的表現を検出
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
}> {
  const categories: Record<string, boolean> = {
    profanity: false,    // 冒涜・不適切ワード
    violence: false,     // 暴力的表現
    insult: false,       // 侮辱的表現
  };

  let flagged = false;

  try {
    // 1. 不適切ワードのチェック
    if (containsBadWords(text)) {
      categories.profanity = true;
      flagged = true;
    }

    // 2. 暴力的表現のパターンマッチング
    for (const pattern of violencePatterns) {
      if (pattern.test(text)) {
        categories.violence = true;
        flagged = true;
        break;
      }
    }

    // 3. 侮辱的表現のパターンマッチング
    for (const pattern of insultPatterns) {
      if (pattern.test(text)) {
        categories.insult = true;
        flagged = true;
        break;
      }
    }

    return {
      flagged,
      categories,
    };
  } catch (error) {
    console.error('Moderation error:', error);
    // エラー時はモデレーションをスキップ
    return {
      flagged: false,
      categories: {},
    };
  }
}

/**
 * AI成長写真生成（DALL-E）
 * 注意: この機能は現在無効化されています。
 * OpenAI APIキーが必要な場合は、別途実装してください。
 */
export async function generateGrowthPhoto(
  prompt: string,
  age: number
): Promise<string> {
  console.warn('generateGrowthPhoto is not implemented');
  return '';
}
