"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, GitFork, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  fork: boolean;
}

interface RepoSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: Repo[];
  onConfirm: (selectedRepoNames: string[], forceRefreshScorecards: boolean) => void;
  defaultSelected?: string[];
}

export function RepoSelector({ open, onOpenChange, repos, onConfirm, defaultSelected = [] }: RepoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set(defaultSelected));
  const [forceRefreshScorecards, setForceRefreshScorecards] = useState(false);

  const filteredRepos = repos
    .filter(repo => !repo.fork)
    .filter(repo =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0));

  useEffect(() => {
    if (open && defaultSelected.length > 0) {
      setSelectedRepos(new Set(defaultSelected));
    }
  }, [open, defaultSelected]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleToggle = (repoName: string) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoName)) {
      newSelected.delete(repoName);
    } else {
      newSelected.add(repoName);
    }
    setSelectedRepos(newSelected);
  };

  const handleSelectTop15 = () => {
    const top15 = filteredRepos.slice(0, 15).map(r => r.name);
    setSelectedRepos(new Set(top15));
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedRepos), forceRefreshScorecards);
    onOpenChange(false);
    setForceRefreshScorecards(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div
        data-testid="profile-repo-selector-dialog"
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] z-50 bg-white shadow-xl transition-transform duration-200 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-black">Select Repositories</h2>
            <p className="text-sm text-gray-400 mt-0.5">{selectedRepos.size} selected</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-50 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-gray-200 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectTop15}
              className="text-xs text-gray-400 hover:text-black transition-colors"
            >
              Auto-select top 15
            </button>
            {selectedRepos.size > 0 && (
              <button
                onClick={() => setSelectedRepos(new Set())}
                className="text-xs text-gray-400 hover:text-black transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Repo list */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-2">
            {filteredRepos.map((repo) => {
              const isSelected = selectedRepos.has(repo.name);
              return (
                <div
                  key={repo.name}
                  className={`flex items-start gap-3 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => handleToggle(repo.name)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(repo.name)}
                    className="mt-0.5 border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-black truncate">{repo.name}</h4>
                    {repo.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-300 font-mono">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5" />{repo.stargazersCount || 0}</span>
                      <span className="flex items-center gap-0.5"><GitFork className="h-2.5 w-2.5" />{repo.forksCount || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="force-refresh"
              checked={forceRefreshScorecards}
              onCheckedChange={(checked) => setForceRefreshScorecards(checked === true)}
              className="border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
            />
            <label htmlFor="force-refresh" className="text-xs text-gray-400 cursor-pointer">
              Hard refresh all scorecards
            </label>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={selectedRepos.size === 0}
            className="w-full bg-black hover:bg-gray-800 text-white h-10"
          >
            Analyze {selectedRepos.size} repos
          </Button>
        </div>
      </div>
    </>
  );
}
