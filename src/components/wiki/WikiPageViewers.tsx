'use client';

import { trpc } from '@/lib/trpc/client';
import { Eye, X, Ghost } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface WikiPageViewersProps {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
  totalViewCount: number;
}

export function WikiPageViewers({ owner, repo, slug, version, totalViewCount }: WikiPageViewersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = trpc.wiki.getWikiPageViewers.useQuery({ owner, repo, slug, version });

  const registeredUserViews = data?.totalViews || 0;
  const guestViews = Math.max(0, totalViewCount - registeredUserViews);
  const registeredUserCount = data?.viewers.length || 0;

  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-base text-[#aaa] hover:text-[#111] transition-colors cursor-pointer"
      >
        <Eye className="h-3.5 w-3.5" />
        {totalViewCount} views
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setIsOpen(false)} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white border-l border-[#eee] z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between p-6 border-b border-[#eee]">
            <div>
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
                Page Viewers
              </div>
              <div className="text-[31px] font-semibold text-[#111]">
                {totalViewCount}
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#aaa] mt-1">
                <span>{registeredUserCount} users</span>
                <span>~{guestViews} guests</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 text-[#aaa] hover:text-[#111] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {registeredUserCount > 0 && (
              <div className="mb-6">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
                  Users ({registeredUserCount})
                </div>
                <div className="space-y-2">
                  {data?.viewers.map((viewer) => {
                    const lastViewedDate = new Date(viewer.lastViewedAt);
                    const isRecent = Date.now() - lastViewedDate.getTime() < 5 * 60 * 1000;
                    return (
                      <div key={viewer.userId} className="flex items-start gap-3 py-2">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={`https://avatars.githubusercontent.com/${viewer.username}`} alt={viewer.username || 'User'} />
                          <AvatarFallback className="text-[13px] bg-[#f8f9fa] text-[#aaa]">{viewer.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a href={`/${viewer.username}`} className="text-base font-medium text-[#111] hover:text-[#666] truncate" onClick={() => setIsOpen(false)}>
                              {viewer.username}
                            </a>
                            {isRecent && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#34a853] font-semibold uppercase tracking-[0.5px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#34a853] animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] text-[#aaa]">
                            {viewer.viewCount} views · {formatDistanceToNow(lastViewedDate, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {guestViews > 0 && (
              <div>
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
                  Guest Views
                </div>
                <div className="bg-[#f8f9fa] py-[12px] px-[14px] text-base text-[#666]" style={{ borderLeft: '3px solid #ccc' }}>
                  ~{guestViews} views from anonymous visitors
                </div>
              </div>
            )}

            {registeredUserCount === 0 && guestViews === 0 && (
              <div className="py-12 text-center">
                <p className="text-base text-[#aaa]">No views yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
