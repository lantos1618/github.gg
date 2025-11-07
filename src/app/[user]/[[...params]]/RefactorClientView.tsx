"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2, AlertCircle, FileText, Code2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface RefactorClientViewProps {
  user: string;
  repo: string;
  refName?: string;
}

export default function RefactorClientView({
  user,
  repo,
  refName: initialRefName,
}: RefactorClientViewProps) {
  const [refName, setRefName] = useState(initialRefName || 'main');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  // Fetch repo info to get actual default branch if not provided
  const { data: repoInfo } = trpc.github.getRepoInfo.useQuery(
    { owner: user, repo },
    { enabled: !initialRefName }
  );

  useEffect(() => {
    if (!initialRefName && repoInfo?.default_branch) {
      setRefName(repoInfo.default_branch);
    }
  }, [initialRefName, repoInfo]);

  // Analyze mutation
  const analyze = trpc.refactor.analyzeRepo.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      alert(`Analysis failed: ${error.message}`);
    },
  });

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to analyze');
      return;
    }

    analyze.mutate({
      user,
      repo,
      ref: refName,
      filePaths: selectedFiles,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Wrench className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold">Refactor Analyzer</h1>
        </div>
        <p className="text-gray-600">
          AI-powered code analysis to identify refactoring opportunities in {user}/{repo}
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-5 w-5" />
            About Refactor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <p className="mb-3">
            This analyzer scans your codebase to identify common refactoring opportunities:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Large Files</strong> - Files exceeding recommended line counts (&gt;300 lines)</li>
            <li><strong>Large Functions</strong> - Functions that could be broken down (&gt;50 lines)</li>
            <li><strong>Complex Logic</strong> - Deep nesting and complex conditionals</li>
            <li><strong>Long Strings</strong> - Template strings that should be extracted</li>
          </ul>
        </CardContent>
      </Card>

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Start Analysis
          </CardTitle>
          <CardDescription>
            Analyze the codebase for refactoring opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleAnalyze}
                disabled={analyze.isPending}
                size="lg"
                className="bg-orange-600 hover:bg-orange-700"
              >
                {analyze.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    Analyze Repository
                  </>
                )}
              </Button>
              <div className="text-sm text-gray-600">
                <Badge variant="outline" className="mr-2">
                  Branch: {refName}
                </Badge>
                Scans all TypeScript and JavaScript files
              </div>
            </div>

            {/* Placeholder Results */}
            <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">
                Click "Analyze Repository" to scan for refactoring opportunities
              </p>
              <p className="text-xs mt-2 text-gray-400">
                Results will show:
              </p>
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <div>• High priority issues (&gt;300 line files, &gt;50 line functions)</div>
                <div>• Medium priority issues (&gt;200 line files, &gt;30 line functions)</div>
                <div>• Low priority issues (complex conditionals, long strings)</div>
              </div>
            </div>

            {/* Note about implementation */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This feature uses the refactor analyzer library at{' '}
                <code className="bg-yellow-100 px-1 py-0.5 rounded">src/lib/ai/refactor-analyzer.ts</code>.
                A tRPC endpoint will be added to run analysis on GitHub repositories.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-</div>
            <p className="text-xs text-gray-500 mt-1">Critical refactors needed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Medium Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">-</div>
            <p className="text-xs text-gray-500 mt-1">Recommended improvements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">-</div>
            <p className="text-xs text-gray-500 mt-1">Minor optimizations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
