/**
 * WebAuthn utility functions for passkey authentication
 * Uses SimpleWebAuthn library for registration and authentication
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server/script/deps';

// Configuration
export const rpName = process.env.RP_NAME || '親子マッチング';
export const rpID = process.env.RP_ID || 'localhost';
export const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name?: string;
  transports?: AuthenticatorTransportFuture[];
  created_at: string;
  last_used_at?: string;
}

export interface RegistrationOptions {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentials?: PasskeyCredential[];
}

export interface AuthenticationOptionsParams {
  allowCredentials?: PasskeyCredential[];
}

/**
 * Generate registration options for a new passkey
 */
export async function generatePasskeyRegistrationOptions(
  options: RegistrationOptions
) {
  const excludeCredentials = options.excludeCredentials?.map((cred) => ({
    id: Buffer.from(cred.credential_id, 'base64url'),
    type: 'public-key' as const,
    transports: cred.transports,
  }));

  return await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(options.userId),
    userName: options.userName,
    userDisplayName: options.userDisplayName,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });
}

/**
 * Verify registration response from the client
 */
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  return await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
}

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions(
  params: AuthenticationOptionsParams = {}
) {
  const allowCredentials = params.allowCredentials?.map((cred) => ({
    id: Buffer.from(cred.credential_id, 'base64url'),
    type: 'public-key' as const,
    transports: cred.transports,
  }));

  return await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });
}

/**
 * Verify authentication response from the client
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: PasskeyCredential
): Promise<VerifiedAuthenticationResponse> {
  return await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: Buffer.from(credential.credential_id, 'base64url'),
      publicKey: Buffer.from(credential.public_key, 'base64url'),
      counter: credential.counter,
    },
  });
}
