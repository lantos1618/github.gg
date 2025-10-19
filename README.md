<div align="center">

# 🚀 gh.gg

**AI-Powered GitHub Repository Analysis & Developer Arena**

[Live Demo](https://github.gg) • [Documentation](https://github.gg/docs) • [Report Bug](https://github.com/lantos1618/github.gg/issues) • [Request Feature](https://github.com/lantos1618/github.gg/issues)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

</div>

---

## 🎯 What is gh.gg?

**gh.gg** is an open-source platform that transforms how developers analyze and understand GitHub repositories. Using AI-powered analysis, it provides deep insights into code quality, repository health, and developer contributions.

### ✨ Key Features

#### 🤖 **AI-Powered Analysis**
- **Repository Scorecards**: Comprehensive code quality metrics with AI-generated insights
- **PR Code Reviews**: Automated code review with security, performance, and maintainability analysis
- **Issue Triage**: Intelligent issue classification with "slop ranking" and priority suggestions
- **Commit Analysis**: Deep dive into commit quality and best practices

#### 📊 **Developer Tools**
- **Interactive Diagrams**: Visualize repository structure, dependencies, and file relationships
- **Score History**: Track repository and developer metrics over time
- **GitHub App Integration**: Automated PR reviews and issue analysis via webhooks

#### 🏟️ **Dev Arena** (Coming Soon)
- **ELO Rankings**: Competitive developer rankings based on GitHub activity
- **Code Battles**: Challenge other developers and showcase your skills
- **Tournaments**: Participate in coding competitions
- **Achievements**: Unlock badges and track your progress

#### 🔐 **Enterprise Ready**
- **Unified Authentication System**: Single `better-auth` OAuth with GitHub provider
- **GitHub App Integration**: Enhanced permissions for private repos and webhooks
- **Installation Linking**: Seamlessly connect OAuth accounts with GitHub App installations
- Bring Your Own API Key (BYOK) support
- Stripe payment integration
- PostgreSQL database with Drizzle ORM
- Type-safe tRPC API

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
   - **Application name**: `gh.gg-dev`
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
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Runtime** | [Bun](https://bun.sh/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| **Authentication** | [Better Auth](https://www.better-auth.com/) (OAuth) + GitHub App |
| **API** | [tRPC](https://trpc.io/) |
| **AI** | [Google Gemini](https://ai.google.dev/) via Vercel AI SDK |
| **GitHub** | [Octokit](https://octokit.github.io/rest.js/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Payments** | [Stripe](https://stripe.com/) |
| **Email** | [Resend](https://resend.com/) |
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
│                    │   API Layer   │                     │
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
│  └──────────────┘                  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Development

### Project Structure

```
github.gg/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/
│   │   ├── ai/          # AI analysis modules
│   │   ├── auth/        # Unified auth system (better-auth)
│   │   ├── github/      # GitHub API & App integration
│   │   └── trpc/        # tRPC routes and procedures
│   ├── db/              # Database schema and migrations
│   └── styles/          # Global styles
├── tests/               # Test files
├── docs/                # Documentation
└── drizzle/            # Database migrations
```

### Available Scripts

```bash
# Development
bun dev                  # Start development server
bun build               # Build for production
bun start               # Start production server

# Database
bun run db:start        # Start PostgreSQL with Docker
bun run db:stop         # Stop PostgreSQL
bun run db:reset        # Reset database (⚠️ destructive)
bun run db:studio       # Open Drizzle Studio
bun run db:generate     # Generate new migration
bun run db:push         # Apply migrations

# Testing
bun test                # Run all tests
bun test:watch          # Run tests in watch mode

# Code Quality
bun run lint            # Run ESLint
bun run typecheck       # Run TypeScript type checking
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://github_gg_user:github_gg_password@localhost:5432/github_gg

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: Enhanced Features
GITHUB_PUBLIC_API_KEY=ghp_your_github_token        # Better rate limits
GEMINI_API_KEY=your_gemini_api_key                 # AI analysis

# Optional: Payment Features
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# Optional: Email
RESEND_API_KEY=re_your_resend_api_key
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
- **[Testing Guide](./docs/TESTING_PR_REVIEWS.md)**: How to test PR review features
- **[Activation Guide](./docs/ACTIVATION_GUIDE.md)**: Setting up the GitHub App
- **[API Documentation](https://github.gg/docs/api)**: tRPC API reference

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

- [x] Repository analysis with AI
- [x] PR code reviews
- [x] Issue triage and analysis
- [x] Commit analysis
- [x] Interactive diagrams
- [x] Score history tracking
- [x] GitHub App integration
- [x] Webhook support for automated reviews
- [ ] Dev Arena ELO rankings
- [ ] Code battles and tournaments
- [ ] Team analytics
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

- Thanks to all [contributors](https://github.com/lantos1618/github.gg/graphs/contributors) who have helped build gh.gg
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

Made with ❤️ by the gh.gg community

> **Note:** gh.gg is not affiliated with, endorsed by, or sponsored by GitHub, Inc. GitHub is a registered trademark of GitHub, Inc.

</div>
