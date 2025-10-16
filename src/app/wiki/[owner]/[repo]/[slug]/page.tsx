import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Clock, Eye, GitBranch, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { createCaller } from '@/lib/trpc/server';
import { incrementViewCount } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteWikiButton } from '@/components/wiki/DeleteWikiButton';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';

interface WikiPageProps {
  params: Promise<{
    owner: string;
    repo: string;
    slug: string;
  }>;
  searchParams: Promise<{
    version?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: WikiPageProps): Promise<Metadata> {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const page = await caller.wiki.getWikiPage({
    owner,
    repo,
    slug,
    version: version ? parseInt(version) : undefined,
  });

  if (!page) {
    return {
      title: 'Wiki Page Not Found',
    };
  }

  const title = `${page.title} - ${owner}/${repo} Documentation`;
  const description = page.summary || `Documentation for ${owner}/${repo}`;

  return {
    title,
    description,
    keywords: (page.metadata as { keywords?: string[] })?.keywords || [owner, repo, 'documentation', 'wiki'],
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://github.gg/wiki/${owner}/${repo}/${slug}`,
      siteName: 'gh.gg',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: page.isPublic,
      follow: page.isPublic,
    },
  };
}

export default async function WikiPage({ params, searchParams }: WikiPageProps) {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const [page, toc] = await Promise.all([
    caller.wiki.getWikiPage({
      owner,
      repo,
      slug,
      version: version ? parseInt(version) : undefined,
    }),
    caller.wiki.getWikiTableOfContents({
      owner,
      repo,
      version: version ? parseInt(version) : undefined,
    }),
  ]);

  if (!page) {
    notFound();
  }

  // Check if user has permission to delete wiki
  let canDeleteWiki = false;
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    if (session?.user) {
      const githubService = await createGitHubServiceForUserOperations(session);
      const { data: repoData } = await githubService['octokit'].repos.get({
        owner,
        repo,
      });
      canDeleteWiki = !!(repoData.permissions?.admin || repoData.permissions?.push);
    }
  } catch (error) {
    console.error('Failed to check repository permissions:', error);
  }

  // Increment view count (server action)
  incrementViewCount({ owner, repo, slug, version: page.version });

  // Map TOC pages to the format expected by the sidebar
  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link
                  href={`/${owner}/${repo}`}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{owner}/{repo}</span>
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{page.viewCount}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">v{page.version}</span>
                </div>
                {canDeleteWiki && <DeleteWikiButton owner={owner} repo={repo} />}
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 lg:py-12">
          {/* Main Content */}
          <main className="max-w-4xl mx-auto w-full">
            {/* Page Header Card */}
            <Card className="mb-8 border-none shadow-lg">
              <CardContent className="pt-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                      {page.title}
                    </h1>
                    {page.summary && (
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {page.summary}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Markdown Content Card */}
            <Card className="border-none shadow-lg">
              <CardContent className="pt-8">
                <div className="prose prose-neutral dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-p:leading-relaxed prose-p:text-base
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted prose-pre:border prose-pre:my-6
                  prose-ul:my-4 prose-li:my-1
                  prose-ol:my-4
                  prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1
                  prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
                  prose-table:border prose-table:my-6
                  prose-th:bg-muted prose-th:p-2
                  prose-td:p-2 prose-td:border-t">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code(props) {
                        const { inline, className, children, ...rest } = props as {
                          inline?: boolean;
                          className?: string;
                          children?: React.ReactNode;
                        };
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={tomorrow}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              borderRadius: '0.5rem',
                              padding: '1.25rem',
                              fontSize: '0.875rem',
                              margin: '1.5rem 0',
                            }}
                            {...rest}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {page.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <footer className="mt-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p>
                  Auto-generated by{' '}
                  <Link href="/" className="font-semibold text-primary hover:underline">
                    gh.gg
                  </Link>
                </p>
                <Link
                  href={`https://github.com/${owner}/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                >
                  View repository on GitHub
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </RepoSidebarLayout>
  );
}
