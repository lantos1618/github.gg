'use client';

import Link from 'next/link';
import { Book, FileText, ChevronRight } from 'lucide-react';
import { WikiGenerationButton } from '@/components/WikiGenerationButton';
import { WikiIndexMenu } from '@/components/wiki/WikiIndexMenu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

interface WikiIndexClientProps {
  owner: string;
  repo: string;
  version?: number;
  toc: any;
  branches: any[];
  defaultBranch: string;
  canEditWiki: boolean;
  wikiPages: { slug: string; title: string }[];
}

export function WikiIndexClient({
  owner,
  repo,
  version,
  toc,
  branches,
  defaultBranch,
  canEditWiki,
  wikiPages,
}: WikiIndexClientProps) {
  if (!toc || toc.pages.length === 0) {
    return (
      <RepoPageLayout user={owner} repo={repo} branches={branches} defaultBranch={defaultBranch} wikiPages={wikiPages}>
        <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-6 w-6 text-blue-600" />
                    {repo} Wiki Documentation
                  </CardTitle>
                  <CardDescription className="mt-2">
                    No wiki documentation exists for this repository yet.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <WikiGenerationButton owner={owner} repo={repo} />
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={owner} repo={repo} branches={branches} defaultBranch={defaultBranch} wikiPages={wikiPages}>
      <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-6 w-6 text-blue-600" />
                  {repo} Wiki Documentation
                </CardTitle>
                <CardDescription className="mt-2">
                  {toc.pages.length} {toc.pages.length === 1 ? 'page' : 'pages'} available
                </CardDescription>
              </div>
              <WikiIndexMenu
                owner={owner}
                repo={repo}
                pages={toc.pages}
                canEdit={canEditWiki}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {toc.pages.map((page: any) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${owner}/${repo}/${page.slug}${version ? `?version=${version}` : ''}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    <div>
                      <h3 className="font-medium group-hover:text-primary">{page.title}</h3>
                      {page.summary && (
                        <p className="text-sm text-muted-foreground mt-1">{page.summary}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RepoPageLayout>
  );
}

