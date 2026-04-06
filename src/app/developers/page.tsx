'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { TextButton } from '@/components/ui/text-button';
import { PageWidthContainer } from '@/components/PageWidthContainer';

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
    <button onClick={handleCopy} className="px-3 py-1.5 text-[13px] font-medium text-[#666] border border-[#ddd] rounded hover:border-[#111] hover:text-[#111] transition-colors flex items-center gap-1.5">
      {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />{label}</>}
    </button>
  );
}

const endpoints = [
  { method: 'GET', path: '/api/v1/profiles/:username', description: 'Get a developer profile by GitHub username', example: 'curl -H "Authorization: Bearer gg_xxx" https://github.gg/api/v1/profiles/torvalds' },
  { method: 'GET', path: '/api/v1/profiles/search', description: 'Search developer profiles with filters', example: 'curl -H "Authorization: Bearer gg_xxx" "https://github.gg/api/v1/profiles/search?skills=React,TypeScript"' },
  { method: 'GET', path: '/api/v1/scorecards/:owner/:repo', description: 'Get repository scorecard analysis', example: 'curl -H "Authorization: Bearer gg_xxx" https://github.gg/api/v1/scorecards/facebook/react' },
];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('cli');

  return (
    <div className="min-h-screen bg-white">
      <PageWidthContainer className="pt-12 pb-20">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[31px] font-semibold text-[#111] mb-2">Developers</h1>
          <p className="text-base text-[#aaa]">
            CLI tools, REST API, and AI assistants for your workflow
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-5 mb-8">
          {([['cli', 'CLI'], ['api', 'REST API'], ['mcp', 'MCP']] as const).map(([key, label]) => (
            <TextButton
              key={key}
              onClick={() => setActiveTab(key)}
              active={activeTab === key}
              size="base"
              className="pb-1.5 font-medium"
            >
              {label}
              {key === 'mcp' && <span className="ml-1.5 text-[10px] text-[#f59e0b] font-semibold uppercase">Soon</span>}
            </TextButton>
          ))}
        </div>

        <div className="border-b border-[#eee] mb-8" />

        {/* CLI Tab */}
        {activeTab === 'cli' && (
          <div className="space-y-8">
            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Terminal Shortcuts</div>
              <p className="text-base text-[#666] leading-[1.6]">
                Open any repo on github.gg directly from your terminal. Just type <code className="bg-[#eee] px-1.5 py-0.5 rounded text-[13px]">gg</code> in any git repository.
              </p>
            </div>

            <div className="space-y-[2px]">
              {[
                { cmd: 'gg', desc: 'Open repo on GitHub.gg', detail: 'Detects branch and path automatically', color: '#111' },
                { cmd: 'ggs', desc: 'Open Scorecard', detail: 'AI-powered code quality scorecard', color: '#f59e0b' },
                { cmd: 'ggd', desc: 'Open Diagram', detail: 'Architecture diagram generator', color: '#8b5cf6' },
              ].map((item) => (
                <div key={item.cmd} className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: `3px solid ${item.color}` }}>
                  <div className="flex items-center gap-3 mb-1">
                    <code className="text-base font-mono font-semibold text-[#111]">{item.cmd}</code>
                    <span className="text-base text-[#333]">{item.desc}</span>
                  </div>
                  <div className="text-[13px] text-[#888]">{item.detail}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">Installation</div>
                <CopyButton text={BASH_SCRIPT} label="Copy" />
              </div>
              <p className="text-base text-[#666] mb-3">
                Add to <code className="bg-[#eee] px-1.5 py-0.5 rounded text-[13px]">~/.bashrc</code> or <code className="bg-[#eee] px-1.5 py-0.5 rounded text-[13px]">~/.zshrc</code>:
              </p>
              <pre className="bg-[#1a1a1a] text-[#ddd] rounded p-4 overflow-x-auto text-[13px] font-mono leading-relaxed max-h-72">
                <code>{BASH_SCRIPT}</code>
              </pre>
              <div className="mt-3 bg-[#f8f9fa] py-[10px] px-[14px] text-[13px] text-[#666]" style={{ borderLeft: '3px solid #f59e0b' }}>
                Run <code className="bg-[#eee] px-1 py-0.5 rounded text-[13px]">source ~/.bashrc</code> or restart your terminal to activate.
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-8">
            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">REST API</div>
              <p className="text-base text-[#666] leading-[1.6]">
                Programmatic access to developer profiles and scorecards.
              </p>
            </div>

            <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #111' }}>
              <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#111] mb-2">Authentication</div>
              <div className="text-base text-[#666] mb-2">Include your API key in requests:</div>
              <code className="block bg-[#1a1a1a] text-[#ddd] rounded px-3 py-2 font-mono text-[13px]">
                Authorization: Bearer gg_your_api_key
              </code>
              <div className="text-[13px] text-[#888] mt-2">
                Get your API key from <Link href="/settings" className="text-[#111] hover:text-[#666] transition-colors font-medium">Settings</Link>.
              </div>
            </div>

            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Endpoints</div>
              <div className="space-y-[2px]">
                {endpoints.map((endpoint, idx) => (
                  <div key={idx} className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #34a853' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold uppercase tracking-[1px] text-[#34a853]">{endpoint.method}</span>
                      <code className="font-mono text-base text-[#111]">{endpoint.path}</code>
                    </div>
                    <div className="text-base text-[#666] mb-2">{endpoint.description}</div>
                    <pre className="bg-[#1a1a1a] text-[#ddd] rounded px-3 py-2 font-mono text-[13px] overflow-x-auto">
                      {endpoint.example}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/api-docs" className="text-base text-[#888] hover:text-[#111] transition-colors inline-block">
              Full API documentation &rarr;
            </Link>
          </div>
        )}

        {/* MCP Tab */}
        {activeTab === 'mcp' && (
          <div className="space-y-8">
            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Model Context Protocol</div>
              <p className="text-base text-[#666] leading-[1.6]">
                Connect AI assistants like Claude, Cursor, and Windsurf directly to github.gg.
              </p>
            </div>

            <div className="bg-[#f8f9fa] py-[14px] px-[16px] text-center" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#f59e0b] mb-2">Coming Soon</div>
              <div className="text-base text-[#333] mb-3">
                We're building an MCP server that will let AI assistants search repos,
                get scorecards, and analyze developer profiles directly.
              </div>
              <div className="text-[13px] text-[#888]">
                Interested? Email <a href="mailto:hello@github.gg" className="text-[#111] hover:text-[#666] transition-colors font-medium">hello@github.gg</a>
              </div>
            </div>

            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">What you'll be able to do</div>
              <div className="space-y-[2px]">
                {[
                  { label: 'Search', desc: '"Find React repos with good test coverage"' },
                  { label: 'Insights', desc: '"What\'s the tech stack of @username?"' },
                  { label: 'Analysis', desc: '"Analyze the code quality of this repo"' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#f8f9fa] py-[12px] px-[16px]" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <div className="text-base font-medium text-[#111]">{item.label}</div>
                    <div className="text-[13px] text-[#888] italic">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageWidthContainer>
    </div>
  );
}
