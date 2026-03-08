# github.gg Route Map

## Site Architecture Tree

```
github.gg
├── / ................................. Homepage (landing + repo search)
│
├── /users ........................... Developer Profiles (browsable list)
├── /repos ........................... Analyzed Repositories (browsable list)
├── /developers ...................... Developer Docs (CLI, REST API, MCP)
├── /arena ........................... Dev Rank (ELO leaderboard + battles)
│   ├── [tab: leaderboard] ........... Search & rank table
│   ├── [tab: battle] ................ Start coding battle
│   └── [tab: history] ............... Past battle results
│
├── /hire ............................ Hiring Tool (landing)
│   ├── /hire/match .................. AI Job Matching
│   ├── /hire/search ................. Search All Candidates
│   └── /hire/:username .............. Individual Developer Assessment
│
├── /wrapped ......................... GitHub Wrapped (year in review)
│   └── /wrapped/:year/:username ..... Individual Wrapped Story
│
├── /pricing ......................... Plans & Feature Comparison
├── /settings ........................ User Settings (auth required)
├── /automations ..................... PR Review Automation (auth required)
├── /admin ........................... Admin Dashboard (admin only)
│
├── /install ......................... GitHub App Installation
│   └── /install/callback ............ OAuth Callback
├── /cli ............................. CLI Setup Guide
├── /intel ........................... Repository Intelligence
├── /api-docs ........................ REST API Documentation
│
├── /:user ........................... User Profile Page
│   └── /:user/:repo ................ Repository Analysis
│       ├── [default] ................ File Browser + Code Viewer
│       ├── /scorecard ............... Code Quality Grades (A-F)
│       ├── /ai-slop ................. AI Code Detection
│       ├── /diagram ................. Architecture Diagrams
│       ├── /pulls ................... Pull Request List
│       │   └── /pulls/:id ........... PR Detail View
│       ├── /issues .................. Issue List
│       │   └── /issues/:id .......... Issue Detail View
│       └── [coming soon] ............ refactor, dependencies, architecture,
│                                      components, data-flow, automations
│
├── /wiki/:owner/:repo .............. Wiki Table of Contents
│   ├── /wiki/:owner/:repo/new ...... Create Wiki Page
│   └── /wiki/:owner/:repo/:slug .... View Wiki Page
│       └── /wiki/:owner/:repo/:slug/edit  Edit Wiki Page
│
└── /404 ............................. Not Found Page
```

## API Endpoints

```
/api
├── /auth
│   ├── /[...better-auth] ........... Better Auth handler (GitHub OAuth)
│   ├── /debug ....................... Auth debug endpoint
│   ├── /link-installation ........... Link GitHub App installation
│   ├── /sign-out-cleanup ............ Session cleanup on sign-out
│   └── /test-session ................ Dev-only test session creator
│
├── /trpc/[trpc] ..................... tRPC router (all procedures)
│
├── /v1
│   ├── /profiles/:username .......... GET developer profile
│   ├── /profiles/search ............. GET search profiles
│   ├── /scorecards/:owner/:repo ..... GET repo scorecard
│   ├── /arena/leaderboard ........... GET arena leaderboard
│   └── /arena/rankings/:username .... GET user arena ranking
│
├── /profile/generate ................ POST generate developer profile (SSE)
├── /arena/battle .................... POST start arena battle
├── /feature-request ................. POST submit feature request
├── /admin/export-developer-profiles . GET export profiles (admin)
│
├── /webhooks
│   ├── /github ...................... GitHub webhook (push, PR, install)
│   └── /stripe ...................... Stripe webhook (subscriptions)
│
└── /wrapped/:year/:username/badge.svg  GET SVG badge
```

## SEO / Sitemaps

```
/sitemap.xml ....................... Main sitemap index
/pages-sitemap.xml ................. Static pages
/profiles-sitemap.xml .............. Developer profiles
/repos-sitemap.xml ................. Repositories
/wiki-sitemap.xml .................. Wiki pages
/llms.txt .......................... AI agent description
/llms-full.txt ..................... Extended AI agent docs
```

## Navigation Structure

### Primary Navbar (all pages)
| Label      | Path         | Notes              |
|------------|--------------|---------------------|
| GG (logo)  | /            | Home                |
| Profiles   | /users       | Developer list      |
| Repos      | /repos       | Repository list     |
| Dev Rank   | /arena       | Leaderboard         |
| Wrapped    | /wrapped     | Year in review      |
| Hire       | /hire        | Recruiter tool      |
| Developers | /developers  | CLI/API/MCP docs    |

### User Menu (authenticated)
| Label       | Path          |
|-------------|---------------|
| Automations | /automations  |
| Settings    | /settings     |
| Sign Out    | (action)      |

### Footer Links
| Label      | Path         |
|------------|--------------|
| Developers | /developers  |
| Pricing    | /pricing     |
| GitHub     | (external)   |
| Twitter    | (external)   |

## Settings Page Sections

```
/settings
├── Profile Customization (Pro only)
│   ├── Primary Color
│   ├── Text Color
│   ├── Background Color
│   ├── Sparkle Emoji
│   └── Enable Sparkle Effects
│
├── Your Plan
│   └── Manage Billing (Stripe portal)
│
├── Bring Your Own Key (BYOK)
│   ├── API Key Input (Google Gemini)
│   ├── Save Key
│   └── Delete Key
│
├── API Keys Management
│   ├── Create New Key
│   ├── List Keys (name, prefix, created, last used)
│   ├── Copy Key
│   └── Delete Key
│
├── Usage Statistics
│   ├── Total Tokens (this month)
│   ├── BYOK Tokens
│   ├── Managed Tokens
│   └── Recent Usage Breakdown
│
└── PR Review Automation
    ├── GitHub App Installation Status
    ├── Enable PR Reviews (toggle)
    └── Auto-update Comments (toggle)
```

## Auth & Middleware

- **Auth Provider:** Better Auth v1.3.27 with GitHub OAuth
- **Session:** HMAC-SHA256 signed cookies (`better-auth.session_token`)
- **Protected Routes:** /settings, /automations, /admin (redirect to sign-in)
- **ISR Caching:** Profile pages (5 min), Wiki pages (1 hr)
- **Force Dynamic:** Admin dashboard
