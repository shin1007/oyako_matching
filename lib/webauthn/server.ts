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
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

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
    id: cred.credential_id,
    transports: cred.transports,
  }));

  return await generateRegistrationOptions({
    rpName,
    rpID,
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
    id: cred.credential_id,
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
  // Convert base64url strings to Uint8Array for publicKey
  const publicKeyBytes = Buffer.from(credential.public_key, 'base64url');
  
  return await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credential_id,
      publicKey: publicKeyBytes,
      counter: credential.counter,
      transports: credential.transports,
    },
  });
}
