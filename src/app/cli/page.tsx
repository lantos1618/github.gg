'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, Terminal, Sparkles, BarChart3, GitBranch } from 'lucide-react';

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
  local repo_path=$(git rev-parse --show-toplevel 2>/dev/null)
  local current_path=$(pwd)
  local relative_path=\${current_path#$repo_path}
  local github_url=$(echo "$remote_url" | sed "s|git@github.com:|https://github.gg/|" | sed "s|https://github.com/|https://github.gg/|" | sed "s|\\.git$||")
  if [ -n "$branch" ] && [ "$branch" != "master" ] && [ "$branch" != "main" ]; then
    github_url="$github_url/tree/$branch"
  fi
  if [ -n "$relative_path" ] && [ "$relative_path" != "/" ]; then
    github_url="$github_url$relative_path"
  fi
  echo "Opening: $github_url"
  xdg-open "$github_url" 2>/dev/null || open "$github_url" 2>/dev/null || echo "Open: $github_url"
}

open_github_scorecard() {
  local remote_url=$(git remote get-url origin 2>/dev/null)
  if [ -z "$remote_url" ]; then
    echo "Not in a git repository"
    return 1
  fi
  local github_url=$(echo "$remote_url" | sed "s|git@github.com:|https://github.gg/|" | sed "s|https://github.com/|https://github.gg/|" | sed "s|\\.git$||")
  github_url="$github_url/scorecard"
  echo "Opening: $github_url"
  xdg-open "$github_url" 2>/dev/null || open "$github_url" 2>/dev/null || echo "Open: $github_url"
}

open_github_diagram() {
  local remote_url=$(git remote get-url origin 2>/dev/null)
  if [ -z "$remote_url" ]; then
    echo "Not in a git repository"
    return 1
  fi
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
    <Button
      onClick={handleCopy}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export default function CLIPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 text-sm text-gray-600 mb-6">
            <Terminal className="h-4 w-4" />
            Terminal shortcuts
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            GitHub.gg CLI
          </h1>

          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            Open any repo on GitHub.gg directly from your terminal. Just type <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-800">gg</code> in any git repository.
          </p>
        </div>
      </div>

      {/* Commands */}
      <div className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Commands</h2>

          <div className="grid gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <code className="bg-gray-900 text-white px-3 py-1 rounded text-sm font-mono">gg</code>
                <span className="text-gray-600">Open repo on GitHub.gg</span>
              </div>
              <p className="text-sm text-gray-500">
                Opens the current repository on github.gg. Automatically detects your branch and current directory path.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <code className="bg-violet-600 text-white px-3 py-1 rounded text-sm font-mono">ggs</code>
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  Open Scorecard
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Opens the AI-powered code quality scorecard for your repository. Get instant analysis and recommendations.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <code className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-mono">ggd</code>
                <div className="flex items-center gap-2 text-gray-600">
                  <GitBranch className="h-4 w-4 text-blue-500" />
                  Open Diagram
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Opens the architecture diagram generator. Visualize your codebase structure instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Installation */}
      <div className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Installation</h2>
          <p className="text-gray-500 mb-6">
            Add these functions to your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">~/.bashrc</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">~/.zshrc</code> file:
          </p>

          <div className="relative">
            <div className="absolute top-3 right-3">
              <CopyButton text={BASH_SCRIPT} label="Copy script" />
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{BASH_SCRIPT}</code>
            </pre>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>After adding:</strong> Run <code className="bg-amber-100 px-1.5 py-0.5 rounded">source ~/.bashrc</code> or restart your terminal to activate the commands.
            </p>
          </div>
        </div>
      </div>

      {/* Quick tip */}
      <div className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Tip</h2>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">URL Shortcut</h3>
                <p className="text-sm text-gray-500 mb-3">
                  You can also access any GitHub repo on github.gg by simply changing the URL:
                </p>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">github.com/</span>
                    <span className="text-gray-600">owner/repo</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-violet-600 font-semibold">github.gg/</span>
                    <span className="text-gray-600">owner/repo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
