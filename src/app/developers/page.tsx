'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Copy, Terminal, Code2, Bot, ArrowLeft, ExternalLink, Sparkles, BarChart3, GitBranch } from 'lucide-react';

type Tab = 'cli' | 'api' | 'mcp';

const BASH_SCRIPT = `# GitHub.gg CLI shortcuts - Add to ~/.bashrc or ~/.zshrc

# gg - Open current repo on github.gg
alias gg="open_github"

# ggs - Open scorecard for current repo
alias ggs="open_github_scorecard"

# ggd - Open diagram for current repo
alias ggd="open_github_diagram"

open_github() {
  local remote_url=$(git remote get-url origin 2>/dev/null)
  if [ -z "$remote_url" ]; then
    echo "Not in a git repository"
    return 1
  fi
  local branch=$(git branch --show-current 2>/dev/null)
  local github_url=$(echo "$remote_url" | sed "s|git@github.com:|https://github.gg/|" | sed "s|https://github.com/|https://github.gg/|" | sed "s|\\.git$||")
  if [ -n "$branch" ] && [ "$branch" != "master" ] && [ "$branch" != "main" ]; then
    github_url="$github_url/tree/$branch"
  fi
  echo "Opening: $github_url"
  xdg-open "$github_url" 2>/dev/null || open "$github_url" 2>/dev/null || echo "Open: $github_url"
}

open_github_scorecard() {
  local remote_url=$(git remote get-url origin 2>/dev/null)
  if [ -z "$remote_url" ]; then echo "Not in a git repository"; return 1; fi
  local github_url=$(echo "$remote_url" | sed "s|git@github.com:|https://github.gg/|" | sed "s|https://github.com/|https://github.gg/|" | sed "s|\\.git$||")
  github_url="$github_url/scorecard"
  echo "Opening: $github_url"
  xdg-open "$github_url" 2>/dev/null || open "$github_url" 2>/dev/null || echo "Open: $github_url"
}

open_github_diagram() {
  local remote_url=$(git remote get-url origin 2>/dev/null)
  if [ -z "$remote_url" ]; then echo "Not in a git repository"; return 1; fi
  local github_url=$(echo "$remote_url" | sed "s|git@github.com:|https://github.gg/|" | sed "s|https://github.com/|https://github.gg/|" | sed "s|\\.git$||")
  github_url="$github_url/diagram"
  echo "Opening: $github_url"
  xdg-open "$github_url" 2>/dev/null || open "$github_url" 2>/dev/null || echo "Open: $github_url"
}`;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
      {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />{label}</>}
    </Button>
  );
}

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/profiles/:username',
    description: 'Get a developer profile by GitHub username',
    example: 'curl -H "Authorization: Bearer gg_xxx" https://github.gg/api/v1/profiles/torvalds',
  },
  {
    method: 'GET',
    path: '/api/v1/profiles/search',
    description: 'Search developer profiles with filters',
    example: 'curl -H "Authorization: Bearer gg_xxx" "https://github.gg/api/v1/profiles/search?skills=React,TypeScript"',
  },
  {
    method: 'GET',
    path: '/api/v1/scorecards/:owner/:repo',
    description: 'Get repository scorecard analysis',
    example: 'curl -H "Authorization: Bearer gg_xxx" https://github.gg/api/v1/scorecards/facebook/react',
  },
  {
    method: 'GET',
    path: '/api/v1/arena/leaderboard',
    description: 'Get arena rankings leaderboard',
    example: 'curl -H "Authorization: Bearer gg_xxx" https://github.gg/api/v1/arena/leaderboard',
  },
];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cli');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Developers</h1>
          <p className="text-gray-500 mt-2">
            Integrate github.gg into your workflow with CLI tools, REST API, and AI assistants.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('cli')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'cli'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Terminal className="h-4 w-4" />
              CLI
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'api'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code2 className="h-4 w-4" />
              REST API
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'mcp'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bot className="h-4 w-4" />
              MCP
              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">Soon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* CLI Tab */}
        {activeTab === 'cli' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Terminal Shortcuts</h2>
              <p className="text-gray-500">
                Open any repo on github.gg directly from your terminal. Just type <code className="bg-gray-100 px-2 py-0.5 rounded">gg</code> in any git repository.
              </p>
            </div>

            {/* Commands */}
            <div className="grid gap-4">
              <div className="bg-gray-50 border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <code className="bg-gray-900 text-white px-3 py-1 rounded text-sm font-mono">gg</code>
                  <span className="text-gray-600">Open repo on GitHub.gg</span>
                </div>
                <p className="text-sm text-gray-500">Opens the current repository on github.gg. Detects branch and path automatically.</p>
              </div>

              <div className="bg-gray-50 border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <code className="bg-violet-600 text-white px-3 py-1 rounded text-sm font-mono">ggs</code>
                  <div className="flex items-center gap-2 text-gray-600">
                    <BarChart3 className="h-4 w-4 text-violet-500" />
                    Open Scorecard
                  </div>
                </div>
                <p className="text-sm text-gray-500">Opens the AI-powered code quality scorecard for your repository.</p>
              </div>

              <div className="bg-gray-50 border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <code className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-mono">ggd</code>
                  <div className="flex items-center gap-2 text-gray-600">
                    <GitBranch className="h-4 w-4 text-blue-500" />
                    Open Diagram
                  </div>
                </div>
                <p className="text-sm text-gray-500">Opens the architecture diagram generator for your codebase.</p>
              </div>
            </div>

            {/* Installation */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Installation</h3>
                <CopyButton text={BASH_SCRIPT} label="Copy script" />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Add to your <code className="bg-gray-100 px-1.5 py-0.5 rounded">~/.bashrc</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded">~/.zshrc</code>:
              </p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed max-h-80">
                <code>{BASH_SCRIPT}</code>
              </pre>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Run <code className="bg-amber-100 px-1.5 py-0.5 rounded">source ~/.bashrc</code> or restart your terminal to activate.
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">REST API</h2>
              <p className="text-gray-500">
                Programmatic access to developer profiles, scorecards, and arena rankings.
              </p>
            </div>

            {/* Auth */}
            <div className="bg-gray-50 border rounded-lg p-5">
              <h3 className="font-medium text-gray-900 mb-3">Authentication</h3>
              <p className="text-sm text-gray-600 mb-3">Include your API key in requests:</p>
              <div className="bg-gray-900 text-gray-100 rounded px-3 py-2 font-mono text-sm">
                Authorization: Bearer gg_your_api_key
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Get your API key from <Link href="/settings" className="text-blue-600 hover:underline">Settings</Link>.
              </p>
            </div>

            {/* Endpoints */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Endpoints</h3>
              <div className="space-y-4">
                {endpoints.map((endpoint, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                          {endpoint.method}
                        </span>
                        <code className="font-mono text-sm text-gray-900">{endpoint.path}</code>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                    </div>
                    <div className="p-3">
                      <pre className="bg-gray-900 text-gray-100 rounded px-3 py-2 font-mono text-xs overflow-x-auto">
                        {endpoint.example}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Link href="/api-docs" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                View full API documentation <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* MCP Tab */}
        {activeTab === 'mcp' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Model Context Protocol (MCP)</h2>
              <p className="text-gray-500">
                Connect AI assistants like Claude, Cursor, and Windsurf directly to github.gg.
              </p>
            </div>

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-6 text-center">
              <Bot className="h-12 w-12 text-violet-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                We&apos;re building an MCP server that will let AI assistants search repos,
                get scorecards, and analyze developer profiles directly.
              </p>
              <div className="text-sm text-gray-500">
                Interested? Email <a href="mailto:hello@github.gg" className="text-violet-600 hover:underline">hello@github.gg</a>
              </div>
            </div>

            {/* What MCP will enable */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">What you&apos;ll be able to do</h3>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Search & analyze repos</p>
                    <p className="text-sm text-gray-500">&quot;Find React repos with good test coverage&quot;</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Get developer insights</p>
                    <p className="text-sm text-gray-500">&quot;What&apos;s the tech stack of @username?&quot;</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Generate scorecards</p>
                    <p className="text-sm text-gray-500">&quot;Analyze the code quality of this repo&quot;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
