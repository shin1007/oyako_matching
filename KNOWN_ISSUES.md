# Known Issues & Technical Debt

## TypeScript Configuration

### Strict Mode Disabled
**File**: `tsconfig.json`
**Issue**: TypeScript strict mode is disabled (`"strict": false`)

**Reason**: 
The Supabase generated types don't work well with Next.js 15 and TypeScript strict mode, causing numerous type errors that are difficult to resolve without significant workarounds.

**Impact**: 
Reduced type safety in some areas of the codebase. However, the core business logic is still type-safe, and runtime behavior is not affected.

**Recommendation for Production**:
1. Generate proper Supabase types using `supabase gen types`
2. Update the Database type definitions in `types/database.ts`
3. Re-enable strict mode
4. Fix any remaining type errors

**Workaround in Current Implementation**:
- Used `@ts-ignore` comments in specific locations where Supabase types conflict
- Used `any` type casting in webhook handlers for Stripe types
- All other code maintains proper type safety

## Future Improvements

### 1. Supabase Type Generation
Once the Supabase database is fully set up:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

### 2. Testing Infrastructure
- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for critical user flows
- Consider using Jest + React Testing Library

### 3. Performance Optimizations
- Implement caching strategy for matching results
- Optimize vector similarity queries with proper indexes
- Implement pagination for large data sets
- Add loading states and optimistic updates

### 4. Accessibility
- Add ARIA labels to all interactive elements
- Ensure keyboard navigation works throughout
- Test with screen readers
- Ensure color contrast meets WCAG standards

### 5. Internationalization
- Set up i18n infrastructure for future multi-language support
- Extract all hardcoded Japanese text to translation files

### 6. Error Handling
- Implement global error boundary
- Add better error messages for users
- Implement retry logic for API calls
- Add logging service integration (e.g., Sentry)

### 7. Real-time Features
- Implement real-time messaging using Supabase Realtime
- Add online/offline status indicators
- Push notifications for new matches and messages

### 8. Mobile Responsiveness
- Test on various mobile devices
- Optimize touch interactions
- Consider PWA features

## Non-Critical Issues

### Font Loading
Currently using system fonts instead of custom fonts (e.g., Noto Sans JP) due to build environment restrictions. This works fine but can be improved for better visual consistency.

### Environment-Specific Code
Some API integrations (xID, OpenAI, Stripe) are mocked or stubbed for development. Ensure proper implementation with real credentials in production.

## Security Considerations


### Rate Limiting
**現状:**
- ログイン（パスキー認証）APIエンドポイントにIPアドレス単位のレートリミット（1分5回・1時間20回）を実装済み。
- その他のAPIエンドポイント（マッチング検索・メッセージ送信等）は未実装。

**今後の改善方針:**
- 主要なAPIエンドポイント全体にレートリミットを段階的に適用予定。
- 必要に応じてユーザーID単位やグローバル単位の制限も検討。
- 設定値や解除条件は運用状況を見て調整。

### CAPTCHA
Add CAPTCHA or similar bot protection to:
- Registration forms
- Login forms (after failed attempts)

### Audit Logging
Implement comprehensive audit logging for:
- Authentication events
- Data access
- Subscription changes
- Match creation and status changes

## Documentation Debt

### API Documentation
Create OpenAPI/Swagger documentation for all API endpoints.

### User Documentation
Create end-user help documentation and FAQs.

### Deployment Guide
Expand deployment documentation with:
- CI/CD pipeline setup
- Monitoring setup
- Backup and recovery procedures
- Scaling strategies

## Monitoring & Observability

Implement monitoring for:
- Application performance (APM)
- Error tracking
- User analytics
- Business metrics (conversion rates, retention, etc.)

---

**Note**: These are not blocking issues for MVP deployment but should be addressed for long-term production quality and maintainability.
