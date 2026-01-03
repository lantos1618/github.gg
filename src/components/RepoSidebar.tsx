'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bot,
  Cog,
  CircleDot,
  GitPullRequest,
  Network,
  GitBranch,
  GitCommit,
  Box,
  Boxes,
  Workflow,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  FolderGit2,
  Github,
  Wrench,
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
    <ul className="space-y-1">
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
                      'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                      active
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleSection(item.key as ExpandableSection)}
                    className={cn(
                      'p-2 rounded-lg transition-all duration-200 hover:bg-gray-100',
                      active ? 'text-white' : 'text-gray-500'
                    )}
                  >
                    {isItemExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                {isItemExpanded && (
                  <ul className="mt-1 ml-8 space-y-1">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child.path);
                      return (
                        <li key={child.key}>
                          <Link
                            href={child.path}
                            className={cn(
                              'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-all duration-200 group',
                              childActive
                                ? 'bg-blue-500 text-white font-medium shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                          >
                            <ChildIcon className={cn('h-4 w-4', childActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
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
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                  active
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                {isExpanded && <span className="text-sm">{item.label}</span>}
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

  // Check if we're on a wiki page (wiki has different URL structure)
  const isOnWikiPage = pathname.startsWith(`/wiki/${owner}/${repo}`);

  // Parse the URL differently based on whether we're on wiki or regular route
  let currentBranch: string;
  let currentTab: string | undefined;
  let baseUrl: string;

  if (isOnWikiPage) {
    // Wiki pages don't have branches in their URLs - always use default branch
    currentBranch = defaultBranch;
    currentTab = undefined;
    baseUrl = `/${owner}/${repo}`;
  } else {
    // Regular route - parse the pathname to extract branch and tab
    const pathParts = pathname.split('/').filter(Boolean);
    const params = { user: owner, params: pathParts.slice(1) }; // Skip owner, keep rest
    const parsed = parseRepoPath(params, branches || []);

    currentBranch = parsed.ref || defaultBranch;
    currentTab = parsed.tab;

    // Build base URL with /tree/ prefix for non-default branches
    baseUrl = currentBranch === defaultBranch
      ? `/${owner}/${repo}`
      : `/${owner}/${repo}/tree/${currentBranch}`;
  }

  const handleBranchChange = (newBranch: string) => {
    // If on wiki page, extract the slug and try to navigate to same page
    if (isOnWikiPage) {
      const wikiSlugMatch = pathname.match(/^\/wiki\/[^/]+\/[^/]+\/(.+)$/);
      const slug = wikiSlugMatch ? wikiSlugMatch[1] : '';

      // Navigate to the same wiki slug (wikis don't actually have branches, but we switch to file browser)
      // If there was a slug, try to preserve it by going to that path in the file browser
      if (slug) {
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}/${slug}`
          : `/${owner}/${repo}/tree/${newBranch}/${slug}`;
        router.push(targetUrl);
      } else {
        // Just wiki index, go to repo root
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}`
          : `/${owner}/${repo}/tree/${newBranch}`;
        router.push(targetUrl);
      }
      return;
    }

    // Build the target URL based on the new branch for regular routes
    let targetUrl: string;

    if (newBranch === defaultBranch) {
      // Switching to default branch - no /tree/ prefix needed
      targetUrl = currentTab ? `/${owner}/${repo}/${currentTab}` : `/${owner}/${repo}`;
    } else {
      // Switching to non-default branch - use /tree/ prefix
      targetUrl = currentTab
        ? `/${owner}/${repo}/tree/${newBranch}/${currentTab}`
        : `/${owner}/${repo}/tree/${newBranch}`;
    }

    router.push(targetUrl);
  };

  const intelligenceSection: NavSection = {
    title: 'INTELLIGENCE',
    items: [
      { key: 'scorecard', label: 'Scorecard', path: `${baseUrl}/scorecard`, icon: BarChart3 },
      { key: 'ai-slop', label: 'AI Slop', path: `${baseUrl}/ai-slop`, icon: Bot },
      { key: 'refactor', label: 'Refactor', path: `${baseUrl}/refactor`, icon: Wrench },
      {
        key: 'automations',
        label: 'Automations',
        path: `${baseUrl}/automations`,
        icon: Cog,
        children: [
          { key: 'issues', label: 'Issues', path: `${baseUrl}/issues`, icon: CircleDot },
          { key: 'pulls', label: 'Pulls', path: `${baseUrl}/pulls`, icon: GitPullRequest },
        ],
      },
    ],
  };

  const documentationSection: NavSection = {
    title: 'DOCUMENTATION',
    items: [
      {
        key: 'diagram',
        label: 'Diagrams',
        path: `${baseUrl}/diagram`,
        icon: Network,
        children: [
          { key: 'dependencies', label: 'Dependencies', path: `${baseUrl}/dependencies`, icon: GitBranch },
          { key: 'architecture', label: 'Architecture', path: `${baseUrl}/architecture`, icon: Box },
          { key: 'components', label: 'Components', path: `${baseUrl}/components`, icon: Boxes },
          { key: 'data-flow', label: 'Data Flow', path: `${baseUrl}/data-flow`, icon: Workflow },
        ],
      },
    ],
  };

  const isActive = (path: string) => {
    if (path === baseUrl) {
      return pathname === baseUrl || pathname === `${baseUrl}/`;
    }
    return pathname.startsWith(path);
  };

  const isWikiActive = pathname.includes('/wiki/');
  const isRepoRootActive = isActive(baseUrl);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden fixed top-16 left-4 z-50 p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={isExpanded ? 'Close sidebar' : 'Open sidebar'}
      >
        {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-14 bg-white border-r border-gray-200 transition-all duration-300 z-40',
          'flex flex-col',
          // Mobile: slide off-screen when closed, Desktop: always visible with dynamic width
          isExpanded ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'
        )}
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
        {/* Scrollable Content */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Repo Root Link */}
          <div>
            <ul className="space-y-1">
              <li>
                {isExpanded ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={baseUrl}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group flex-1 min-w-0',
                        isRepoRootActive
                          ? 'bg-blue-600 text-white font-medium shadow-sm'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      )}
                      title={`${owner}/${repo}`}
                    >
                      <FolderGit2 className={cn('h-5 w-5 flex-shrink-0', isRepoRootActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                      <span className="text-sm truncate min-w-0">
                        {owner}/{repo}
                      </span>
                    </Link>
                    <a
                      href={`https://github.com/${owner}/${repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                      title="View on GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <Link
                    href={baseUrl}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                      isRepoRootActive
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    )}
                    title={`${owner}/${repo}`}
                  >
                    <FolderGit2 className={cn('h-5 w-5 flex-shrink-0', isRepoRootActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                  </Link>
                )}
              </li>
            </ul>
            {/* Commit SHA display */}
            {commitSha && isExpanded && (
              <a
                href={`https://github.com/${owner}/${repo}/commit/${commitSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 mt-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title={`Commit: ${commitSha}`}
              >
                <GitCommit className="h-3.5 w-3.5" />
                <span className="font-mono">{commitSha.slice(0, 7)}</span>
              </a>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Intelligence Section */}
          <div>
            {isExpanded && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {intelligenceSection.title}
              </h3>
            )}
            <NavItemsList
              items={intelligenceSection.items}
              isExpanded={isExpanded}
              isActive={isActive}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            />
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Documentation Section */}
          <div>
            {isExpanded && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {documentationSection.title}
              </h3>
            )}
            <NavItemsList
              items={documentationSection.items}
              isExpanded={isExpanded}
              isActive={isActive}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            />

            {/* Wiki Subsection */}
            <div className="mt-3" suppressHydrationWarning>
              <div className="flex items-center gap-1">
                <Link
                  href={`/wiki/${owner}/${repo}`}
                  className={cn(
                    'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                    isWikiActive
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <BookOpen className={cn('h-5 w-5 flex-shrink-0', isWikiActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900')} />
                  <span className={cn('text-sm flex-1 text-left', !isExpanded && 'hidden')}>Wiki</span>
                </Link>
                {wikiPages.length > 0 && isExpanded && (
                  <button
                    onClick={() => toggleSection('wiki')}
                    className={cn(
                      'p-2 rounded-lg transition-all duration-200 hover:bg-gray-100',
                      isWikiActive ? 'text-white' : 'text-gray-500'
                    )}
                    aria-label={expandedSections.wiki ? 'Collapse wiki pages' : 'Expand wiki pages'}
                  >
                    {expandedSections.wiki ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Wiki Pages - Always render for SSR, control visibility with CSS */}
              {wikiPages.length > 0 && (
                <ul
                  className={cn(
                    'mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-3 transition-all duration-200',
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
                            'block px-3 py-1.5 text-sm rounded-md transition-colors',
                            wikiActive
                              ? 'bg-blue-500 text-white font-medium shadow-sm'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

        {/* Collapse/Expand Button at Bottom (Desktop Only) */}
        <div className="hidden lg:block p-3 border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
              'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
            )}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronRight className={cn('h-5 w-5 flex-shrink-0 text-gray-500 transition-transform', isExpanded ? 'rotate-180' : '')} />
            {isExpanded && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
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
