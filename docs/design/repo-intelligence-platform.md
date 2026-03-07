# Repository Intelligence Platform

## Overview

A comprehensive analytics platform for understanding GitHub repository health, engagement quality, and user authenticity. Enables fraud detection, community analysis, and GTM (go-to-market) user discovery.

---

## Core Feature Areas

### 1. Star Intelligence

#### Star Quality Analysis
- **Authenticity Score** (0-100): Composite score for star legitimacy
- **Growth Pattern Classification**:
  - Organic (gradual, consistent growth)
  - Viral (sudden spike with sustained interest)
  - Suspicious (burst followed by plateau)
  - Purchased (coordinated bot activity)

#### Star Forensics
| Signal | Description | Weight |
|--------|-------------|--------|
| Account Age | Stars from accounts < 30 days old | High |
| Profile Completeness | No bio, no repos, no followers | High |
| Activity Diversity | Only starring, never contributing | Medium |
| Timing Clusters | Multiple stars within seconds | Critical |
| Geographic Anomalies | Unusual country clustering | Medium |
| Coordination Patterns | Same accounts starring same repos | Critical |

#### Visualizations
- Star timeline with anomaly highlighting
- Geographic heatmap of stargazers
- Account age distribution chart
- "Star quality" over time trend

---

### 2. Bot & Fake Account Detection

#### Detection Signals

**High Confidence Bot Indicators:**
- Default avatar + no bio + no repos
- Username patterns (random strings, sequential numbers)
- Created and starred within 24 hours
- Only activity is starring (no issues, PRs, comments)
- Follows known bot networks (graph analysis)

**Medium Confidence Indicators:**
- Low follower/following ratio with high starring activity
- Stars repos with no apparent connection (random topics)
- Account dormant except for starring bursts
- Profile copied from another user

#### Bot Network Detection
- Graph analysis of star relationships
- Identify clusters of accounts that star the same repos
- Temporal correlation (accounts created/active at same times)
- Shared behavioral fingerprints

#### Output
```typescript
interface AccountAnalysis {
  username: string;
  botProbability: number; // 0-1
  signals: {
    signal: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string;
  }[];
  networkCluster?: string; // ID of suspected bot network
  recommendation: 'legitimate' | 'suspicious' | 'likely_bot' | 'confirmed_bot';
}
```

---

### 3. Engagement Quality Metrics

#### Community Health Score
- Issue response time (median, p90)
- PR review turnaround
- Maintainer activity levels
- Contributor retention rate
- Discussion quality (comment length, resolution rate)

#### Engagement Authenticity
- Real comments vs bot/spam comments
- Meaningful PRs vs drive-by typo fixes
- Issue quality (detailed reports vs "doesn't work")
- Repeat contributor percentage

#### Influence Mapping
- Who are the power users in this repo's community?
- Which contributors have the most impact?
- Cross-pollination with other projects

---

### 4. Competitive Intelligence

#### Repo Comparison
- Compare star growth trajectories
- Contributor overlap analysis
- Feature parity tracking (via README/docs analysis)
- Community sentiment comparison

#### Market Positioning
- Where does this repo sit in its ecosystem?
- Who are the alternatives?
- What's the migration pattern? (users moving between tools)

---

### 5. GTM User Discovery

#### High-Value User Identification

**Developer Segments:**
| Segment | Criteria | GTM Value |
|---------|----------|-----------|
| Power Users | Multiple meaningful contributions, active in issues | Very High |
| Enthusiasts | Stars + watches + comments, no code | High |
| Evaluators | Recent star, visited docs, corporate email domain | High |
| Influencers | High follower count, active on related repos | Very High |
| Decision Makers | Manager/lead in bio, corporate domain | Critical |

#### Filtering & Export
- Filter by: location, company, role, activity level, account age
- Enrichment: LinkedIn, Twitter, email (where public)
- Export formats: CSV, JSON, CRM-ready (Salesforce, HubSpot)

#### Outreach Prioritization
- Engagement score (how likely to respond)
- Influence score (reach if they advocate)
- Fit score (matches ideal customer profile)
- Timing score (recently active, good time to reach out)

---

### 6. Fraud Detection Dashboard

#### Real-time Alerts
- Sudden star spike detected
- Bot network activity on your repo
- Competitor potentially buying stars
- Coordinated negative activity (issue spam)

#### Investigation Tools
- Timeline explorer with filters
- Account deep-dive panel
- Network graph visualization
- Export evidence for reporting

#### Reporting
- Generate fraud report for GitHub
- Document evidence chain
- Track remediation (stars removed after report)

---

## Data Architecture

### Data Sources

```
GitHub API (REST + GraphQL)
├── Repository metadata
├── Stargazers (with timestamps via events API)
├── Contributors & commits
├── Issues & PRs
├── Comments & reactions
└── User profiles

Derived Data
├── Star velocity calculations
├── Bot probability scores
├── Network graphs
├── Engagement metrics
└── GTM user scores
```

### Storage Strategy

| Data Type | Storage | Refresh Rate |
|-----------|---------|--------------|
| Star events | TimescaleDB / ClickHouse | Real-time via webhooks |
| User profiles | PostgreSQL + cache | Daily refresh |
| Bot scores | PostgreSQL | Computed on-demand, cached 24h |
| Network graphs | Neo4j / PostgreSQL | Weekly rebuild |
| GTM lists | PostgreSQL | On-demand generation |

### Rate Limiting Considerations
- GitHub API: 5000 req/hour authenticated
- Need webhook integration for real-time star tracking
- Batch processing for historical analysis
- Consider GitHub Archive for historical data

---

## UI/UX Concepts

### Repository Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  vercel/next.js                                    ⭐ 124,532│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Star Quality Score: 94/100  [████████████████████░░] 🟢    │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Real Stars  │ │ Suspicious  │ │ Likely Bots │            │
│  │   121,847   │ │    2,134    │ │     551     │            │
│  │    97.8%    │ │    1.7%     │ │    0.4%     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│  [Star Timeline Chart with anomaly highlighting]            │
│                                                             │
│  Recent Activity:                                           │
│  ⚠️  142 stars from new accounts in last 24h (unusual)      │
│  ✅  Normal engagement patterns                             │
│  ✅  No bot network activity detected                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### GTM Discovery Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Find Users                                     [Export CSV]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filters:                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Activity: All│ │ Role: Dev    │ │ Company: Any │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  Results: 2,341 users                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 👤 @sarah-chen  Sarah Chen                    Score: 94 ││
│  │    Staff Engineer @ Stripe                              ││
│  │    ⭐ Starred 3d ago  💬 2 comments  🔀 1 PR            ││
│  │    📧 sarah@... (enriched)                    [Contact] ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 👤 @mike-dev  Mike Johnson                    Score: 87 ││
│  │    ...                                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Monetization Tiers

### Free
- Basic star count & growth chart
- Top 10 contributors list
- Simple engagement metrics

### Pro ($20/mo) - Current tier
- Star quality score
- Basic bot detection (account age, activity)
- GTM export (100 users/month)
- 30-day historical analysis

### Business ($99/mo)
- Full fraud detection suite
- Network graph analysis
- Unlimited GTM exports
- Real-time alerts
- API access
- 1-year historical analysis

### Enterprise (Custom)
- White-label reports
- Bulk repo analysis
- Custom integrations
- Dedicated support
- Compliance features (GDPR exports)

---

## Implementation Phases

### Phase 1: Star Quality Foundation
- [ ] Star timeline with growth classification
- [ ] Basic account age/activity analysis
- [ ] Suspicious pattern flagging
- [ ] Simple star quality score

### Phase 2: Bot Detection
- [ ] Multi-signal bot probability scoring
- [ ] Account deep-dive panel
- [ ] Bulk account analysis
- [ ] Evidence export

### Phase 3: Network Analysis
- [ ] Build star relationship graph
- [ ] Cluster detection algorithm
- [ ] Bot network visualization
- [ ] Coordinated activity alerts

### Phase 4: GTM Features
- [ ] User filtering & search
- [ ] Profile enrichment pipeline
- [ ] Export functionality
- [ ] Outreach scoring

### Phase 5: Real-time & Alerts
- [ ] Webhook integration for live updates
- [ ] Anomaly detection alerts
- [ ] Email/Slack notifications
- [ ] Competitive monitoring

---

## Technical Considerations

### Bot Detection Algorithm (Conceptual)

```typescript
function calculateBotProbability(user: GitHubUser): BotAnalysis {
  const signals: Signal[] = [];
  let score = 0;

  // Account age
  const ageInDays = daysSince(user.createdAt);
  if (ageInDays < 7) {
    signals.push({ type: 'new_account', severity: 'high', weight: 25 });
    score += 25;
  } else if (ageInDays < 30) {
    signals.push({ type: 'young_account', severity: 'medium', weight: 10 });
    score += 10;
  }

  // Profile completeness
  const profileScore = calculateProfileCompleteness(user);
  if (profileScore < 0.2) {
    signals.push({ type: 'empty_profile', severity: 'high', weight: 20 });
    score += 20;
  }

  // Activity diversity
  if (user.publicRepos === 0 && user.contributions === 0) {
    signals.push({ type: 'no_contributions', severity: 'medium', weight: 15 });
    score += 15;
  }

  // Starring patterns
  const starPattern = analyzeStarringPattern(user);
  if (starPattern.onlyStars && starPattern.starCount > 50) {
    signals.push({ type: 'star_only_activity', severity: 'high', weight: 20 });
    score += 20;
  }

  // Network analysis (if available)
  const networkScore = await checkBotNetworkMembership(user);
  if (networkScore > 0.8) {
    signals.push({ type: 'bot_network_member', severity: 'critical', weight: 40 });
    score += 40;
  }

  return {
    probability: Math.min(score / 100, 1),
    signals,
    recommendation: score > 70 ? 'likely_bot' : score > 40 ? 'suspicious' : 'legitimate'
  };
}
```

### Privacy & Compliance
- Only analyze public data
- GDPR: Allow users to request exclusion from GTM lists
- Rate limit enrichment to avoid appearing as scraper
- Clear data retention policies
- No storing of non-public information

### GitHub ToS Considerations
- Review GitHub API Terms of Service
- Ensure bot detection doesn't violate any rules
- Consider GitHub's own star manipulation detection
- May need approval for certain data aggregation

---

## Open Questions

1. **Enrichment sources**: What third-party data sources for email/LinkedIn enrichment? (Clearbit, Hunter.io, Apollo, etc.)

2. **Historical data**: Use GitHub Archive for pre-API historical analysis? Storage cost vs value.

3. **Real-time vs batch**: How important is real-time star tracking? Webhook complexity vs polling.

4. **Network graph storage**: Neo4j vs PostgreSQL with graph extensions vs in-memory for analysis?

5. **Competitive features**: Should we analyze competitor repos? Legal/ethical considerations.

6. **User consent for GTM**: Opt-out mechanism for users who don't want to be contacted?

---

## Success Metrics

- Detection accuracy (false positive/negative rates for bot detection)
- GTM conversion rate (users contacted → response rate)
- User engagement with dashboard
- Fraud reports generated → stars actually removed
- Revenue from Business/Enterprise tiers
