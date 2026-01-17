/**
 * Perspective APIを使用したコンテンツモデレーション
 * Google Cloud API Keyが必要です
 */

const PERSPECTIVE_API_ENDPOINT = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;

/**
 * コンテンツのモデレーション
 * Perspective APIを使用して毒性、脅威、ハラスメントなどを検出
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
}> {
  if (!PERSPECTIVE_API_KEY) {
    console.warn('PERSPECTIVE_API_KEY is not set. Skipping moderation.');
    return {
      flagged: false,
      categories: {},
    };
  }

  try {
    const response = await fetch(`${PERSPECTIVE_API_ENDPOINT}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: { text },
        languages: ['ja', 'en'], // 日本語と英語に対応
        requestedAttributes: {
          TOXICITY: {},           // 毒性
          SEVERE_TOXICITY: {},    // 重度の毒性
          IDENTITY_ATTACK: {},    // 個人攻撃
          INSULT: {},             // 侮辱
          PROFANITY: {},          // 冒涜
          THREAT: {},             // 脅迫
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Perspective API error: ${response.status}`);
    }

    const data = await response.json();
    const scores = data.attributeScores;

    // 各スコアをチェック（閾値: 0.7以上で不適切と判定）
    const threshold = 0.7;
    const categories: Record<string, boolean> = {};
    let flagged = false;

    for (const [attribute, scoreData] of Object.entries(scores)) {
      const score = (scoreData as any).summaryScore.value;
      const isFlagged = score >= threshold;
      categories[attribute.toLowerCase()] = isFlagged;
      if (isFlagged) {
        flagged = true;
      }
    }

    return {
      flagged,
      categories,
    };
  } catch (error) {
    console.error('Moderation error:', error);
    // エラー時はモデレーションをスキップ（安全側に倒す場合は flagged: true に変更可能）
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
