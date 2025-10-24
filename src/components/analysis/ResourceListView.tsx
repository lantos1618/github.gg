'use client';

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

export interface ResourceListViewProps<TItem> {
  // Repository info
  user: string;
  repo: string;

  // TRPC query hook (matches TRPC's actual signature)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useQuery: any;

  // Display configuration
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  searchPlaceholder: string;
  itemKey: (item: TItem) => string | number;

  // Filtering
  filterItem: (item: TItem, search: string) => boolean;

  // Rendering
  renderItem: (item: TItem, user: string, repo: string) => ReactNode;

  // Optional empty state messages
  emptyStateMessage?: string;
  noResultsMessage?: string;
}

export function ResourceListView<TItem>({
  user,
  repo,
  useQuery,
  title,
  icon: Icon,
  searchPlaceholder,
  itemKey,
  filterItem,
  renderItem,
  emptyStateMessage = 'No items found.',
  noResultsMessage = 'No items found matching your search.',
}: ResourceListViewProps<TItem>) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open');

  const { data: items, isLoading, error } = useQuery({
    owner: user,
    repo,
    state,
  });

  const filteredItems = items?.filter((item: TItem) => filterItem(item, search)) || [];

  if (error) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load {title.toLowerCase()}: {error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
      <div className="container py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {filteredItems.length} {title.toLowerCase()}{filteredItems.length !== 1 ? '' : ' found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={state} onValueChange={(value) => setState(value as 'open' | 'closed' | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Item List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading {title.toLowerCase()}...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? noResultsMessage : emptyStateMessage}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item: TItem) => (
                  <div key={itemKey(item)} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {renderItem(item, user, repo)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RepoPageLayout>
  );
}
