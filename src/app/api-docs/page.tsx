import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'API Documentation - GG',
  description: 'Public REST API for accessing GitHub developer profiles, scorecards, and arena rankings',
};

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/profiles/:username',
    description: 'Get a developer profile by GitHub username',
    params: [
      { name: 'username', type: 'path', description: 'GitHub username' },
    ],
    example: '/api/v1/profiles/torvalds',
    response: `{
  "username": "torvalds",
  "profile": {
    "summary": "Creator of Linux and Git...",
    "skillAssessment": [...],
    "techStack": [...],
    "developerArchetype": "Domain Specialist",
    "profileConfidence": 95
  },
  "cached": true,
  "stale": false,
  "lastUpdated": "2024-01-15T10:30:00Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/profiles/search',
    description: 'Search developer profiles with filters',
    params: [
      { name: 'skills', type: 'query', description: 'Comma-separated skills (e.g., "React,TypeScript")' },
      { name: 'archetypes', type: 'query', description: 'Comma-separated types (e.g., "Production Builder")' },
      { name: 'minConfidence', type: 'query', description: 'Minimum profile confidence (0-100)' },
      { name: 'q', type: 'query', description: 'Free text search' },
      { name: 'limit', type: 'query', description: 'Max results (default 50, max 100)' },
      { name: 'offset', type: 'query', description: 'Pagination offset' },
    ],
    example: '/api/v1/profiles/search?skills=React,TypeScript&minConfidence=70&limit=10',
    response: `{
  "results": [
    {
      "username": "developer1",
      "summary": "Full-stack engineer...",
      "archetype": "Production Builder",
      "confidence": 85,
      "topSkills": [
        { "name": "React", "score": 9 },
        { "name": "TypeScript", "score": 8 }
      ]
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0,
  "hasMore": false
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/scorecards/:owner/:repo',
    description: 'Get repository scorecard analysis',
    params: [
      { name: 'owner', type: 'path', description: 'Repository owner' },
      { name: 'repo', type: 'path', description: 'Repository name' },
      { name: 'version', type: 'query', description: 'Specific version (optional)' },
    ],
    example: '/api/v1/scorecards/facebook/react',
    response: `{
  "owner": "facebook",
  "repo": "react",
  "scorecard": {
    "overallScore": 92,
    "metrics": [
      { "name": "Code Quality", "score": 95, "reason": "..." },
      { "name": "Documentation", "score": 90, "reason": "..." }
    ],
    "markdown": "## Analysis\\n..."
  },
  "version": 3,
  "cached": true,
  "stale": false,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "ref": "main"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/arena/leaderboard',
    description: 'Get arena rankings leaderboard',
    params: [
      { name: 'limit', type: 'query', description: 'Max results (default 50, max 100)' },
      { name: 'offset', type: 'query', description: 'Pagination offset' },
      { name: 'tier', type: 'query', description: 'Filter by tier (optional)' },
    ],
    example: '/api/v1/arena/leaderboard?limit=10',
    response: `{
  "leaderboard": [
    {
      "rank": 1,
      "username": "developer1",
      "eloRating": 1850,
      "tier": "Diamond",
      "wins": 45,
      "losses": 12,
      "winRate": 78.9,
      "totalBattles": 57,
      "winStreak": 5
    }
  ],
  "limit": 10,
  "offset": 0
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/arena/rankings/:username',
    description: 'Get arena ranking for a specific user',
    params: [
      { name: 'username', type: 'path', description: 'GitHub username' },
    ],
    example: '/api/v1/arena/rankings/torvalds',
    response: `{
  "username": "torvalds",
  "ranking": {
    "rank": 42,
    "eloRating": 1650,
    "tier": "Platinum",
    "wins": 28,
    "losses": 15,
    "winRate": 65.1,
    "totalBattles": 43,
    "winStreak": 2
  }
}`,
  },
];

const archetypes = [
  'Production Builder',
  'Full-Stack Generalist',
  'Domain Specialist',
  'Research & Innovation',
  'Open Source Contributor',
  'Early Career Explorer',
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-gray-500 mt-2">
            Public REST API for accessing developer profiles, scorecards, and arena rankings.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Base URL</h2>
          <div className="bg-gray-900 text-gray-100 rounded px-4 py-3 font-mono text-sm">
            https://github.gg
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Authentication</h2>
          <p className="text-gray-600 mb-4">
            All API endpoints require authentication using an API key. Include your key in the request headers:
          </p>

          <div className="bg-gray-900 text-gray-100 rounded px-4 py-3 font-mono text-sm mb-4 space-y-2">
            <div><span className="text-gray-400"># Option 1: Authorization header</span></div>
            <div>Authorization: Bearer gg_your_api_key_here</div>
            <div className="pt-2"><span className="text-gray-400"># Option 2: X-API-Key header</span></div>
            <div>X-API-Key: gg_your_api_key_here</div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Getting an API Key</h4>
            <p className="text-sm text-gray-600">
              Sign in to your account and go to{' '}
              <Link href="/settings" className="text-blue-600 hover:underline">Settings</Link>{' '}
              to generate an API key. Keys start with <code className="bg-gray-100 px-1 rounded">gg_</code>.
            </p>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
            <strong>Note:</strong> Only public GitHub profiles and repositories are accessible via the API.
            Private repository scorecards require authentication via the web interface.
          </div>
        </section>

        {/* Response Format */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Response Format</h2>
          <p className="text-gray-600 mb-4">
            All responses are JSON. Successful responses return HTTP 200 with the data.
            Errors return appropriate HTTP status codes with an error message.
          </p>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Success Response (200):</p>
              <pre className="text-sm text-gray-600 font-mono">{`{ "data": { ... } }`}</pre>
            </div>

            <div className="bg-red-50 rounded p-4">
              <p className="text-sm font-medium text-red-700 mb-2">Error Responses:</p>
              <div className="space-y-2 text-sm font-mono">
                <div>
                  <span className="text-red-600">401</span>
                  <span className="text-gray-600"> - Missing or invalid API key</span>
                </div>
                <div>
                  <span className="text-red-600">403</span>
                  <span className="text-gray-600"> - Insufficient permissions (wrong scope)</span>
                </div>
                <div>
                  <span className="text-red-600">404</span>
                  <span className="text-gray-600"> - Resource not found</span>
                </div>
                <div>
                  <span className="text-red-600">429</span>
                  <span className="text-gray-600"> - Rate limit exceeded</span>
                </div>
                <div>
                  <span className="text-red-600">500</span>
                  <span className="text-gray-600"> - Internal server error</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Caching */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Caching</h2>
          <p className="text-gray-600">
            Responses include cache headers. Profile and scorecard data is cached for 5 minutes
            with stale-while-revalidate for 10 minutes. The <code className="bg-gray-100 px-1 rounded">stale</code> field
            indicates if the data is older than 7 days.
          </p>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Endpoints</h2>

          <div className="space-y-8">
            {endpoints.map((endpoint, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Endpoint header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-sm text-gray-900">{endpoint.path}</code>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Parameters */}
                  {endpoint.params.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Parameters</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Type</th>
                            <th className="pb-2 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          {endpoint.params.map((param, pidx) => (
                            <tr key={pidx} className="border-t border-gray-100">
                              <td className="py-2 font-mono text-xs">{param.name}</td>
                              <td className="py-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  param.type === 'path'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {param.type}
                                </span>
                              </td>
                              <td className="py-2 text-gray-600">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Example */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Example Request</h4>
                    <div className="bg-gray-900 text-gray-100 rounded px-3 py-2 font-mono text-xs overflow-x-auto">
                      curl -H &quot;Authorization: Bearer gg_your_key&quot; https://github.gg{endpoint.example}
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Example Response</h4>
                    <pre className="bg-gray-900 text-gray-100 rounded px-3 py-2 font-mono text-xs overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Developer Archetypes */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Developer Archetypes</h2>
          <p className="text-gray-600 mb-4">
            Profiles are classified into one of these archetypes based on their GitHub activity:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {archetypes.map((archetype) => (
              <div key={archetype} className="bg-gray-50 px-3 py-2 rounded text-sm text-gray-700">
                {archetype}
              </div>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Rate Limits</h2>
          <p className="text-gray-600">
            API requests are rate limited to prevent abuse. Current limits:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li>• <strong>100 requests per minute</strong> per IP address</li>
            <li>• <strong>1000 requests per hour</strong> per IP address</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            Contact us for higher limits or enterprise access.
          </p>
        </section>

        {/* Contact */}
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
          <p className="text-gray-600">
            For questions, feature requests, or enterprise access, contact us at{' '}
            <a href="mailto:hello@github.gg" className="text-blue-600 hover:underline">
              hello@github.gg
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
