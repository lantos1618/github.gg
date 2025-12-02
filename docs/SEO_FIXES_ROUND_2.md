# Google Search Console Fixes - Round 2 (Specific Issues)

This document addresses the specific issues identified in Google Search Console examples.

## Critical Issues Identified

### 1. **Duplicate without canonical - www subdomain and query parameters**

**Examples from GSC:**
- `https://www.github.gg/` vs `https://github.gg/`
- `https://www.github.gg/?ref=topyai` (query parameter creating duplicate)

**Fixes Applied:**
- ✅ Created SEO utility (`src/lib/utils/seo.ts`) that normalizes canonical URLs:
  - Removes `www` subdomain
  - Strips query parameters
  - Ensures HTTPS protocol
  - Removes trailing slashes
- ✅ Updated all canonical URL generation to use `buildCanonicalUrl()` utility
- ✅ All pages now generate consistent canonical URLs

### 2. **Soft 404 - Invalid routes**

**Examples from GSC:**
- `/actions` - GitHub Actions route (not supported)
- `/security` - Security tab (not supported)
- `/sigma` - Unknown route
- `/settings` - Settings tab (not supported)
- `/insights/*` - Insights routes (not supported)

**Fixes Applied:**
- ✅ Created `INVALID_TABS` list in SEO utility
- ✅ Added `isInvalidTab()` validation function
- ✅ Route handler now returns 404 for invalid tabs like:
  - `actions`, `security`, `settings`, `insights`, `wiki`, `projects`, `commits`, `commit`, `branches`, `releases`, `tags`, `contributors`, `graphs`, `network`, `pulse`, `community`, `codeowners`, `sigma`
- ✅ Invalid tabs trigger `notFound()` which returns proper 404 status

### 3. **URL Variations Creating Duplicates**

**Examples:**
- `/tree/insights/scorecard` vs `/insights/scorecard`
- URLs with `/refactor/`, `/settings/` prefixes

**Fixes Applied:**
- ✅ Canonical URL generation already filters out `/tree/` prefix
- ✅ All canonical URLs are normalized consistently
- ✅ Query parameters are stripped from canonical URLs

### 4. **Redirect Issues**

**Examples:**
- `http://www.github.gg/` → should redirect to `https://github.gg/`
- `https://www.github.gg/home/` → should redirect or 404

**Recommendations:**
- Configure redirects at hosting/CDN level (Vercel):
  - HTTP → HTTPS redirect
  - www → non-www redirect
- Add redirect middleware if needed

## Files Created/Modified

### New Files
- `src/lib/utils/seo.ts` - SEO utility functions

### Modified Files
- `src/app/[user]/[[...params]]/page.tsx` - Added invalid tab validation, improved canonical URLs
- `src/app/wiki/[owner]/[repo]/page.tsx` - Updated to use SEO utility
- `src/app/wiki/[owner]/[repo]/[slug]/page.tsx` - Updated to use SEO utility

## Validation Functions

### `isInvalidTab(tab: string): boolean`
Returns `true` for tabs that should return 404:
- `actions`, `security`, `settings`, `insights`, `wiki`, `projects`, `commits`, `commit`, `branches`, `releases`, `tags`, `contributors`, `graphs`, `network`, `pulse`, `community`, `codeowners`, `sigma`

### `buildCanonicalUrl(path: string): string`
Normalizes URLs to canonical format:
- Base URL: `https://github.gg`
- No www subdomain
- No query parameters
- No trailing slashes (except root)

### `normalizeCanonicalUrl(url: string): string`
Normalizes any full URL:
- Removes www
- Strips query params
- Ensures HTTPS
- Removes trailing slashes

## Testing Checklist

1. ✅ Test invalid tabs return 404:
   - `/user/repo/actions` → 404
   - `/user/repo/security` → 404
   - `/user/repo/settings` → 404

2. ✅ Test canonical URLs:
   - Check page source for `<link rel="canonical">` tags
   - Verify no www in canonical URLs
   - Verify no query parameters in canonical URLs

3. ✅ Test URL variations:
   - `/user/repo/tree/main` → canonical should be `/user/repo` (if main is default)
   - `/user/repo?ref=topyai` → canonical should be `/user/repo`

## Expected Impact

### Immediate (1-2 weeks)
- Invalid routes now return proper 404 status codes
- Canonical URLs are consistent across all pages

### Short-term (2-4 weeks)
- Google should stop crawling invalid routes
- Duplicate page count should decrease as canonical URLs are recognized

### Long-term (4-8 weeks)
- Significant reduction in duplicate page issues
- Better indexing of valid pages
- Reduced soft 404 errors

## Next Steps

1. **Monitor Google Search Console** for improvements
2. **Configure Hosting Redirects** (Vercel/Cloudflare):
   - Set up HTTP → HTTPS redirect
   - Set up www → non-www redirect
3. **Review Remaining Issues**:
   - Check if commit routes need special handling
   - Verify all route patterns are correctly validated

## Remaining Considerations

### Routes That May Need Special Handling
- `/commit/*` routes - These appear in examples but may be legacy/test data
- `/docs/*` routes - Need to verify if these are wiki routes or separate

### Redirect Configuration (Infrastructure)
Consider adding to `vercel.json` or hosting config:
```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "host",
          "value": "www.github.gg"
        }
      ],
      "destination": "https://github.gg/:path*",
      "permanent": true
    },
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "scheme",
          "value": "http"
        }
      ],
      "destination": "https://github.gg/:path*",
      "permanent": true
    }
  ]
}
```

## Notes

- Invalid tabs are now properly validated server-side before rendering
- All canonical URLs use the centralized SEO utility for consistency
- Query parameters are automatically stripped from canonical URLs
- The www subdomain issue is handled in canonical URLs (redirects should be configured at infrastructure level)

