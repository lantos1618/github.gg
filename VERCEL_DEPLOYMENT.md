# Vercel Deployment Guide

## Required Environment Variables

Set these in your Vercel project settings:

### Database
- `DATABASE_URL`: Your PostgreSQL connection string (Vercel Postgres recommended)

### GitHub OAuth
- `GITHUB_CLIENT_ID`: Your GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth app client secret

### Better Auth
- `BETTER_AUTH_SECRET`: A random 32-character string for session encryption

## Setup Steps

1. **Create GitHub OAuth App**:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new app with callback URL: `https://your-domain.vercel.app/api/auth/callback/github`

2. **Set up Vercel Postgres**:
   - Add Vercel Postgres integration in your project
   - The `DATABASE_URL` will be automatically added

3. **Run Database Migrations**:
   ```bash
   npx drizzle-kit push
   ```

4. **Deploy**:
   - Push to main branch or create a new deployment

## Notes

- Better Auth will automatically handle session management
- Database connection uses connection pooling in production
- Sessions are stored in PostgreSQL for persistence 