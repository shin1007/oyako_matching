/**
 * xID API integration for My Number Card authentication
 */

// Lazy import js-nacl to avoid bundler/minifier conflicts in Turbopack
// and only load crypto on demand in server runtime

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
const XID_PUBLIC_KEY = process.env.XID_PUBLIC_KEY!;
const XID_PRIVATE_KEY = process.env.XID_PRIVATE_KEY!;

/**
 * xID APIからの暗号化されたレスポンスを復号化
 */
async function decryptXIDResponse(
  encryptedMessage: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const { instantiate } = await import('js-nacl');
      instantiate((nacl) => {
        try {
          const cipherBuff = Buffer.from(encryptedMessage, 'base64');
          const publicBuff = Buffer.from(publicKey, 'base64');
          const privateBuff = Buffer.from(privateKey, 'base64');

          const nonce = cipherBuff.slice(0, 24);
          const message = nacl.crypto_box_open(
            cipherBuff.slice(24),
            nonce,
            publicBuff,
            privateBuff
          );

          const utf8message = nacl.decode_utf8(message);
          resolve(utf8message);
        } catch (error) {
          reject(error);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * マイナンバーカード認証セッションを開始
 */
export async function initiateVerification(
  userId: string,
  callbackUrl: string
): Promise<XIDVerificationResponse> {
  // 開発環境ではモックレスポンスを返す
  if (process.env.NODE_ENV === 'development' && !XID_API_KEY) {
    console.warn('xID API key not configured, using mock response');
    const mockId = `mock-${Date.now()}`;
    return {
      verificationId: mockId,
      authUrl: `${callbackUrl}?verificationId=${mockId}`,
    };
  }
  
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
    const errorText = await response.text();
    console.error('[xID] initiate verification failed', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error('Failed to initiate xID verification');
  }

  const data = await response.json();
  
  // 暗号化されたレスポンスの場合は復号化
  if (data.encryptedMessage && XID_PUBLIC_KEY && XID_PRIVATE_KEY) {
    const decrypted = await decryptXIDResponse(
      data.encryptedMessage,
      XID_PUBLIC_KEY,
      XID_PRIVATE_KEY
    );
    return JSON.parse(decrypted);
  }

  return data;
}

/**
 * 認証結果を取得
 */
export async function getVerificationResult(
  verificationId: string
): Promise<XIDVerificationResult> {
  // 開発環境のモック
  if (verificationId.startsWith('mock-')) {
    console.warn('Using mock verification result');
    return {
      verified: true,
      fullName: 'テスト 太郎',
      birthDate: '1990-01-01',
      address: '東京都',
    };
  }

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

  const data = await response.json();

  // 暗号化されたレスポンスの場合は復号化
  if (data.encryptedMessage && XID_PUBLIC_KEY && XID_PRIVATE_KEY) {
    const decrypted = await decryptXIDResponse(
      data.encryptedMessage,
      XID_PUBLIC_KEY,
      XID_PRIVATE_KEY
    );
    return JSON.parse(decrypted);
  }

  return data;
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
