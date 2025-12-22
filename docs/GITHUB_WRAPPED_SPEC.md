# GitHub Wrapped - Product Specification

## Overview

GitHub Wrapped is a viral, shareable year-in-review experience for developers - think Spotify Wrapped, but for your code. Users get an animated, story-style walkthrough of their GitHub contributions, AI-powered insights, and can invite friends to compare stats.

**Tone**: Self-aware, slightly unhinged, terminally online humor. Think "developer Twitter meets corporate Memphis parody."

---

## ⭐ Star-Gate: The Viral Lock

### How It Works

**You must star `github.gg` to unlock your Wrapped.**

```
User lands on /wrapped
    ↓
Check: Has user starred github.gg/github.gg?
    ↓
NO  → Show teaser + "Star to Unlock" CTA
YES → Generate full wrapped experience
```

### The Teaser (Non-Starred Users)

Show a blurred/locked preview with tantalizing stats:
- "You mass deleted **[LOCKED]** lines of code this year..."
- "Your commit messages peaked at **[LOCKED]** on Thursdays..."
- "Your developer personality is: **[LOCKED]** 🔒"

**CTA**: Big button → "⭐ Star github.gg to Unlock Your Wrapped"
- Opens GitHub star modal / redirects to repo
- On return, re-check star status via API
- Unlock animation when star is detected

### Why This Works

1. **Forced viral action**: Every wrapped = potential new star
2. **Social proof**: Star count becomes marketing metric
3. **Low friction**: Starring is free, one-click
4. **Reciprocity**: User feels they "earned" the wrapped
5. **Invite multiplier**: When users invite friends, friends must also star

### Technical Implementation

```typescript
// Check star status
GET /user/starred/lantos1618/github.gg
// Returns 204 if starred, 404 if not

// Webhook: Watch for new stars (optional)
// Can trigger "Your wrapped is ready!" email
```

---

## GTM Strategy

### Viral Mechanics
1. **Star-Gate**: Must star repo to access (see above)
2. **Invite Flow**: "See how your 2024 compares to @friend" - generates FOMO (friend must also star!)
3. **Share Cards**: Auto-generated social cards for Twitter/LinkedIn/Discord
4. **Leaderboards**: Optional public comparison with friends who opt-in
5. **Timing**: Launch late December / early January when Spotify Wrapped hype is fresh
6. **Profile Badges**: Embeddable README badges that link back (see Profile Embeds section) - PERMANENT viral loop

### Cost Model
- **BYOK (Bring Your Own Key)**: Users provide their OpenAI/Anthropic key for AI analysis
- **Free Tier**: Basic stats without AI insights
- **Pro Tier**: We cover AI costs + premium animations

---

## Core Features

### 1. Data Collection

Pull from GitHub API for the year:

```
- Total commits
- Total PRs opened/merged
- Total issues opened/closed
- Total code reviews
- Lines added/deleted
- Most active repositories (top 5)
- Languages used (breakdown %)
- Contribution streak (longest)
- Most productive day of week
- Most productive hour
- First commit of the year
- Last commit of the year
- Collaboration graph (who you worked with most)
- Stars received on repos
- New followers gained
```

### 2. AI-Powered Insights (BYOK)

Using the scorecard data + contribution stats, generate:

```
- "Your Coding Personality" (e.g., "The Night Owl Architect")
- "Your Biggest Win" - AI picks most impactful PR/commit
- "Your Growth Story" - how your patterns changed over the year
- "2025 Prediction" - fun prediction based on trends
- "Roast Mode" (opt-in) - playful roast of coding habits
```

### 3. Animated Story Experience (THE SECTIONS)

Instagram/TikTok story-style flow. Each section has a vibe. Swipe/tap to progress.

---

#### **SECTION 1: THE OPENING** 🎬
*Dramatic intro, sets the tone*

```
Slide 1.1: Black screen → "2024" fades in → shatters into code fragments
Slide 1.2: "You wrote code this year."
Slide 1.3: "Some of it was... interesting."
Slide 1.4: "Let's talk about it."
```

---

#### **SECTION 2: THE NUMBERS** 📊
*Classic stats, animated counters, satisfying*

```
Slide 2.1: "First, the raw numbers..."
Slide 2.2: Total commits (big animated counter ticking up)
         "{X} commits. That's {X/365} per day. {comparison}."
         - If high: "Touch grass? Never heard of her."
         - If low: "Quality over quantity. We respect that. (cope)"
Slide 2.3: Lines added/deleted with dramatic +/- visualization
         "You mass deleted {X} lines in {month}. Spring cleaning or covering your tracks?"
Slide 2.4: PRs opened vs merged ratio
         - If high merge rate: "Merge machine. Your reviewers fear you."
         - If low: "We don't talk about the PR graveyard."
```

---

#### **SECTION 3: THE UNHINGED SCHEDULE** 🌙
*When they actually code - expose their crimes*

```
Slide 3.1: "Let's talk about WHEN you code..."
Slide 3.2: Heatmap of commit times (animated grid filling in)
Slide 3.3: Peak hour reveal with dramatic zoom
         "Your coding peaks at {time} on {day}."
         - 2-5 AM: "Ah, a creature of the night. Your melatonin levels are in shambles."
         - 9-5: "A 9-to-5 coder? In THIS economy? Respect."
         - Weekends: "Weekends are for coding apparently. Your friends miss you."
         - Lunch: "Lunch break pusher. Your sandwich is getting cold."
Slide 3.4: Longest streak calendar visualization
         "{X} day streak. Did you blink?"
```

---

#### **SECTION 4: THE LANGUAGES** 💬
*What they actually wrote - judge them*

```
Slide 4.1: "Now let's see what you actually wrote..."
Slide 4.2: Animated pie chart of languages (segments fly in)
Slide 4.3: Top language reveal with personality
         - JavaScript: "JavaScript. Embrace the chaos."
         - TypeScript: "TypeScript. You value your sanity. Rare."
         - Python: "Python. Life's too short for curly braces."
         - Rust: "Rust. You enjoy suffering but in a sophisticated way."
         - Go: "Go. if err != nil { panic() }"
         - Java: "Java. The enterprise runs through your veins."
         - C/C++: "C/C++. You've seen things. Segfaults. Memory leaks. Pain."
         - PHP: "PHP. Brave of you to admit this publicly."
         - Ruby: "Ruby. 2015 called, they want their language back. (jk we love you)"
Slide 4.4: "Secret" language shame reveal
         "We won't talk about the {small_percentage}% of {embarrassing_lang}. Your secret is safe."
```

---

#### **SECTION 5: THE COMMIT MESSAGES** 💬
*Expose their git crimes*

```
Slide 5.1: "Your commit messages tell a story..."
Slide 5.2: Word cloud animation of common words
Slide 5.3: Most common message reveal
         "Your most used commit message: '{message}'"
         - "fix": "Just 'fix'. No context. No mercy."
         - "wip": "WIP commits pushed to main. Living dangerously."
         - "asdf/test/aaa": "We've all been there. We're not judging. (We are judging.)"
         - "initial commit" (multiple): "How many 'initial commits' does one person need?"
Slide 5.4: Longest commit message
         "Your longest commit message was {X} characters. It was: '{truncated}...'"
Slide 5.5: Message at worst hour
         "At 3:47 AM you wrote: '{unhinged_message}'"
```

---

#### **SECTION 6: THE COLLABORATORS** 👥
*Who they code with*

```
Slide 6.1: "You didn't code alone..."
Slide 6.2: Top collaborators carousel (avatars floating in)
Slide 6.3: "Your ride-or-die: @{top_collaborator}"
         "{X} PRs together. That's a mass commit-tment."
Slide 6.4: If mostly solo: 
         "You reviewed your own PRs {X} times. Self-love is important."
```

---

#### **SECTION 7: THE TRAUMA (AI-Powered)** 🔥
*BYOK section - AI roasts their year*

```
Slide 7.1: "Time to process what happened..."
Slide 7.2: "THE MASS DELETION EVENT"
         AI identifies their biggest code purge
         "In {month}, you mass deleted {X} lines from {repo}. What happened there?"
Slide 7.3: "THE MARATHON"
         Longest single-day commit spree
         "On {date}, you made {X} commits. {X} hours of pushing. Were you okay?"
Slide 7.4: "THE GHOST" (if applicable)
         "You abandoned {repo} in {month}. {X} days since last commit. RIP."
Slide 7.5: "THE REWRITE"
         If they rewrote something: "You mass deleted and re-added {similar_lines}. Refactor or regret?"
```

---

#### **SECTION 8: THE PERSONALITY REVEAL** 🎭
*AI generates their developer archetype*

```
Slide 8.1: Dramatic pause - "Based on everything..."
Slide 8.2: "Your 2024 developer personality is..."
Slide 8.3: BIG REVEAL with particle effects
         e.g., "THE MIDNIGHT ARCHAEOLOGIST"
         "You dig through ancient codebases at 2 AM, mass-delete legacy code, 
          and leave commit messages that future you won't understand."
Slide 8.4: Shareable card format of personality
```

**Personality Types (AI picks based on patterns):**
- The Midnight Archaeologist (late night + legacy code)
- The Documentation Evangelist (lots of .md files)
- The Yolo Deployer (Friday deploys + force pushes)
- The Perfectionist (many small commits)
- The Big Bang Theorist (few massive commits)
- The Social Butterfly (many collaborators)
- The Lone Wolf (solo commits only)
- The Polyglot (many languages)
- The Specialist (one language dominates)
- The Phoenix (many repo restarts)
- The Streak Demon (long streaks)
- The Weekend Warrior (weekend-heavy)
- The Corporate Soldier (9-5 only)
- The Chaos Agent (random patterns)

---

#### **SECTION 9: THE SCORECARD** 📋
*Integrate with existing github.gg scorecard*

```
Slide 9.1: "But how good was your code?"
Slide 9.2: Run scorecard on their top repo(s)
Slide 9.3: Grade reveal with effects
         - A: Confetti explosion, "You're cracked"
         - B: Sparkles, "Solid. Respectable."
         - C: Polite applause, "Room for growth (cope)"
         - D: Tumbleweed, "We've seen worse. (Have we?)"
         - F: Explosion, "Your code has character"
Slide 9.4: Quick breakdown of score factors
```

---

#### **SECTION 10: THE ROAST (Opt-in, AI-Powered)** 🔥
*User chooses to be roasted*

```
Slide 10.1: "Want the unfiltered truth?"
           [ROAST ME] [SKIP]
Slide 10.2: If yes → AI-generated personalized roast
           "You mass deleted 47,000 lines in March then mass added 46,500 lines in April. 
            That's not refactoring, that's a cry for help."
Slide 10.3: Multiple quick-fire roasts
           - On commit messages
           - On timing
           - On language choices
           - On abandoned repos
```

---

#### **SECTION 11: THE FUTURE (AI Prediction)** 🔮
*Fun prediction for next year*

```
Slide 11.1: "What does 2025 hold?"
Slide 11.2: AI prediction based on trends
           "Based on your trajectory, in 2025 you will:
            - Mass delete everything in February
            - Finally finish that side project (just kidding)
            - Peak at 3 AM instead of 2 AM (self-care)
            - Learn Rust (and immediately regret it)"
```

---

#### **SECTION 12: THE SHARE** 📤
*CTA to share and invite*

```
Slide 12.1: Summary card with key stats
Slide 12.2: "Challenge a friend"
           [INVITE @username]
Slide 12.3: Share buttons (Twitter, LinkedIn, Discord, Download)
Slide 12.4: "See you in 2025 👋"
```

### 4. Social Sharing

**Share Card Generation**:
- OG image with key stats for link previews
- Downloadable image/video for stories
- "Compare with @username" deep links
- Twitter-optimized cards
- LinkedIn post template

**Invite System**:
- Generate unique invite link
- "Challenge" friends to reveal their wrapped
- Group wrapped (team/org view)
- Anonymous comparison mode

---

## Technical Architecture

### Frontend Components

```
/src/components/wrapped/
├── WrappedStory.tsx          # Main story container with swipe/click navigation
├── WrappedSlide.tsx          # Base slide component with animations
├── slides/
│   ├── IntroSlide.tsx        # "Your 2024 in Code"
│   ├── CommitCounterSlide.tsx # Animated number counter
│   ├── LanguagePieSlide.tsx  # Animated pie chart
│   ├── StreakCalendarSlide.tsx # Contribution heatmap
│   ├── CollaboratorsSlide.tsx # Avatar carousel
│   ├── PersonalitySlide.tsx  # AI personality reveal
│   ├── ScorecardSlide.tsx    # Grade reveal with effects
│   ├── RoastSlide.tsx        # Optional roast content
│   ├── ShareSlide.tsx        # Share CTAs
│   └── InviteSlide.tsx       # Invite friends
├── animations/
│   ├── confetti.tsx          # Confetti effect
│   ├── counter.tsx           # Number tick animation
│   ├── reveal.tsx            # Dramatic reveal
│   └── transitions.tsx       # Slide transitions
├── WrappedShareCard.tsx      # Generated share image
├── WrappedInvite.tsx         # Invite flow UI
└── WrappedBYOK.tsx           # API key input for AI features
```

### API Routes

```
/src/app/api/wrapped/
├── generate/route.ts         # Generate wrapped data for user
├── share/route.ts            # Create shareable link/image
├── invite/route.ts           # Handle invites
├── compare/route.ts          # Compare two users' wraps
└── og/route.ts               # OG image generation
```

### Database Schema

```sql
-- User's wrapped data (cached)
CREATE TABLE github_wrapped (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  data JSONB NOT NULL,           -- All stats
  ai_insights JSONB,             -- AI-generated content
  personality_type TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, year)
);

-- Wrapped invites
CREATE TABLE wrapped_invites (
  id UUID PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  invitee_username TEXT,         -- Can be null for open invite
  invite_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  created_at TIMESTAMP,
  accepted_at TIMESTAMP
);

-- Wrapped comparisons
CREATE TABLE wrapped_comparisons (
  id UUID PRIMARY KEY,
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  comparison_data JSONB,
  created_at TIMESTAMP
);
```

### Data Flow

```
1. User clicks "Get My Wrapped"
   ↓
2. ⭐ STAR CHECK: GET /user/starred/lantos1618/github.gg
   ↓
   NOT STARRED → Show locked teaser, "Star to Unlock" CTA
   ↓ (starred)
3. Check cache (github_wrapped table)
   ↓ (miss)
4. Fetch GitHub stats via API
   - GET /users/{username}/events (paginated, full year)
   - GET /search/commits?author={username}
   - GET /users/{username}/repos
   - GET /users/{username} (profile for followers gained)
   ↓
5. Process & aggregate stats
   - Commits by hour/day/month
   - Language breakdown
   - Collaborator graph
   - Streak calculation
   - Commit message analysis
   ↓
6. If BYOK provided:
   - Send stats to AI for insights
   - Generate personality, roast, predictions
   - Identify "trauma" events (mass deletions, marathons)
   ↓
7. Run scorecard on top repos
   ↓
8. Cache results in DB
   ↓
9. Render animated story experience
```

### Star-Gate Implementation

```typescript
// In /api/wrapped/generate/route.ts

async function checkStarStatus(accessToken: string): Promise<boolean> {
  const response = await fetch(
    'https://api.github.com/user/starred/lantos1618/github.gg',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  return response.status === 204; // 204 = starred, 404 = not starred
}

// Usage in route
export async function POST(req: Request) {
  const { accessToken } = await getSession();
  
  const hasStarred = await checkStarStatus(accessToken);
  
  if (!hasStarred) {
    return Response.json({
      locked: true,
      teaser: generateTeaser(username), // Blurred/partial stats
      message: "Star github.gg to unlock your full Wrapped!",
      starUrl: "https://github.com/lantos1618/github.gg",
    }, { status: 403 });
  }
  
  // Continue with full wrapped generation...
}
```

---

## Animation Specifications

### Slide Transitions
- **Default**: Fade + slide up (300ms ease-out)
- **Number reveals**: Count up animation (1.5s)
- **Pie charts**: Segments animate in sequentially (2s total)
- **Confetti**: Canvas-based particle system (3s burst)

### Libraries to Use
- `framer-motion` - Core animations
- `canvas-confetti` - Celebration effects
- `react-countup` - Number animations
- `recharts` or custom SVG - Charts

### Performance Targets
- First slide render: < 500ms
- Slide transition: 60fps
- Total bundle size for wrapped: < 150KB gzipped

---

## BYOK Implementation

### Supported Providers
1. OpenAI (GPT-4)
2. Anthropic (Claude)
3. (Future: Gemini, local models)

### Key Storage
- Keys stored in localStorage (client-side only)
- Never sent to our backend
- AI calls made directly from client to provider
- Clear disclosure: "Your key is stored locally and never leaves your browser"

### Fallback
- No key provided → Basic stats only, no AI insights
- Invalid key → Graceful error, continue with basic stats

---

## URL Structure

```
/wrapped                       # Landing page
/wrapped/2024                  # User's own wrapped
/wrapped/2024/share            # Share page with OG image
/wrapped/invite/{code}         # Accept invite
/wrapped/compare/{userA}/{userB} # Comparison view
/wrapped/{username}/badge.svg  # Embeddable badge (SVG)
/wrapped/{username}/card.png   # Embeddable card (PNG)
```

---

## 🏷️ Profile Embeds (README Badges)

### The Viral Flywheel

Every GitHub profile with our badge = free permanent advertising.

**How it works:**
1. User generates their Wrapped
2. We give them embed code for their README
3. Badge displays on their profile
4. Badge links back to github.gg/wrapped
5. Visitors click → must star to see their own → repeat

### Badge Types

#### 1. **Mini Badge** (inline)
Small badge that fits in a row with other badges.

```markdown
[![My 2024 Wrapped](https://github.gg/wrapped/username/badge.svg)](https://github.gg/wrapped/username)
```

Renders as:
```
┌──────────────────────────────────┐
│ 🎁 2024 Wrapped: Midnight Owl    │
│    github.gg                     │
└──────────────────────────────────┘
```

Shows: Personality type + github.gg branding

---

#### 2. **Stats Card** (medium)
Similar to github-readme-stats, shows key metrics.

```markdown
[![2024 GitHub Wrapped](https://github.gg/wrapped/username/card.svg)](https://github.gg/wrapped/username)
```

Renders as:
```
┌─────────────────────────────────────────┐
│  🎁 username's 2024 Wrapped             │
│  ─────────────────────────────────────  │
│  📊 1,247 commits                       │
│  🔥 47 day streak                       │
│  💻 TypeScript specialist               │
│  🌙 Peak hours: 2 AM (are you ok?)      │
│  ─────────────────────────────────────  │
│  🎭 THE MIDNIGHT ARCHAEOLOGIST          │
│  ─────────────────────────────────────  │
│           ⭐ github.gg/wrapped          │
└─────────────────────────────────────────┘
```

---

#### 3. **Full Card** (large, for profile header)
Big visual card with personality + stats.

```markdown
[![2024 GitHub Wrapped](https://github.gg/wrapped/username/card-full.png)](https://github.gg/wrapped/username)
```

Includes:
- Personality type with custom art/icon
- Top 3 stats
- Mini heatmap
- Gradient background matching personality
- Bold github.gg branding

---

#### 4. **Animated Badge** (GIF - premium?)
Subtle animation to stand out.

```markdown
[![2024 Wrapped](https://github.gg/wrapped/username/badge.gif)](https://github.gg/wrapped/username)
```

- Sparkle effect
- Number counter tick
- Personality type typewriter effect

---

### Customization Options (via URL params)

```
/wrapped/{username}/card.svg?theme=dark
/wrapped/{username}/card.svg?theme=light
/wrapped/{username}/card.svg?theme=transparent
/wrapped/{username}/card.svg?hide=streak,commits
/wrapped/{username}/card.svg?show_roast=true
```

| Param | Options | Description |
|-------|---------|-------------|
| `theme` | dark, light, transparent, dracula, nord | Color scheme |
| `hide` | commits,streak,languages,personality | Hide specific stats |
| `show_roast` | true/false | Show mini-roast line |
| `locale` | en, es, zh, etc. | Language |

---

### Badge Generation Flow

```
1. User completes Wrapped
   ↓
2. Show "Add to your README" section
   ↓
3. Display copy-paste code for each badge type
   ↓
4. "Preview on GitHub" button (opens their profile edit)
   ↓
5. Track badge renders via URL (analytics)
```

### Technical Implementation

```
/src/app/api/wrapped/badge/
├── [username]/
│   ├── badge.svg/route.ts    # Mini badge
│   ├── card.svg/route.ts     # Stats card
│   ├── card.png/route.ts     # PNG version
│   └── card-full.png/route.ts # Full card
```

```typescript
// badge.svg/route.ts
export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get('theme') || 'dark';
  
  // Fetch cached wrapped data
  const wrapped = await getWrappedData(username);
  
  if (!wrapped) {
    // Return "Generate your Wrapped" placeholder badge
    return generatePlaceholderBadge();
  }
  
  // Generate SVG with user's stats
  const svg = generateBadgeSVG(wrapped, { theme });
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400', // Cache 24h
    },
  });
}
```

### Sample Badge SVG Template

```svg
<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  
  <rect width="400" height="120" rx="10" fill="url(#bg)"/>
  
  <text x="20" y="35" fill="#fff" font-size="16" font-weight="bold">
    🎁 {username}'s 2024 Wrapped
  </text>
  
  <text x="20" y="60" fill="#888" font-size="12">
    {commits} commits · {streak} day streak · {top_lang}
  </text>
  
  <text x="20" y="90" fill="#f0f" font-size="14" font-weight="bold">
    🎭 {personality_type}
  </text>
  
  <text x="380" y="110" fill="#666" font-size="10" text-anchor="end">
    github.gg
  </text>
</svg>
```

---

### Why Badges = Growth Engine

| Metric | Impact |
|--------|--------|
| **Impressions** | Every profile view = badge view |
| **Clicks** | Curiosity → "What's my wrapped?" |
| **Star-gate** | Clicks convert to stars |
| **Network effects** | Friends see badge → want their own |
| **Permanence** | Badges stay in READMEs forever |
| **SEO** | github.gg links from thousands of profiles |

### Badge Analytics

Track per badge:
- Renders (impressions)
- Clicks (CTR)
- Conversions (star-gate passes)

```sql
CREATE TABLE wrapped_badge_analytics (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  badge_type TEXT NOT NULL, -- mini, card, full
  rendered_at TIMESTAMP,
  clicked BOOLEAN DEFAULT FALSE,
  referrer TEXT,
  user_agent TEXT
);
```

---

## Privacy Considerations

1. **Opt-in only**: Users must explicitly generate their wrapped
2. **Public data only**: Only uses publicly available GitHub data
3. **Share control**: Users choose what to share
4. **Data retention**: Wrapped data cached for 30 days, then regeneratable
5. **BYOK privacy**: API keys never touch our servers

---

## MVP Scope (v1)

### Must Have
- [ ] Star-gate (check star status before unlock)
- [ ] Basic stats collection (commits, PRs, languages)
- [ ] 5-6 core animated slides
- [ ] Share card generation (static image)
- [ ] BYOK for AI personality
- [ ] Basic invite link
- [ ] **Profile badges** (mini + card) - critical viral mechanic

### Nice to Have (v1.1)
- [ ] Video export
- [ ] Roast mode
- [ ] Team/org wrapped
- [ ] Comparison view
- [ ] Leaderboards
- [ ] Animated GIF badges
- [ ] Badge customization (themes)

### Future (v2)
- [ ] Historical comparison (2023 vs 2024)
- [ ] Integration with existing scorecard
- [ ] Full-size embeddable cards
- [ ] API for third-party embedding
- [ ] Badge analytics dashboard

---

## Success Metrics

1. **Viral coefficient**: Invites sent per wrapped generated
2. **Share rate**: % of users who share at least one card
3. **Conversion**: Wrapped users → Pro subscribers
4. **Retention**: Users who return for 2025 wrapped

---

## Timeline Estimate

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Design | 3 days | Figma mockups, animation specs |
| Core Stats | 3 days | GitHub data fetching, aggregation |
| Animations | 5 days | All slide components, transitions |
| AI Integration | 2 days | BYOK flow, prompt engineering |
| Sharing | 2 days | OG images, invite system |
| Polish | 2 days | Performance, mobile, edge cases |
| **Total** | **~17 days** | |

---

## Open Questions

1. **Timing**: Launch before or after New Year?
2. **Pricing**: Should wrapped be Pro-only or freemium with AI as upsell?
3. **Historical**: Support years before 2024?
4. **Private repos**: Require GitHub App installation for private repo stats?
5. **Rate limits**: GitHub API limits for heavy users - cache aggressively?

---

## Appendix: Sample AI Prompts

### Personality Generator
```
Based on this developer's 2024 GitHub activity:
- {commits} commits across {repos} repositories
- Primary languages: {languages}
- Most active at {peak_hour} on {peak_day}
- Longest streak: {streak} days
- Top collaborators: {collaborators}

Generate a fun, shareable "developer personality type" (2-3 words, like "The Midnight Architect" or "The Documentation Evangelist"). Include a brief, witty 1-sentence description.
```

### Roast Generator
```
Roast this developer's 2024 GitHub habits in a playful, non-mean way:
- They mass-deleted {lines_deleted} lines in {month}
- Their commit messages are mostly "{common_message}"
- They only push on {day} at {hour}
- {other_quirky_stats}

Keep it light and funny. Max 2 sentences.
```
