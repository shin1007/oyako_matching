# Fix: Turbopack ChunkLoadError on /api/auth/verify/initiate

- Title: Turbopack build fails collecting page data for /api/auth/verify/initiate
- Error: `ChunkLoadError` with cause `SyntaxError: Label 'A' has already been declared`
- Affected Route: `app/api/auth/verify/initiate/route.ts`
- Next.js Version: 16.1.1 (Turbopack)

## Symptoms
During `next build`, Turbopack fails while collecting page data:

```
Error [ChunkLoadError]: Failed to load chunk server/chunks/[root-of-the-server]__7e050b81._.js from runtime for chunk server/app/api/auth/verify/initiate/route.js
  cause: SyntaxError: Label 'A' has already been declared
```

## Root Cause (Likely)
The route indirectly loads `js-nacl` via `lib/xid`, which can produce bundler/minifier conflicts under Turbopack when eagerly imported at module scope. This surfaces as a duplicated label in the minified runtime chunk.

## Fix
- Force Node.js runtime for the route and dynamic rendering to avoid edge/minified chunk issues.
- Lazy-load `js-nacl` inside the decryption function to avoid eager bundling.

### Code Changes
- Route config: [app/api/auth/verify/initiate/route.ts](../../app/api/auth/verify/initiate/route.ts)
  - Added `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`.
- Lazy import: [lib/xid/index.ts](../../lib/xid/index.ts)
  - Changed to `await import('js-nacl')` inside `decryptXIDResponse()`.

## Verification
- Re-ran `npm run build`; the previous `ChunkLoadError` no longer occurs.
- A different, unrelated error surfaced (`useSearchParams()` suspense boundary) on `/auth/register`, to be handled in a separate issue.

## Follow-ups
- If crypto performance matters, consider replacing `js-nacl` with `tweetnacl` or Node's `crypto` for server-only use.
- Add unit tests for `lib/xid` decrypt path to ensure lazy import works in CI.
