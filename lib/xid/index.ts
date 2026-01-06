/**
 * xID API integration for My Number Card authentication
 */

interface XIDVerificationRequest {
  userId: string;
  callbackUrl: string;
}

interface XIDVerificationResponse {
  verificationId: string;
  authUrl: string;
}

interface XIDVerificationResult {
  verified: boolean;
  fullName?: string;
  birthDate?: string;
  address?: string;
}

const XID_API_URL = process.env.XID_API_URL || 'https://api.xid.inc';
const XID_API_KEY = process.env.XID_API_KEY!;
const XID_API_SECRET = process.env.XID_API_SECRET!;

/**
 * マイナンバーカード認証セッションを開始
 */
export async function initiateVerification(
  userId: string,
  callbackUrl: string
): Promise<XIDVerificationResponse> {
  const response = await fetch(`${XID_API_URL}/v1/verifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': XID_API_KEY,
      'X-API-Secret': XID_API_SECRET,
    },
    body: JSON.stringify({
      userId,
      callbackUrl,
      type: 'mynumber_card',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to initiate xID verification');
  }

  return await response.json();
}

/**
 * 認証結果を取得
 */
export async function getVerificationResult(
  verificationId: string
): Promise<XIDVerificationResult> {
  const response = await fetch(
    `${XID_API_URL}/v1/verifications/${verificationId}`,
    {
      headers: {
        'X-API-Key': XID_API_KEY,
        'X-API-Secret': XID_API_SECRET,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get verification result');
  }

  return await response.json();
}

/**
 * 生年月日を検証（12歳以上の確認）
 */
export function verifyAge(birthDate: string): { isValid: boolean; age: number } {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return {
    isValid: age >= 12,
    age,
  };
}
