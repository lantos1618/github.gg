# GitHub.gg

A modern GitHub repository analyzer built with Next.js, NextAuth.js, and Octokit, powered by Bun.

## Features

- 🔒 Secure authentication with GitHub OAuth
- 📊 Repository analysis and statistics
- 🚀 Fast and responsive UI
- ⚡ Optimized for performance with Bun
- 🏗️ TypeScript first-class support
- 🧪 Built-in testing with Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- GitHub OAuth App credentials

### Quick Start with Bun

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Start development server
bun dev
```

### Traditional Setup (Node.js)

If you prefer using Node.js:

```bash
# Install dependencies
npm install
# or
yarn

# Start development server
npm run dev
# or
yarn dev
```

### Environment Setup

1. Create a `.env.local` file in the root directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Configure the environment variables (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for details):
   ```env
   # NextAuth
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=http://localhost:3000
   
   # GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

### Development

1. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing Authentication

To test the authentication flow:

1. Start the development server
2. Navigate to the login page or click the "Sign in with GitHub" button
3. Authorize the application with your GitHub account
4. You should be redirected back to the application

For automated testing, you can use the test script:

```bash
npx tsx scripts/test-auth.ts
```

## Production Deployment

### Vercel

1. Push your code to a GitHub repository
2. Import the repository on [Vercel](https://vercel.com/import)
3. Add the required environment variables in the Vercel dashboard
4. Deploy!

## API Reference

### Authentication

All API routes are protected and require authentication. Include the session token in your requests.

### Rate Limiting

- Unauthenticated: 10 requests per hour
- Authenticated: 100 requests per hour

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter) - email@example.com

Project Link: [https://github.com/yourusername/github.gg](https://github.com/yourusername/github.gg)
