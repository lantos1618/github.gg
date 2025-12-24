<div align="center">

# 🚀 github.gg

**AI-Powered GitHub Analysis, Developer Arena & GitHub Wrapped**

[Live Demo](https://github.gg) • [Documentation](https://github.gg/docs) • [Report Bug](https://github.com/lantos1618/github.gg/issues) • [Request Feature](https://github.com/lantos1618/github.gg/issues)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

</div>

---

## 🎯 What is github.gg?

**github.gg** is an open-source platform that transforms how developers analyze and understand GitHub repositories. Using AI-powered analysis, it provides deep insights into code quality, repository health, and developer contributions.

### ✨ Key Features

#### 🎁 **GitHub Wrapped** — NEW!
Your year in code, Spotify Wrapped style. A viral, shareable year-in-review experience for developers.

- **Animated Story Experience**: Instagram/TikTok-style slides with auto-advancing playback
- **Real-time Generation**: tRPC subscriptions with SSE for live progress updates
- **Contribution Calendar**: Beautiful heatmap visualization of your commit activity
- **AI Personality Insights**: Get your "Developer Personality" (e.g., "The Midnight Archaeologist")
- **Gift to Friends**: Generate wrapped for any GitHub user and send email notifications
- **Profile Badges**: Embeddable SVG/PNG badges for your GitHub README
- **Star-Gate**: Star the repo to unlock your Wrapped (viral growth mechanic)

**Slides include**: Intro → Commits & PRs → Languages → Coding Schedule → Contribution Calendar → Highlights → AI Personality → Share

#### 🤖 **AI-Powered Analysis**
- **Repository Scorecards**: Comprehensive code quality metrics with AI-generated insights
- **PR Code Reviews**: Automated code review with security, performance, and maintainability analysis
- **Issue Triage**: Intelligent issue classification with "slop ranking" and priority suggestions
- **Commit Analysis**: Deep dive into commit quality and best practices

#### 📊 **Developer Tools**
- **Interactive Diagrams**: Visualize repository structure, dependencies, and file relationships
- **Score History**: Track repository and developer metrics over time
- **GitHub App Integration**: Automated PR reviews and issue analysis via webhooks

#### 📚 **Wiki System**
- **AI-Generated Wikis**: Automatically generate documentation for any repository
- **Collaborative Editing**: Milkdown-based markdown editor with live preview
- **Version Control**: Track wiki page history and changes

#### 🏆 **Arena & Dev Rank**
- **ELO Rankings**: Competitive developer rankings based on GitHub activity
- **Code Duels**: Challenge other developers and compare skills
- **Leaderboards**: See how you stack up against other developers

#### 🔐 **Enterprise Ready**
- **Unified Authentication**: Single `better-auth` OAuth with GitHub provider
- **GitHub App Integration**: Enhanced permissions for private repos and webhooks
- **Installation Linking**: Seamlessly connect OAuth accounts with GitHub App installations
- **Bring Your Own API Key (BYOK)**: Use your own AI API keys
- **Stripe Payment Integration**: Pro subscriptions for advanced features
- **PostgreSQL + Drizzle ORM**: Type-safe database operations

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- [Docker](https://www.docker.com/) (for local database)
- GitHub OAuth App credentials

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/lantos1618/github.gg.git
cd github.gg

# Run automated setup
bun run setup
```

This will:
- ✅ Install all dependencies
- ✅ Create `.env.local` configuration file
- ✅ Start PostgreSQL database with Docker
- ✅ Run database migrations

### Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: `github.gg-dev`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret**
5. Update your `.env.local` file:

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

### Start Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📦 Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 15+](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Runtime** | [Bun](https://bun.sh/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| **Authentication** | [Better Auth](https://www.better-auth.com/) (OAuth) + GitHub App |
| **API** | [tRPC](https://trpc.io/) with SSE Subscriptions |
| **AI** | [Google Gemini](https://ai.google.dev/) via Vercel AI SDK |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| **GitHub** | [Octokit](https://octokit.github.io/rest.js/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Payments** | [Stripe](https://stripe.com/) |
| **Email** | [Resend](https://resend.com/) + React Email |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App Router                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Server     │  │   Client     │  │   API        │  │
│  │  Components  │  │  Components  │  │   Routes     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                           │                             │
│                    ┌──────┴───────┐                     │
│                    │     tRPC      │                     │
│                    │ + SSE Streams │                     │
│                    └──────┬───────┘                     │
│                           │                             │
│         ┌─────────────────┴─────────────────┐           │
│         │                                   │           │
│  ┌──────┴───────┐                  ┌───────┴────────┐  │
│  │   Database   │                  │   External     │  │
│  │  (Drizzle)   │                  │   Services     │  │
│  │              │                  │                │  │
│  │ • PostgreSQL │                  │ • GitHub API   │  │
│  │ • Migrations │                  │ • Gemini AI    │  │
│  │ • Caching    │                  │ • Stripe       │  │
│  │              │                  │ • Resend Email │  │
│  └──────────────┘                  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Development

### Project Structure

```
github.gg/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── wrapped/         # GitHub Wrapped feature
│   │   ├── arena/           # Developer Arena & Leaderboards
│   │   ├── wiki/            # AI-generated wikis
│   │   └── api/             # API routes (tRPC, webhooks)
│   ├── components/
│   │   ├── wrapped/         # Wrapped slides & animations
│   │   ├── arena/           # Arena UI components
│   │   ├── wiki/            # Wiki editor & viewer
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── ai/              # AI analysis modules
│   │   ├── auth/            # Unified auth system (better-auth)
│   │   ├── github/          # GitHub API & App integration
│   │   ├── trpc/            # tRPC routes and procedures
│   │   └── email/           # Email templates (React Email)
│   └── db/                  # Database schema (Drizzle)
├── tests/                   # Test files
├── docs/                    # Documentation
└── drizzle/                 # Database migrations
```

### Available Scripts

```bash
bun dev                  # Start development server (Turbopack)
bun run build           # Build for production
bun run db:start        # Start PostgreSQL with Docker
bun run db:studio       # Open Drizzle Studio
bun run db:push         # Push schema changes
bun test                # Run tests
```

### Environment Variables

See [`.env.example`](./.env.example) for all configuration options. Key variables:

```env
# Required
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...

# AI Features
GOOGLE_GENERATIVE_AI_API_KEY=...

# Payments (optional)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email (optional)
RESEND_API_KEY=...
```

---

## 🤝 Contributing

We love contributions! Whether it's bug fixes, feature additions, or documentation improvements.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Make your changes**
   - Write tests for new features
   - Follow the existing code style
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m 'feat: Add some amazing feature'
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/AmazingFeature
   ```
6. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow the existing TypeScript and React patterns
- **Testing**: Write tests for new features (`bun test`)
- **Type Safety**: Maintain 100% TypeScript coverage
- **Documentation**: Update docs for API changes
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)

### Areas We Need Help

- 🎨 UI/UX improvements
- 📝 Documentation and tutorials
- 🐛 Bug fixes and testing
- 🌍 Internationalization (i18n)
- ⚡ Performance optimizations
- 🔌 New integrations and features

---

## 📚 Documentation

- **[Setup Guide](./docs/LOCAL_DEVELOPMENT.md)**: Detailed local development setup
- **[Activation Guide](./docs/ACTIVATION_GUIDE.md)**: Setting up the GitHub App
- **[Component Patterns](./docs/COMPONENT_PATTERNS.md)**: React component conventions
- **[GitHub Wrapped Spec](./docs/GITHUB_WRAPPED_SPEC.md)**: Wrapped feature specification

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lantos1618/github.gg)

1. Click the button above
2. Set up environment variables in Vercel dashboard
3. Connect your PostgreSQL database (Vercel Postgres, Supabase, etc.)
4. Deploy!

### Manual Deployment

```bash
# Build the application
bun run build

# Start production server
bun start
```

**Important**: Run database migrations before deploying:
```bash
bun run db:push
```

---

## 🗺️ Roadmap

### Completed
- [x] Repository analysis with AI
- [x] PR code reviews
- [x] Issue triage and analysis
- [x] Commit analysis
- [x] Interactive diagrams
- [x] Score history tracking
- [x] GitHub App integration
- [x] Webhook support for automated reviews
- [x] GitHub Wrapped with animated slides
- [x] AI personality insights
- [x] Gift wrapped to friends
- [x] Arena leaderboards
- [x] Wiki system

### In Progress
- [ ] Profile badges (SVG/PNG embeds)
- [ ] Code battles and tournaments
- [ ] Team analytics

### Future
- [ ] Historical wrapped comparison (year-over-year)
- [ ] VS Code extension
- [ ] Browser extension
- [ ] API for third-party integrations
- [ ] Self-hosted enterprise version

See the [open issues](https://github.com/lantos1618/github.gg/issues) for a full list of proposed features and known issues.

---

## 📊 Stats

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/lantos1618/github.gg?style=social)
![GitHub forks](https://img.shields.io/github/forks/lantos1618/github.gg?style=social)
![GitHub issues](https://img.shields.io/github/issues/lantos1618/github.gg)
![GitHub pull requests](https://img.shields.io/github/issues-pr/lantos1618/github.gg)

</div>

---

## 🙏 Acknowledgments

- Thanks to all [contributors](https://github.com/lantos1618/github.gg/graphs/contributors) who have helped build github.gg
- Built with amazing open-source projects: Next.js, Bun, Drizzle, tRPC, and more
- Inspired by the GitHub community and the need for better code analysis tools

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

## 🔗 Links

- **Website**: [https://github.gg](https://github.gg)
- **GitHub**: [https://github.com/lantos1618/github.gg](https://github.com/lantos1618/github.gg)
- **Issues**: [https://github.com/lantos1618/github.gg/issues](https://github.com/lantos1618/github.gg/issues)
- **Discussions**: [https://github.com/lantos1618/github.gg/discussions](https://github.com/lantos1618/github.gg/discussions)

---

<div align="center">

**⭐ Star us on GitHub if you find this project useful! ⭐**

Made with ❤️ by the github.gg community

> **Note:** github.gg is not affiliated with, endorsed by, or sponsored by GitHub, Inc. GitHub is a registered trademark of GitHub, Inc.

</div>
