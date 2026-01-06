import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * エピソードテキストをベクトル化
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * コンテンツのモデレーション
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
}> {
  const response = await openai.moderations.create({
    input: text,
  });

  const result = response.results[0];
  return {
    flagged: result.flagged,
    categories: result.categories as any as Record<string, boolean>,
  };
}

/**
 * AI成長写真生成（DALL-E）
 */
export async function generateGrowthPhoto(
  prompt: string,
  age: number
): Promise<string> {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${age}歳の子どもの写真。${prompt}。自然で温かみのある写真風。`,
    n: 1,
    size: '1024x1024',
  });

  return response.data[0].url || '';
}

/**
 * ベクトル間の類似度計算（コサイン類似度）
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
