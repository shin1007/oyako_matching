/**
 * Client-side WebAuthn utilities for passkey authentication
 * Uses SimpleWebAuthn browser library
 */

import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

export type { RegistrationResponseJSON, AuthenticationResponseJSON };

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    window?.PublicKeyCredential !== undefined &&
    navigator?.credentials !== undefined
  );
}

/**
 * Check if platform authenticator (like Touch ID, Face ID) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register a new passkey
 */
export async function registerPasskey(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<RegistrationResponseJSON> {
  try {
    return await startRegistration(options);
  } catch (error) {
    console.error('Passkey registration failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'パスキーの登録に失敗しました'
    );
  }
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<AuthenticationResponseJSON> {
  try {
    return await startAuthentication(options);
  } catch (error) {
    console.error('Passkey authentication failed:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'パスキーでの認証に失敗しました'
    );
  }
}

/**
 * Get a user-friendly error message for WebAuthn errors
 */
export function getWebAuthnErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'パスキー操作に失敗しました';
  }

  const message = error.message.toLowerCase();

  if (message.includes('aborted') || message.includes('cancelled')) {
    return 'パスキー操作がキャンセルされました';
  }

  if (message.includes('timeout')) {
    return 'パスキー操作がタイムアウトしました。もう一度お試しください。';
  }

  if (message.includes('not allowed') || message.includes('notallowederror')) {
    return 'パスキーの使用が許可されていません。ブラウザの設定を確認してください。';
  }

  if (message.includes('not supported')) {
    return 'このブラウザまたはデバイスはパスキーに対応していません';
  }

  if (message.includes('invalid state') || message.includes('invalidstateerror')) {
    return 'このパスキーは既に登録されています';
  }

  if (message.includes('security')) {
    return 'セキュリティエラーが発生しました。HTTPSで接続していることを確認してください。';
  }

  return error.message || 'パスキー操作に失敗しました';
}
