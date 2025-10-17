# Local Development Guide

This guide explains how to set up and run GitHub.gg locally for development without requiring all external API keys.

## Overview

GitHub.gg is designed to work in different modes:

1. **Full Mode**: All features enabled with complete API keys
2. **Development Mode**: Core features with graceful degradation for missing APIs
3. **Demo Mode**: Mock data for demonstration purposes

## Quick Start

### 1. Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/lantos1618/github.gg.git
cd github.gg

# Run the automated setup
bun run setup
```

This will:
- Install dependencies
- Create `.env.local` with development defaults
- Start PostgreSQL database
- Run database migrations

### 2. Development Authentication (Optional)

The app now supports two authentication modes:

#### Development Mode (Recommended)
- Uses simple JWT-based authentication
- No external API keys required
- Pre-configured development users
- Automatically enabled when `NEXT_PUBLIC_USE_DEV_AUTH=true`

#### Production Mode (GitHub OAuth)
- Uses GitHub OAuth for authentication
- Requires GitHub OAuth App setup
- For production deployment

**To use GitHub OAuth in development:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure:
   - **Application name**: `github.gg-dev`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret
5. Update `.env.local`:
   ```bash
   GITHUB_CLIENT_ID="your-client-id"
   GITHUB_CLIENT_SECRET="your-client-secret"
   NEXT_PUBLIC_USE_DEV_AUTH="false"
   ```

### 3. Start Development Server

```bash
bun dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required Variables

These are **absolutely required** for the app to start:

| Variable | Description | Development Default |
|----------|-------------|-------------------|
| `DATABASE_URL` | PostgreSQL connection | Auto-configured by Docker |
| `BETTER_AUTH_SECRET` | Session encryption | Auto-generated |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Must be set manually |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Must be set manually |
| `NEXT_PUBLIC_APP_URL` | App URL | `http://localhost:3000` |

### Optional Variables

These enable additional features but the app works without them:

| Variable | Description | Feature |
|----------|-------------|---------|
| `GITHUB_PUBLIC_API_KEY` | GitHub Personal Access Token | Enhanced repository analysis |
| `GEMINI_API_KEY` | Google Gemini API Key | AI-powered insights |
| `STRIPE_*` | Stripe payment keys | Payment features |
| `POSTHOG_*` | PostHog analytics keys | Analytics |

## Development Mode Features

When `NODE_ENV=development` (default in local setup):

### Graceful Degradation

- **Missing GitHub API Key**: Uses basic repository data, shows upgrade prompts
- **Missing AI API Key**: Disables AI features, shows "coming soon" messages
- **Missing Payment Keys**: Shows mock payment UI, no actual transactions
- **Missing Analytics**: Logs events to console in development, no data collection

### Mock GitHub Repositories

In development mode, the app provides mock repository data for testing:

- **dev/dev-project**: Sample development project with JavaScript, Express server

This repository works exactly like a real GitHub repository:
- Full file browsing and content viewing
- Repository statistics and metadata
- Branch information
- Language breakdowns
- All features work without external API calls

**Mock File Structure**: The mock data is stored in `/repo/dev/dev-project/` directory to avoid exposing the actual project structure.

Visit `/dev` page to see the available mock repository and test the full application.

### Development Enhancements

- Enhanced error messages and debugging
- Development-only UI elements
- Mock data for testing
- Hot reload improvements

## Database Management

### Local Database

The setup script automatically configures a PostgreSQL database using Docker:

```bash
# Start database
bun run db:start

# Stop database
bun run db:stop

# Reset database (⚠️ Destructive)
bun run db:reset

# View in Drizzle Studio
bun run db:studio
```

### Database Schema

The database includes tables for:
- User accounts and sessions
- GitHub installations
- Repository analysis data
- Payment subscriptions
- API key storage

## Testing

### Running Tests

```bash
# All tests
bun test

# Specific test categories
bun run test:payment
bun run test:all
```

### Test Environment

Tests use:
- Separate test database
- Mock external APIs
- Isolated environment variables
- No external dependencies

## Development Workflow

### 1. Local Development

```bash
# Start development
bun dev

# Make changes to code
# Hot reload will automatically apply changes
```

### 2. Testing Changes

```bash
# Run tests
bun test

# Check code quality
bun run lint
```

### 3. Database Changes

```bash
# Generate migration
bun run db:generate

# Apply migration
bun run db:push
```

### 4. Preview Deployment

```bash
# Push to feature branch
git push origin feature/your-feature

# Create PR on GitHub
# Vercel will automatically deploy preview
```

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Restart database
bun run db:stop
bun run db:start
```

**Port 3000 Already in Use:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Environment Variables Missing:**
```bash
# Recreate .env.local
rm .env.local
bun run setup
```

**Docker Issues:**
```bash
# Restart Docker
docker system prune -a
docker-compose down
docker-compose up -d postgres
```

### Development Tips

1. **Use Development Mode**: Always run with `NODE_ENV=development`
2. **Check Logs**: Monitor console for error messages
3. **Database Studio**: Use `bun run db:studio` to inspect data
4. **Hot Reload**: Changes to most files will auto-reload
5. **Environment**: Keep `.env.local` updated with your keys

## Optional Features Setup

### GitHub API Enhancement

For better repository analysis:

1. Create GitHub Personal Access Token
2. Add to `.env.local`:
   ```
   GITHUB_PUBLIC_API_KEY="your-token"
   ```

### AI Analysis Features

For AI-powered insights:

1. Get Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env.local`:
   ```
   GEMINI_API_KEY="your-key"
   ```

### Payment Features

For payment integration:

1. Set up Stripe account
2. Get test keys from Stripe Dashboard
3. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   STRIPE_BYOK_PRICE_ID="price_..."
   STRIPE_PRO_PRICE_ID="price_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

### Analytics Features

For PostHog analytics:

1. Set up PostHog account
2. Get API keys from PostHog Dashboard
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_POSTHOG_KEY="your_posthog_key"
   NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"
   ```

**Development Behavior**: Without PostHog keys, analytics events are logged to the browser console in development mode for debugging purposes.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test locally
4. Run tests: `bun test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

## Next Steps

After local setup:

1. **Explore the App**: Navigate through different features
2. **Add Optional APIs**: Enhance functionality with additional keys
3. **Run Tests**: Ensure everything works correctly
4. **Make Changes**: Start developing your features
5. **Deploy**: Push to GitHub for preview deployment

For production deployment, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md). 