'use client';

import { useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RepoPageLayout } from '@/components/layouts/RepoPageLayout';

type UseQueryHook<TItem> = (input: {
  owner: string;
  repo: string;
  state: 'open' | 'closed' | 'all';
}) => {
  data: TItem[] | undefined;
  isLoading: boolean;
  error: { message: string } | null;
};

export interface ResourceListViewProps<TItem> {
  user: string;
  repo: string;
  useQuery: UseQueryHook<TItem>;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  searchPlaceholder: string;
  itemKey: (item: TItem) => string | number;
  filterItem: (item: TItem, search: string) => boolean;
  renderItem: (item: TItem, user: string, repo: string) => ReactNode;
  emptyStateMessage?: string;
  noResultsMessage?: string;
}

export function ResourceListView<TItem>({
  user,
  repo,
  useQuery,
  title,
  searchPlaceholder,
  itemKey,
  filterItem,
  renderItem,
  emptyStateMessage = 'No items found.',
  noResultsMessage = 'No items found matching your search.',
}: ResourceListViewProps<TItem>) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open');

  const { data: items, isLoading, error } = useQuery({ owner: user, repo, state });
  const filteredItems = items?.filter((item: TItem) => filterItem(item, search)) || [];

  if (error) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="w-[90%] max-w-[800px] mx-auto py-12">
          <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #ea4335' }}>
            <div className="text-[12px] font-semibold uppercase tracking-[1px] text-[#ea4335] mb-1">Error</div>
            <div className="text-[14px] text-[#333]">Failed to load {title.toLowerCase()}: {error.message}</div>
          </div>
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
      <div className="w-[90%] max-w-[800px] mx-auto py-8">
        <div className="mb-6">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">{title}</div>
          <p className="text-[14px] text-[#888]">{filteredItems.length} {title.toLowerCase()}</p>
        </div>

        {/* Search + Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
            <Input placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-6" />
          </div>
          <Select value={state} onValueChange={(value) => setState(value as 'open' | 'closed' | 'all')}>
            <SelectTrigger className="w-full sm:w-[140px] text-[14px] border-0 border-b border-[#ddd] rounded-none focus:ring-0 hover:border-[#888]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="py-12 text-center text-[14px] text-[#aaa]">Loading {title.toLowerCase()}...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-[14px] text-[#aaa]">{search ? noResultsMessage : emptyStateMessage}</div>
        ) : (
          <div className="space-y-0">
            {filteredItems.map((item: TItem) => (
              <div key={itemKey(item)} className="py-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors -mx-2 px-2">
                {renderItem(item, user, repo)}
              </div>
            ))}
          </div>
        )}
      </div>
    </RepoPageLayout>
  );
}
