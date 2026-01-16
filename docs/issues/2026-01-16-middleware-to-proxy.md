# Deprecation: Migrate `middleware.ts` to `proxy.ts`

- Title: The "middleware" file convention is deprecated. Please use "proxy" instead.
- Link: https://nextjs.org/docs/messages/middleware-to-proxy
- Affected: Root-level `middleware.ts` in this repository
- Next.js Version: 16.1.1

## Summary
Next.js v16 deprecates the `middleware` file convention and replaces it with `proxy`. The root `middleware.ts` must be migrated to `proxy.ts`, and the exported function renamed from `middleware` to `proxy`. Config `matcher` remains supported.

## Scope
- Rename `middleware.ts` → `proxy.ts`
- Rename exported function `middleware` → `proxy`
- Preserve existing `config.matcher`
- No changes required to `lib/supabase/middleware.ts` helper (kept as is)

## Changes
- Added: `proxy.ts` at repo root
- Removed: `middleware.ts` at repo root
- Branch: `chore/migrate-middleware-to-proxy`
- Commit: chore(proxy): migrate from deprecated middleware.ts to proxy.ts per Next.js 16 deprecation

## Verification
- `next build`: Compiles app code successfully, TypeScript validation surfaced an unrelated type mismatch in `app/api/forum/posts/[id]/route.ts` (params typing for Next.js 16). This is outside the scope of the proxy migration and should be addressed in a separate issue.

## Follow-ups
- Open PR from `chore/migrate-middleware-to-proxy` and link this issue.
- Address unrelated TS error in `app/api/forum/posts/[id]/route.ts` in another issue.

## References
- Proxy file convention docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Migration guide: https://nextjs.org/docs/messages/middleware-to-proxy
