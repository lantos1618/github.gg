'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bot,
  CircleDot,
  GitPullRequest,
  Network,
  GitCommit,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  FolderGit2,
  Github,
  ShieldAlert,
} from 'lucide-react';
import { cn, parseRepoPath } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

interface WikiPage {
  slug: string;
  title: string;
}

interface RepoSidebarProps {
  owner: string;
  repo: string;
  wikiPages?: WikiPage[];
  branches?: string[];
  defaultBranch?: string;
  commitSha?: string;
}

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

type ExpandableSection = 'wiki' | 'automations' | 'diagram';

interface NavItemsListProps {
  items: NavItem[];
  isExpanded: boolean;
  isActive: (path: string) => boolean;
  expandedSections: Record<ExpandableSection, boolean>;
  toggleSection: (section: ExpandableSection) => void;
}

function NavItemsList({ items, isExpanded, isActive, expandedSections, toggleSection }: NavItemsListProps) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        const hasChildren = item.children && item.children.length > 0;
        const isItemExpanded = expandedSections[item.key as ExpandableSection] ?? true;

        return (
          <li key={item.key}>
            {hasChildren && isExpanded ? (
              <>
                <div className="flex items-center gap-1">
                  <Link
                    href={item.path}
                    className={cn(
                      'flex-1 flex items-center gap-3 px-3 py-2 rounded transition-colors group',
                      active
                        ? 'bg-[#111] text-white font-medium'
                        : 'text-[#666] hover:text-[#111] hover:bg-[#f8f9fa]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-[#aaa] group-hover:text-[#111]')} />
                    <span className="text-base flex-1 text-left">{item.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleSection(item.key as ExpandableSection)}
                    className="p-2 rounded transition-colors hover:bg-[#f8f9fa] text-[#aaa]"
                  >
                    {isItemExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {isItemExpanded && (
                  <ul className="mt-0.5 ml-7 space-y-0.5 border-l border-[#eee] pl-3">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child.path);
                      return (
                        <li key={child.key}>
                          <Link
                            href={child.path}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-1.5 rounded text-base transition-colors group',
                              childActive
                                ? 'bg-[#111] text-white font-medium'
                                : 'text-[#888] hover:text-[#111] hover:bg-[#f8f9fa]'
                            )}
                          >
                            <ChildIcon className={cn('h-3.5 w-3.5', childActive ? 'text-white' : 'text-[#ccc] group-hover:text-[#111]')} />
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <Link
                href={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded transition-colors group',
                  active
                    ? 'bg-[#111] text-white font-medium'
                    : 'text-[#666] hover:text-[#111] hover:bg-[#f8f9fa]'
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-[#aaa] group-hover:text-[#111]')} />
                {isExpanded && <span className="text-base">{item.label}</span>}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RepoSidebar({ owner, repo, wikiPages = [], branches = [], defaultBranch = 'main', commitSha }: RepoSidebarProps) {
  const { isExpanded, setIsExpanded } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<Record<ExpandableSection, boolean>>({
    wiki: true,
    automations: true,
    diagram: true,
  });
  const pathname = usePathname();
  const router = useRouter();

  const toggleSection = (section: ExpandableSection) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isOnWikiPage = pathname.startsWith(`/wiki/${owner}/${repo}`);

  let currentBranch: string;
  let currentTab: string | undefined;
  let baseUrl: string;

  if (isOnWikiPage) {
    currentBranch = defaultBranch;
    currentTab = undefined;
    baseUrl = `/${owner}/${repo}`;
  } else {
    const pathParts = pathname.split('/').filter(Boolean);
    const params = { user: owner, params: pathParts.slice(1) };
    const parsed = parseRepoPath(params, branches || []);
    currentBranch = parsed.ref || defaultBranch;
    currentTab = parsed.tab;
    baseUrl = currentBranch === defaultBranch
      ? `/${owner}/${repo}`
      : `/${owner}/${repo}/tree/${currentBranch}`;
  }

  const handleBranchChange = (newBranch: string) => {
    if (isOnWikiPage) {
      const wikiSlugMatch = pathname.match(/^\/wiki\/[^/]+\/[^/]+\/(.+)$/);
      const slug = wikiSlugMatch ? wikiSlugMatch[1] : '';
      if (slug) {
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}/${slug}`
          : `/${owner}/${repo}/tree/${newBranch}/${slug}`;
        router.push(targetUrl);
      } else {
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}`
          : `/${owner}/${repo}/tree/${newBranch}`;
        router.push(targetUrl);
      }
      return;
    }

    let targetUrl: string;
    if (newBranch === defaultBranch) {
      targetUrl = currentTab ? `/${owner}/${repo}/${currentTab}` : `/${owner}/${repo}`;
    } else {
      targetUrl = currentTab
        ? `/${owner}/${repo}/tree/${newBranch}/${currentTab}`
        : `/${owner}/${repo}/tree/${newBranch}`;
    }
    router.push(targetUrl);
  };

  const intelligenceSection: NavSection = {
    title: 'Intelligence',
    items: [
      { key: 'scorecard', label: 'Scorecard', path: `${baseUrl}/scorecard`, icon: BarChart3 },
      { key: 'ai-slop', label: 'AI Slop', path: `${baseUrl}/ai-slop`, icon: Bot },
      { key: 'security', label: 'Security Review', path: `${baseUrl}/security`, icon: ShieldAlert },
      { key: 'issues', label: 'Issues', path: `${baseUrl}/issues`, icon: CircleDot },
      { key: 'pulls', label: 'Pulls', path: `${baseUrl}/pulls`, icon: GitPullRequest },
    ],
  };

  const documentationSection: NavSection = {
    title: 'Documentation',
    items: [
      { key: 'diagram', label: 'Diagrams', path: `${baseUrl}/diagram`, icon: Network },
    ],
  };

  const isActive = (path: string) => {
    if (path === baseUrl) return pathname === baseUrl || pathname === `${baseUrl}/`;
    return pathname.startsWith(path);
  };

  const isWikiActive = pathname.includes('/wiki/');
  const isRepoRootActive = isActive(baseUrl);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden fixed top-16 left-4 z-50 p-3 bg-white rounded border border-[#eee] hover:bg-[#f8f9fa] transition-colors"
        aria-label={isExpanded ? 'Close sidebar' : 'Open sidebar'}
      >
        {isExpanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          'fixed left-0 top-14 bg-white border-r border-[#eee] transition-all duration-300 z-40 flex flex-col',
          isExpanded ? 'w-60 translate-x-0' : 'w-14 -translate-x-full lg:translate-x-0'
        )}
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Repo Root */}
          <div>
            <ul className="space-y-0.5">
              <li>
                {isExpanded ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded transition-colors group flex-1 min-w-0',
                        isRepoRootActive
                          ? 'bg-[#111] text-white font-medium'
                          : 'text-[#666] hover:text-[#111] hover:bg-[#f8f9fa]'
                      )}
                    >
                      <FolderGit2 className={cn('h-4 w-4 flex-shrink-0', isRepoRootActive ? 'text-white' : 'text-[#aaa]')} />
                      <span className="text-base truncate min-w-0">
                        <Link
                          href={`/${owner}`}
                          className={cn('hover:underline', isRepoRootActive ? 'text-white/70 hover:text-white' : 'text-[#aaa] hover:text-[#111]')}
                        >
                          {owner}
                        </Link>
                        <span className={isRepoRootActive ? 'text-white/40' : 'text-[#ccc]'}>/</span>
                        <Link href={baseUrl} className="hover:underline">{repo}</Link>
                      </span>
                    </div>
                    <a
                      href={`https://github.com/${owner}/${repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-[#f8f9fa] text-[#aaa] hover:text-[#111] transition-colors flex-shrink-0"
                      title="View on GitHub"
                    >
                      <Github className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <Link
                    href={baseUrl}
                    className={cn(
                      'flex items-center justify-center p-2 rounded transition-colors',
                      isRepoRootActive ? 'bg-[#111] text-white' : 'text-[#aaa] hover:text-[#111] hover:bg-[#f8f9fa]'
                    )}
                    title={`${owner}/${repo}`}
                  >
                    <FolderGit2 className="h-4 w-4" />
                  </Link>
                )}
              </li>
            </ul>
            {commitSha && isExpanded && (
              <a
                href={`https://github.com/${owner}/${repo}/commit/${commitSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1 mt-1 text-[13px] text-[#aaa] hover:text-[#666] transition-colors"
                title={`Commit: ${commitSha}`}
              >
                <GitCommit className="h-3 w-3" />
                <span className="font-mono">{commitSha.slice(0, 7)}</span>
              </a>
            )}
          </div>

          <div className="border-t border-[#eee]" />

          {/* Intelligence */}
          <div>
            {isExpanded && (
              <div className="px-3 mb-2 text-[13px] font-semibold text-[#aaa] uppercase tracking-[1.5px]">
                {intelligenceSection.title}
              </div>
            )}
            <NavItemsList items={intelligenceSection.items} isExpanded={isExpanded} isActive={isActive} expandedSections={expandedSections} toggleSection={toggleSection} />
          </div>

          <div className="border-t border-[#eee]" />

          {/* Documentation */}
          <div>
            {isExpanded && (
              <div className="px-3 mb-2 text-[13px] font-semibold text-[#aaa] uppercase tracking-[1.5px]">
                {documentationSection.title}
              </div>
            )}
            <NavItemsList items={documentationSection.items} isExpanded={isExpanded} isActive={isActive} expandedSections={expandedSections} toggleSection={toggleSection} />

            {/* Wiki */}
            <div className="mt-1" suppressHydrationWarning>
              <div className="flex items-center gap-1">
                <Link
                  href={`/wiki/${owner}/${repo}`}
                  className={cn(
                    'flex-1 flex items-center gap-2.5 px-3 py-2 rounded transition-colors group',
                    isWikiActive ? 'bg-[#111] text-white font-medium' : 'text-[#666] hover:text-[#111] hover:bg-[#f8f9fa]'
                  )}
                >
                  <BookOpen className={cn('h-4 w-4 flex-shrink-0', isWikiActive ? 'text-white' : 'text-[#aaa] group-hover:text-[#111]')} />
                  <span className={cn('text-base flex-1 text-left', !isExpanded && 'hidden')}>Wiki</span>
                </Link>
                {wikiPages.length > 0 && isExpanded && (
                  <button
                    onClick={() => toggleSection('wiki')}
                    className="p-2 rounded transition-colors hover:bg-[#f8f9fa] text-[#aaa]"
                    aria-label={expandedSections.wiki ? 'Collapse wiki pages' : 'Expand wiki pages'}
                  >
                    {expandedSections.wiki ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {wikiPages.length > 0 && (
                <ul
                  className={cn(
                    'mt-0.5 ml-4 space-y-0.5 border-l border-[#eee] pl-3 transition-all duration-200',
                    !isExpanded || !expandedSections.wiki ? 'hidden' : 'block'
                  )}
                  suppressHydrationWarning
                >
                  {wikiPages.map((page) => {
                    const wikiPagePath = `/wiki/${owner}/${repo}/${page.slug}`;
                    const wikiActive = pathname === wikiPagePath;
                    return (
                      <li key={page.slug}>
                        <Link
                          href={wikiPagePath}
                          className={cn(
                            'block px-3 py-1.5 text-base rounded transition-colors',
                            wikiActive ? 'bg-[#111] text-white font-medium' : 'text-[#888] hover:text-[#111] hover:bg-[#f8f9fa]'
                          )}
                        >
                          {page.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </nav>

        {/* Collapse button */}
        <div className="hidden lg:block p-3 border-t border-[#eee]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded transition-colors hover:bg-[#f8f9fa] text-[#888] hover:text-[#111]"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronRight className={cn('h-4 w-4 flex-shrink-0 transition-transform', isExpanded ? 'rotate-180' : '')} />
            {isExpanded && <span className="text-base">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          'lg:hidden fixed top-14 left-0 right-0 bottom-0 bg-black/20 z-30 transition-opacity',
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsExpanded(false)}
      />
    </>
  );
}
