# 🧪 Testing PR Review Feature

## Prerequisites

1. **GitHub App Installed**: You must have the GitHub.gg GitHub App installed on a test repository
2. **Webhook Secret Configured**: `GITHUB_WEBHOOK_SECRET` must be set in your environment
3. **Gemini API Key**: `GEMINI_API_KEY` must be configured
4. **Database**: `webhook_preferences` table must exist (run `bun run db:push`)

## Quick Test

### 1. Configure Webhook Settings (Optional)

1. Navigate to https://dev.github.gg/settings
2. Scroll to "PR Review Automation" section
3. Verify GitHub App is installed
4. Ensure "Enable PR Reviews" is toggled ON
5. Ensure "Auto-update Comments" is toggled ON

### 2. Create a Test PR

**Option A: Using an existing test repo**

```bash
# Clone or navigate to your test repo
cd your-test-repo

# Create a new branch
git checkout -b test-pr-review

# Make some code changes (add a new file or modify existing)
echo "console.log('Hello World');" > test.js

# Commit and push
git add test.js
git commit -m "Add test file for PR review"
git push origin test-pr-review

# Create PR via GitHub UI or CLI
gh pr create --title "Test PR Review" --body "Testing automated PR reviews"
```

**Option B: Quick test with existing files**

1. Go to your test repo on GitHub
2. Click "Pull requests" → "New pull request"
3. Select `main` as base and create a new branch with some changes
4. Click "Create pull request"

### 3. Monitor Webhook Delivery

**Check GitHub Webhook Deliveries:**

1. Go to your GitHub App settings: https://github.com/settings/apps/[your-app-name]
2. Click "Advanced" tab
3. View "Recent Deliveries"
4. Find the `pull_request` event for your PR
5. Check if delivery was successful (green checkmark)

**Check Server Logs:**

```bash
# View logs from dev server
# Look for these messages:
# - "PR opened: [title] in [repo]"
# - "Starting PR analysis for #[number]"
# - "Successfully posted review for PR #[number]"
```

### 4. Verify AI Comment

1. Open your test PR on GitHub
2. Wait 30-60 seconds for analysis to complete
3. Check for a comment from your GitHub App bot
4. Comment should include:
   - Overall score (0-100)
   - Code quality breakdown
   - Security analysis
   - Performance suggestions
   - Maintainability assessment
   - Key recommendations

### 5. Test Auto-Update

1. Make additional changes to your PR branch
2. Push the changes
3. Wait 30-60 seconds
4. Verify the bot comment was updated (not a new comment)

## Expected Comment Format

```markdown
## 🚀 GitHub.gg AI Code Review

**Overall Score: 85/100**

This PR demonstrates good code quality with room for improvement...

---

### 📊 Analysis Breakdown

#### 🎨 Code Quality (88/100)
✅ Strengths:
- Clean code structure
...

---

🤖 Powered by GitHub.gg
```

## Troubleshooting

### Comment doesn't appear

1. **Check webhook delivery in GitHub App settings**
   - Status should be 200 OK
   - Response should be "OK"

2. **Check server logs for errors**
   ```bash
   # Common errors:
   # - "No installation ID provided"
   # - "PR review not enabled"
   # - Gemini API errors
   ```

3. **Verify settings**
   - Go to /settings
   - Ensure PR Reviews are enabled
   - Check if repo is in excluded list

### Webhook not triggering

1. **Verify webhook URL is correct**
   - Should be: `https://your-domain.com/api/webhooks/github`
   - Check in GitHub App settings → Webhooks

2. **Check webhook secret**
   - Must match `GITHUB_WEBHOOK_SECRET` in .env

3. **Verify GitHub App permissions**
   - Must have "Read & Write" for Pull requests
   - Must have "Read" for Repository contents

### Analysis fails

1. **Check Gemini API key**
   ```bash
   # Test API key
   curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=YOUR_KEY"
   ```

2. **Check file size limits**
   - Only first 20 files are analyzed
   - Binary files and lock files are skipped

3. **Check database**
   ```bash
   # Verify token usage is being logged
   bun --env-file=.env.local drizzle-kit studio
   # Check token_usage table
   ```

## Manual Webhook Testing

You can manually trigger a webhook for testing:

```bash
# Get a real PR webhook payload
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/pulls/PR_NUMBER

# Send it to your webhook endpoint
curl -X POST https://dev.github.gg/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @payload.json
```

## Test Checklist

- [ ] PR opened → Comment appears
- [ ] PR updated → Comment updates (not new comment)
- [ ] Toggle PR reviews OFF → No new comments
- [ ] Toggle PR reviews back ON → Comments resume
- [ ] Settings page loads without errors
- [ ] Installation info displays correctly
- [ ] Token usage logged in database
- [ ] Comment includes all required sections
- [ ] Comment formatting is correct
- [ ] Links in comment work

## Next Steps After Testing

1. **Monitor token usage** - Check costs in token_usage table
2. **Add rate limiting** - Implement per-user limits if needed
3. **Add per-repo settings** - Allow excluding specific repos
4. **Add custom templates** - Let users customize comment format
5. **Add line-specific comments** - Comment on specific code lines
