'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

export function CallToAction() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!repoUrl.trim()) return;

    setIsAnalyzing(true);

    let target = repoUrl.trim();
    target = target.replace(/^https?:\/\/github\.com\//, '');
    target = target.replace(/\/$/, '');

    const parts = target.split('/');
    if (parts.length < 2) {
      toast.error('Please enter a valid repository (e.g., facebook/react)');
      setIsAnalyzing(false);
      return;
    }

    const cleanPath = `${parts[0]}/${parts[1]}`;
    router.push(`/${cleanPath}`);
  };

  return (
    <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm mb-8">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Join 10,000+ developers</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Ready to understand your codebase?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            Stop reading code line by line. Get instant insights, diagrams, and documentation.
          </p>

          <div className="max-w-lg mx-auto mb-8">
            <form onSubmit={handleAnalyze} className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Github className="h-5 w-5" />
              </div>
              <Input
                type="text"
                placeholder="github.com/owner/repo"
                className="pl-12 pr-32 h-14 text-base border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl focus:border-white/30 focus:ring-0"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                  size="default"
                  type="submit"
                  disabled={isAnalyzing}
                  className="h-10 px-5 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  {isAnalyzing ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          <p className="text-sm text-gray-500">
            Free for public repos. <Link href="/pricing" className="text-white hover:underline">See pricing</Link> for private repos.
          </p>
        </motion.div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} GG. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="https://github.com/lantos1618/github.gg" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://twitter.com/github_gg" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </section>
  );
}
