/**
 * ローカルコンテンツモデレーション
 * bad-wordsライブラリと日本語カスタム辞書を使用
 * 外部APIに依存せず、完全無料で動作
 */

import { badWordsJa, violencePatterns, insultPatterns, sexualPatterns } from '../moderation/badwords-ja';

// bad-wordsライブラリは使用せず、シンプルなワードフィルターを実装
// これによりESMインポートの問題を回避

/**
 * テキストに不適切なワードが含まれているかチェック
 * @returns 不適切なワードの配列（見つからない場合は空配列）
 */
function findBadWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  
  // 日本語不適切ワード
  for (const word of badWordsJa) {
    if (text.includes(word)) {
      foundWords.push(word);
    }
  }
  
  // 英語の基本的な不適切ワード（一部）
  const englishBadWords = ['fuck', 'shit', 'bitch', 'bastard', 'damn'];
  for (const word of englishBadWords) {
    if (lowerText.includes(word)) {
      foundWords.push(word);
    }
  }
  
  return foundWords;
}

/**
 * コンテンツのモデレーション
 * 不適切なワード、暴力的表現、侮辱的表現を検出
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  flaggedWords?: string[];
  message?: string;
}> {
  const categories: Record<string, boolean> = {
    profanity: false,    // 冒涜・不適切ワード
    violence: false,     // 暴力的表現
    insult: false,       // 侮辱的表現
    sexual: false,       // 性的表現
  };

  let flagged = false;
  const flaggedWords: string[] = [];
  const messages: string[] = [];

  try {
    // 1. 不適切ワードのチェック
    const badWords = findBadWords(text);
    if (badWords.length > 0) {
      categories.profanity = true;
      flagged = true;
      flaggedWords.push(...badWords);
      messages.push(`不適切な表現が含まれています: 「${badWords.join('」「」')}」`);
    }

    // 2. 暴力的表現のパターンマッチング
    for (const pattern of violencePatterns) {
      if (pattern.test(text)) {
        categories.violence = true;
        flagged = true;
        messages.push('暴力的な表現が含まれています');
        break;
      }
    }

    // 3. 侮辱的表現のパターンマッチング
    for (const pattern of insultPatterns) {
      if (pattern.test(text)) {
        categories.insult = true;
        flagged = true;
        messages.push('侮辱的な表現が含まれています');
        break;
      }
    }
// 4. 性的表現のパターンマッチング
    for (const pattern of sexualPatterns) {
      if (pattern.test(text)) {
        categories.sexual = true;
        flagged = true;
        messages.push('性的な表現が含まれています');
        break;
      }
    }

    
    return {
      flagged,
      categories,
      flaggedWords: flaggedWords.length > 0 ? flaggedWords : undefined,
      message: messages.length > 0 ? messages.join('、') : undefined,
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
