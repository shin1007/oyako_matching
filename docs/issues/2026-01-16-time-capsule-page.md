# Feature: Build /dashboard/time-capsules page

- Title: Implement parent/child time capsule experience (current route returns 404)
- Affected Route: /dashboard/time-capsules
- Tables: public.time_capsules (unlock_date, child_birth_date, message, opened_at)
- Status: Page missing; dashboard card links to 404

## Summary
The dashboard advertises a Time Capsule feature, but the linked route /dashboard/time-capsules does not exist. Users cannot create or read scheduled messages intended for future delivery. Implement a dedicated page that lets parents schedule messages for their child and lets children receive unlocked capsules once the unlock date arrives (enforced by existing RLS).

## Scope
- Add a client page under app/dashboard/time-capsules/page.tsx with Supabase client access
- Parent view: create form (child_birth_date, unlock_date, message) + list of own capsules
- Child view: list unlocked capsules matched by birth_date and unlock_date <= today (per RLS)
- Surface status badges (locked/unlockable/opened_at) and countdown messaging

## Changes
- Added: app/dashboard/time-capsules/page.tsx — parent form + parent/child listing and hero content
- Added: docs/issues/2026-01-16-time-capsule-page.md (this file)

## Verification
- Login as parent → Dashboard → Time Capsules: form renders, creation succeeds, new entry appears in list
- Login as child with matching birth_date and unlock_date <= today → message appears in list (locked capsules stay hidden by RLS)
- Routing no longer returns 404 from dashboard card

## Follow-ups
- If we want to record when a child opens a capsule, add an RLS-safe UPDATE policy for time_capsules.opened_at and a minimal mutation endpoint/button.
- Consider adding moderation for capsule messages similar to episode creation.
