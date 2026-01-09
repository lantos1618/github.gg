'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github, Sparkles, CheckCircle, Users, FileSearch, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';

export default function HirePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    // Clean the username (remove @ if present, handle URLs)
    let cleanUsername = username.trim();
    cleanUsername = cleanUsername.replace(/^@/, '');
    cleanUsername = cleanUsername.replace(/^https?:\/\/github\.com\//, '');
    cleanUsername = cleanUsername.split('/')[0]; // Just get the username part

    router.push(`/hire/${cleanUsername}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 text-sm text-gray-600 mb-6">
            For recruiters, hiring managers, and accelerators
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Verify developer skills before you hire
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            Paste a GitHub username. Get a skills assessment, AI-code detection, and interview questions in 30 seconds.
          </p>

          {/* Search */}
          <form onSubmit={handleAnalyze} className="max-w-md mx-auto mb-8">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Github className="h-5 w-5" />
              </div>
              <Input
                type="text"
                placeholder="GitHub username"
                className="pl-12 pr-28 h-12 text-base border border-gray-200 bg-white rounded-md focus:border-gray-900 focus:ring-0"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <Button
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded font-medium text-sm"
                >
                  {isLoading ? '...' : 'Analyze'}
                  {!isLoading && <ArrowRight className="h-4 w-4 ml-1.5" />}
                </Button>
              </div>
            </div>
          </form>

          <p className="text-sm text-gray-400 mb-6">
            Free for public profiles. Works with any GitHub account.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/hire/match">
              <Button className="text-sm bg-violet-600 hover:bg-violet-700">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Job Matching
              </Button>
            </Link>
            <Link href="/hire/search">
              <Button variant="outline" className="text-sm">
                <Search className="h-4 w-4 mr-2" />
                Search all candidates
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-8">
            What you get
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-gray-900">AI Workflow Analysis</h3>
              </div>
              <p className="text-sm text-gray-500 pl-8">
                Understand how they work with AI tools. See coding patterns and collaboration style.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-gray-900">Profile Confidence</h3>
              </div>
              <p className="text-sm text-gray-500 pl-8">
                How well does their GitHub represent their true skills? Flags suspicious patterns.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-2">
                <FileSearch className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-gray-900">Skills Assessment</h3>
              </div>
              <p className="text-sm text-gray-500 pl-8">
                Scored skills based on actual code analysis. Not just what they claim.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-2">
                <MessageSquare className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-gray-900">Interview Questions</h3>
              </div>
              <p className="text-sm text-gray-500 pl-8">
                Targeted questions based on weak spots and AI-suspected code sections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Use cases */}
      <div className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-8">
            Who uses this
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Hiring Managers</h3>
              <p className="text-sm text-gray-500">
                Verify candidates before the interview
              </p>
            </div>

            <div>
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FileSearch className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Accelerators</h3>
              <p className="text-sm text-gray-500">
                Evaluate technical founders at scale
              </p>
            </div>

            <div>
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Github className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Recruiters</h3>
              <p className="text-sm text-gray-500">
                Screen candidates before presenting to clients
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-3">
            Need to analyze multiple candidates?
          </h2>
          <p className="text-gray-400 mb-6 text-sm">
            Batch processing for cohorts and hiring pipelines. Contact us for team pricing.
          </p>
          <a
            href="mailto:hello@github.gg?subject=Batch%20hiring%20analysis"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Contact for batch pricing
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
