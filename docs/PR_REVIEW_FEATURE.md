# 🤖 Automated PR Review Feature

## Overview

GitHub.gg now automatically analyzes pull requests and posts intelligent code reviews as comments. This feature uses AI to provide actionable feedback on code quality, security, performance, and maintainability.

## Features

- ✅ **Automatic Analysis**: Triggers on PR open and updates
- 🔍 **Comprehensive Review**: Analyzes code quality, security, performance, and maintainability
- 📊 **Scoring System**: Provides 0-100 scores for each category
- 💡 **Actionable Recommendations**: Specific suggestions for improvement
- 🔄 **Auto-Updates**: Re-analyzes when PR is updated
- 🎯 **Smart Filtering**: Only analyzes relevant code files (skips lock files, generated files, etc.)

## Setup

### Prerequisites

1. **GitHub App Installation**: Install the GitHub.gg GitHub App on your repository
2. **Webhook Configuration**: Set `GITHUB_WEBHOOK_SECRET` in your environment variables
3. **Gemini API Key**: Set `GEMINI_API_KEY` for AI analysis

### Environment Variables

```bash
# Required for PR reviews
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
```

## How It Works

1. **Webhook Trigger**: When a PR is opened or updated, GitHub sends a webhook
2. **File Analysis**: The system fetches changed files (up to 20 files)
3. **AI Review**: Gemini AI analyzes the code changes
4. **Comment Posting**: Results are posted as a comment on the PR
5. **Updates**: On subsequent pushes, the comment is updated

## Example Review Comment

```markdown
## 🚀 GitHub.gg AI Code Review

**Overall Score: 85/100**

The code demonstrates excellent structure and maintainability with strong adherence to best practices...

---

### 📊 Analysis Breakdown

#### 🎨 Code Quality (88/100)
✅ Strengths:
- Clean separation of concerns
- Consistent naming conventions

⚠️ Issues:
- Consider extracting complex logic into separate functions

#### 🔒 Security (90/100)
✅ No security concerns detected.

#### ⚡ Performance (82/100)
💡 Suggestions:
- Consider memoizing expensive computations
- Use pagination for large data sets

#### 🔧 Maintainability (85/100)
✅ Good maintainability.

---

### 🎯 Key Recommendations
1. Add unit tests for new functions
2. Update documentation for API changes
3. Consider adding error handling for edge cases

---

🤖 Powered by GitHub.gg
```

## Enabling/Disabling Reviews

### For Specific Repositories

Edit `src/lib/github/pr-comment-service.ts`:

```typescript
export async function isPRReviewEnabled(owner: string, repo: string): Promise<boolean> {
  // Add custom logic here
  // Example: Check subscription tier, repo settings, etc.

  if (repo === 'private-repo') {
    return false; // Disable for specific repo
  }

  return true;
}
```

### Rate Limiting

Token usage is automatically logged to the database for monitoring and rate limiting.

## Files Created

- `src/lib/ai/pr-analysis.ts` - AI analysis logic
- `src/lib/github/pr-comment-service.ts` - GitHub comment posting
- `src/app/api/webhooks/github/route.ts` - Updated webhook handlers

## Testing

To test the feature:

1. Install GitHub.gg app on a test repository
2. Create a pull request
3. Check for the AI review comment (may take 30-60 seconds)
4. Make changes and push to see the comment update

## Monitoring

Check logs for:
- `Starting PR analysis for #X`
- `Successfully posted review for PR #X`
- Token usage in database: `token_usage` table

## Future Enhancements

- [ ] Line-specific comments for issues
- [ ] Configurable review criteria
- [ ] Subscription-based rate limits
- [ ] Custom review templates
- [ ] Support for review threads
- [ ] Integration with GitHub Check Runs

## Troubleshooting

**Comment not appearing:**
- Check webhook delivery in GitHub App settings
- Verify `GITHUB_WEBHOOK_SECRET` is correct
- Check server logs for errors
- Ensure Gemini API key is valid

**Analysis fails:**
- Check Gemini API quota
- Verify file sizes aren't too large (>20 files skipped)
- Check logs for specific errors

## Cost Considerations

- **Gemini API**: ~2000-10000 tokens per PR
- **Database**: Minimal storage for token usage logs
- **Compute**: Runs asynchronously, minimal impact

Estimated cost: $0.01-0.05 per PR review (with Gemini 2.5 Pro)
