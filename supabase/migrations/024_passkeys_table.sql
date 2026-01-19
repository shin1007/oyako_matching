-- Passkeys table for WebAuthn authentication
-- This table stores passkey credentials for users to enable passwordless login

CREATE TABLE IF NOT EXISTS public.passkeys (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0 NOT NULL,
  device_name TEXT,
  transports TEXT[], -- Transport methods: usb, nfc, ble, internal
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON public.passkeys(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_last_used ON public.passkeys(last_used_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.passkeys IS 'Stores WebAuthn passkey credentials for passwordless authentication';
COMMENT ON COLUMN public.passkeys.credential_id IS 'Base64url-encoded credential ID from WebAuthn';
COMMENT ON COLUMN public.passkeys.public_key IS 'Base64url-encoded public key';
COMMENT ON COLUMN public.passkeys.counter IS 'Signature counter to prevent replay attacks';
COMMENT ON COLUMN public.passkeys.transports IS 'Available transport methods for this authenticator';
