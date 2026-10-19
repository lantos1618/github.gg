# 🚀 PR Review Activation Guide

## Overview

PR reviews are **automatically enabled** for all repositories where you install the GitHub.gg App. You control which repos get reviews in 3 ways:

1. **GitHub App Installation** - Choose repos during install
2. **Global Toggle** - Turn reviews ON/OFF for all repos
3. **Per-Repo Exclusion** - Exclude specific repos (via settings UI)

---

## Step-by-Step Activation

### 1️⃣ Install GitHub App on Repos

**For First-Time Users:**

1. Go to: **https://dev.github.gg/install**
2. Click **"Install GitHub.gg App"**
3. You'll be redirected to GitHub
4. **Choose installation target:**
   - Personal account
   - Or organization

5. **Select repositories:**
   ```
   ○ All repositories (recommended for personal)
   ● Only select repositories
     ✓ my-awesome-repo
     ✓ another-repo
     ✓ test-project
   ```

6. Click **"Install"**

**For Existing Installations:**

Update which repos have access:
1. Go to: `https://github.com/settings/installations`
2. Find "GitHub.gg" app
3. Click **"Configure"**
4. Add/remove repositories

---

### 2️⃣ Verify Webhook Configuration

**⚠️ Important: This is ONE-TIME setup for the GitHub App itself**

1. Go to GitHub App settings:
   ```
   https://github.com/settings/apps/[your-app-name]
   ```

2. Scroll to **"Webhook"** section
3. Configure:
   ```
   ✅ Active
   Webhook URL: https://dev.github.gg/api/webhooks/github
   Content type: application/json
   Secret: [your GITHUB_WEBHOOK_SECRET value]
   ```

4. SSL verification: **Enable**

5. **Subscribe to events:**
   - ✅ Pull requests
   - ✅ Installation repositories
   - ✅ Installation
   - ☐ Push (optional - for future features)

6. Click **"Save changes"**

---

### 3️⃣ Configure PR Review Settings

**Go to Settings Page:**

Navigate to: **https://dev.github.gg/settings**

#### Global Controls

```
┌──────────────────────────────────────────────┐
│ 🔗 PR Review Automation                     │
│                                              │
│ ✓ GitHub App installed for @username        │
│                                              │
│ Enable PR Reviews              [●]           │  ← Master switch
│ Automatically post AI reviews on all PRs     │
│                                              │
│ Auto-update Comments           [●]           │  ← Update on push
│ Update review when PR is updated             │
└──────────────────────────────────────────────┘
```

#### Per-Repo Exclusion (Future Enhancement)

```
┌──────────────────────────────────────────────┐
│ Excluded Repositories                        │
│                                              │
│ [+ Add Repository]                           │
│                                              │
│ • username/repo-1              [Remove]      │
│ • username/repo-2              [Remove]      │
└──────────────────────────────────────────────┘
```

---

## How It Works

### Flow Diagram

```
1. Developer opens PR
   ↓
2. GitHub sends webhook → https://dev.github.gg/api/webhooks/github
   ↓
3. System checks:
   ✓ Is GitHub App installed on this repo?
   ✓ Is user's "Enable PR Reviews" toggled ON?
   ✓ Is repo in excluded list?
   ↓
4. If all checks pass:
   → Fetch changed files
   → Send to Gemini AI for analysis
   → Post comment on PR
   ↓
5. Developer sees AI review comment in ~30-60 seconds
```

### When Comments Appear

✅ **PR Reviews will be posted when:**
- GitHub App is installed on the repo
- "Enable PR Reviews" is ON in settings
- Repo is NOT in excluded list
- PR has code changes (not just README)

❌ **PR Reviews will NOT be posted when:**
- GitHub App not installed on repo
- "Enable PR Reviews" toggled OFF
- Repo is in excluded list
- PR only has binary files or lock files

---

## Current Repo Configuration

### Check Which Repos Are Active

**Method 1: GitHub Settings**
```
https://github.com/settings/installations
→ Find "GitHub.gg"
→ Click "Configure"
→ See list of repos with access
```

**Method 2: Installation Info in Settings**
```
https://dev.github.gg/settings
→ Scroll to "PR Review Automation"
→ Shows: "✓ GitHub App installed for @username"
```

---

## Repository Selection Strategies

### Strategy 1: All Repos (Personal Use)
```
Best for: Individual developers
Setup: Install on "All repositories"
Control: Use global toggle to enable/disable
```

### Strategy 2: Selective (Team/Organization)
```
Best for: Organizations with many repos
Setup: Install on "Only select repositories"
Add: Critical projects, active development repos
Exclude: Archives, forks, experimental repos
```

### Strategy 3: Per-Repo Control (Advanced)
```
Best for: Fine-grained control
Setup: Install on all repos
Control: Use excluded repos list
Example: Exclude test repos, personal projects
```

---

## Testing Your Setup

### Quick Verification

1. **Check installation:**
   ```bash
   Go to: https://github.com/settings/installations
   Verify "GitHub.gg" shows your repos
   ```

2. **Check settings:**
   ```bash
   Go to: https://dev.github.gg/settings
   Verify "Enable PR Reviews" is ON
   ```

3. **Create test PR:**
   ```bash
   # In any installed repo
   git checkout -b test-pr-review
   echo "test" > test.txt
   git add test.txt
   git commit -m "test"
   git push origin test-pr-review
   gh pr create --title "Test" --body "Testing PR reviews"
   ```

4. **Wait 30-60 seconds**

5. **Check PR for AI comment**

---

## Troubleshooting

### "No GitHub App installation found"

**Problem:** Settings page shows no installation

**Solutions:**
1. Visit https://dev.github.gg/install
2. Install the GitHub.gg app
3. Refresh settings page

### "PR reviews not working"

**Checklist:**
- [ ] GitHub App installed on repo? ✓
- [ ] Webhook configured? ✓
- [ ] "Enable PR Reviews" ON? ✓
- [ ] Repo not in excluded list? ✓
- [ ] Webhook secret correct? ✓

**Debug steps:**
1. Check webhook deliveries:
   ```
   https://github.com/settings/apps/[app-name]
   → Advanced tab
   → Recent Deliveries
   → Find pull_request event
   → Check response (should be 200 OK)
   ```

2. Check server logs for errors

3. Verify Gemini API key is set

### "Comment not appearing"

Wait up to 2 minutes (analysis takes time).

If still nothing:
1. Check webhook delivery (see above)
2. Verify repo is not excluded
3. Check that PR has code changes (not just docs)

---

## Managing Multiple Repositories

### Add New Repo to Existing Installation

```
1. https://github.com/settings/installations
2. Click "Configure" next to GitHub.gg
3. Under "Repository access"
4. Click "Select repositories" dropdown
5. Search and select new repo
6. Click "Save"
```

### Remove Repo from Installation

Same steps, but uncheck the repo.

### Temporarily Disable for All Repos

```
https://dev.github.gg/settings
→ Toggle "Enable PR Reviews" OFF
→ No new comments will be posted
→ Existing settings preserved
```

---

## FAQ

**Q: Do I need to configure webhooks for each repo?**
A: No! Webhooks are configured once at the GitHub App level and work for all installed repos.

**Q: Can I control reviews per-repo?**
A: Yes, use the excluded repos list (or remove repo from GitHub App installation).

**Q: What happens if I uninstall the app?**
A: All webhooks stop immediately. Your settings are preserved if you reinstall.

**Q: Can team members have different settings?**
A: No, settings are per-installation (organization-wide). Each user has their own settings for their personal repos.

**Q: How much does each PR review cost?**
A: Usage depends on the repository and review size. The app records tokens used by each review; check the [current Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) for the model's cost.

---

## Next Steps

1. ✅ Install GitHub App
2. ✅ Configure settings
3. ✅ Create test PR
4. ✅ Verify comment appears
5. 🎉 Enjoy automated code reviews!
