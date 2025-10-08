"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Repositories for Analysis</DialogTitle>
          <DialogDescription>
            Choose which repositories best represent your skills. The AI will analyze these to generate your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Quick Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectTop15}>
              Auto-select Top 15
            </Button>
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedRepos.size} repositories selected
            </span>
            {selectedRepos.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRepos(new Set())}
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
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                    onClick={() => handleToggle(repo.name)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(repo.name)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">{repo.name}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {repo.language && (
                            <Badge variant="outline" className="text-xs">
                              {repo.language}
                            </Badge>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedRepos.size === 0}>
            Analyze {selectedRepos.size} {selectedRepos.size === 1 ? 'Repository' : 'Repositories'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
