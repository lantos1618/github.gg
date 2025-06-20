# GitHub.gg

A modern GitHub repository analyzer built with Next.js, Better Auth, and Octokit, powered by Bun.

## Features

* 🔒 Secure authentication with GitHub OAuth
* 📊 Repository analysis and statistics
* 🚀 Fast and responsive UI
* ⚡ Optimized for performance with Bun
* 🏗️ TypeScript first-class support
* 🧪 Built-in testing with Bun
* 🗄️ PostgreSQL database with Docker

## Quick Start

### Prerequisites

* Bun (recommended) or Node.js 18+
* Docker (for database)
* GitHub OAuth App credentials

### 1. Clone and Install

```bash
git clone https://github.com/lantos1618/github.gg.git
cd github.gg
bun install
```

### 2. Set Up Database

```bash
# Start PostgreSQL with Docker and run migrations
bun run db:setup
```

This will:
- Start a PostgreSQL container
- Create the database schema
- Run all migrations

### 3. Configure Environment

Copy the example environment file and configure your GitHub OAuth credentials:

```bash
cp .env.local.example .env.local
```

Update the following variables in `.env.local`:
- `GITHUB_CLIENT_ID`: Your GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App Client Secret
- `BETTER_AUTH_SECRET`: A secure random string for session encryption

### 4. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

### Start Database
```bash
bun run db:start
```

### Stop Database
```bash
bun run db:stop
```

### Reset Database (⚠️ Destructive)
```bash
bun run db:reset
```

### View Database Schema
```bash
bun run db:studio
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Yes |
| `NEXTAUTH_URL` | Base URL of your app | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/lantos1618/github.gg](https://github.com/lantos1618/github.gg)
