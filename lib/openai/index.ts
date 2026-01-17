import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
