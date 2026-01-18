/**
 * ローカルコンテンツモデレーション
 * bad-wordsライブラリと日本語カスタム辞書を使用
 * 外部APIに依存せず、完全無料で動作
 */

import * as BadWordsPackage from 'bad-words';
import { badWordsJa, violencePatterns, insultPatterns } from '../moderation/badwords-ja';

// bad-wordsフィルターの初期化
const Filter = (BadWordsPackage as any).default || BadWordsPackage;
const filter = new Filter();

// 日本語の不適切ワードを追加
filter.addWords(...badWordsJa);

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
    // 1. bad-wordsライブラリでチェック（英語 + カスタム日本語ワード）
    if (filter.isProfane(text)) {
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
