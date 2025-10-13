# gh.gg

A modern GitHub repository analyzer built with Next.js, Better Auth, and Octokit, powered by Bun.

> **Note:** gh.gg is not affiliated with, endorsed by, or sponsored by GitHub, Inc. GitHub is a registered trademark of GitHub, Inc.

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
* Docker (for local database)
* GitHub OAuth App credentials

### 1. Clone and Install

```bash
git clone https://github.com/lantos1618/github.gg.git
cd github.gg
```

### 2. Run Development Setup

We've created an automated setup script that will configure everything for local development:

```bash
# Run the setup script (this will install dependencies, create .env.local, and start the database)
bun run setup
# or
./scripts/setup-dev.sh
```

### 3. Configure GitHub OAuth (Required)

After running the setup script, you need to create a GitHub OAuth App:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `gh.gg-dev` (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret
5. Update your `.env.local` file with these values

### 4. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# Install dependencies
bun install

# Create environment file
cp .env.local.example .env.local

# Start database
bun run db:start

# Run migrations
bun run db:push

# Start development server
bun dev
```

## Database Management

### Local Development
```bash
# Start database
bun run db:start

# Stop database
bun run db:stop

# Reset database (⚠️ Destructive - drops all data)
bun run db:reset

# View database in Drizzle Studio
bun run db:studio

# Generate new migration
bun run db:generate

# Apply migrations
bun run db:push
```

### Production Deployment (Vercel)

For production deployments:
1. Set `DATABASE_URL` in your Vercel environment variables
2. Add `bun run db:push` to your build command or as a post-deploy hook
3. No Docker needed - Vercel handles the database connection

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Yes |
| `GITHUB_PUBLIC_API_KEY` | GitHub API key for unauthenticated requests | No |
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis | No |

## Development vs Production

### Local Development
- Uses Docker Compose for PostgreSQL
- Loads environment from `.env.local`
- Run `bun run db:push` to apply migrations

### Production (Vercel)
- Uses production PostgreSQL (e.g., Vercel Postgres, Supabase, etc.)
- Environment variables set in Vercel dashboard
- Migrations run during build or deployment

## Development Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# If database won't start
bun run db:stop
bun run db:start

# If you need to reset the database
bun run db:reset
```

**Environment Variables Missing:**
- Make sure `.env.local` exists and contains required variables
- Run `./scripts/setup-dev.sh` to recreate the file
- Check that GitHub OAuth credentials are set correctly

**Port Already in Use:**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

**Docker Issues:**
```bash
# Restart Docker
docker system prune -a
docker-compose down
docker-compose up -d postgres
```

### Development Mode Features

When running in development mode (`NODE_ENV=development`):
- Enhanced error messages and debugging
- Mock data for optional services
- Graceful degradation for missing API keys
- Development-only UI elements

### Optional Features Setup

**GitHub API Enhancement:**
- Add `GITHUB_PUBLIC_API_KEY` to `.env.local` for better repository analysis
- Get a Personal Access Token from GitHub Settings > Developer settings > Personal access tokens

**AI Analysis Features:**
- Add `GEMINI_API_KEY` to `.env.local` for AI-powered insights
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

**Payment Features:**
- Add Stripe keys to `.env.local` for payment integration
- Set up Stripe account and get test keys from Stripe Dashboard

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Workflow

1. **Local Development**: Use `./scripts/setup-dev.sh` for initial setup
2. **Testing**: Run `bun test` to execute all tests
3. **Database Changes**: Use `bun run db:generate` to create migrations
4. **Code Quality**: Run `bun run lint` to check code style

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/lantos1618/github.gg](https://github.com/lantos1618/github.gg)
