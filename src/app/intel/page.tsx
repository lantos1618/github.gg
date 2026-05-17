'use client';

import { useState, useMemo } from 'react';
import {
  Bot,
  Shield,
  Activity,
  Target,
  Github,
  Plus,
  X,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextButton } from '@/components/ui/text-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MOCK_REPOS, MOCK_USERS, type ViewType } from './intel-data';
import { OverviewTab } from './OverviewTab';
import { NetworkTab } from './NetworkTab';
import { BotsTab } from './BotsTab';
import { GTMDiscoveryTab } from './GTMDiscoveryTab';

export default function IntelPage() {
  const [repoInput, setRepoInput] = useState('');
  const [selectedRepos, setSelectedRepos] = useState(MOCK_REPOS);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const addRepo = () => {
    if (repoInput.trim()) {
      // Mock adding a repo
      setRepoInput('');
    }
  };

  const removeRepo = (id: number) => {
    setSelectedRepos(repos => repos.filter(r => r.id !== id));
  };

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter(user => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return user.username.toLowerCase().includes(q) || user.name.toLowerCase().includes(q) || user.company.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery]);

  const totalStars = selectedRepos.reduce((sum, r) => sum + r.stars, 0);
  const totalBots = selectedRepos.reduce((sum, r) => sum + r.likelyBots, 0);
  const avgQuality = Math.round(selectedRepos.reduce((sum, r) => sum + r.qualityScore, 0) / selectedRepos.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-gray-900" />
                <h1 className="text-xl font-semibold text-gray-900">Repository Intelligence</h1>
                <Badge variant="outline" className="text-xs">Preview</Badge>
              </div>
              <p className="text-sm text-gray-500">
                Cross-repo star analysis, bot detection, and GTM discovery
              </p>
            </div>
          </div>

          {/* Repo Input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Add repository (owner/repo)"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRepo()}
                className="pl-10"
                aria-label="Add repository"
              />
            </div>
            <TextButton onClick={addRepo} className="inline-flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add
            </TextButton>
          </div>

          {/* Selected Repos */}
          <div className="flex flex-wrap gap-2">
            {selectedRepos.map(repo => (
              <div
                key={repo.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: repo.color }}
                />
                <span className="font-medium text-gray-700">{repo.owner}/{repo.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{(repo.stars / 1000).toFixed(0)}k</span>
                <button
                  onClick={() => removeRepo(repo.id)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'network', label: 'Network Analysis', icon: Network },
              { id: 'bots', label: 'Bot Detection', icon: Bot },
              { id: 'gtm', label: 'GTM Discovery', icon: Target },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewType)}
                className={cn(
                  'flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeView === item.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeView === 'overview' && (
          <OverviewTab
            selectedRepos={selectedRepos}
            totalStars={totalStars}
            totalBots={totalBots}
            avgQuality={avgQuality}
          />
        )}

        {activeView === 'network' && (
          <NetworkTab selectedRepos={selectedRepos} />
        )}

        {activeView === 'bots' && <BotsTab />}

        {activeView === 'gtm' && (
          <GTMDiscoveryTab
            filteredUsers={filteredUsers}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}

        {/* Coming Soon Footer */}
        <div className="mt-12 p-6 bg-white rounded-lg border text-center">
          <Shield className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">Intelligence Platform Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This is a preview with mock data. Full cross-repo analysis, real-time bot detection, and GTM features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
