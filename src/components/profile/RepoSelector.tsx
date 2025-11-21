"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, GitFork, CheckCircle2 } from 'lucide-react';
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
  onConfirm: (selectedRepoNames: string[]) => void;
  defaultSelected?: string[];
}

export function RepoSelector({ open, onOpenChange, repos, onConfirm, defaultSelected = [] }: RepoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set(defaultSelected));

  // Filter out forks and apply search
  const filteredRepos = repos
    .filter(repo => !repo.fork)
    .filter(repo =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0));

  // Reset selected repos when dialog opens with defaults
  useEffect(() => {
    if (open && defaultSelected.length > 0) {
      setSelectedRepos(new Set(defaultSelected));
    }
  }, [open, defaultSelected]);

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
    onConfirm(Array.from(selectedRepos));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-black">Select Repositories</DialogTitle>
          <DialogDescription className="text-gray-500">
            Choose which repositories best represent your skills for AI analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Quick Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 focus:border-black"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectTop15} className="border-gray-200 text-gray-600">
              Auto-select Top 15
            </Button>
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {selectedRepos.size} selected
            </span>
            {selectedRepos.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRepos(new Set())}
                className="text-gray-500 hover:text-black"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Repository List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepos.has(repo.name);
                return (
                  <div
                    key={repo.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-white'
                    }`}
                    onClick={() => handleToggle(repo.name)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(repo.name)}
                        className="mt-1 border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate text-black">{repo.name}</h4>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-2 font-light">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                          {repo.language && (
                            <span>{repo.language}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {repo.stargazersCount || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <GitFork className="h-3 w-3" />
                            {repo.forksCount || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedRepos.size === 0} className="bg-black hover:bg-gray-800 text-white">
            Analyze {selectedRepos.size} Repos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
