'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github } from 'lucide-react';
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
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Try it now
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Paste any public repo and see what you get.
          </p>

          <div className="max-w-md mx-auto mb-6">
            <form onSubmit={handleAnalyze} className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Github className="h-5 w-5" />
              </div>
              <Input
                type="text"
                placeholder="owner/repo"
                className="pl-12 pr-24 h-12 text-base border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 rounded-md focus:border-gray-500 focus:ring-0"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <Button
                  size="default"
                  type="submit"
                  disabled={isAnalyzing}
                  className="h-9 px-4 bg-white text-gray-900 hover:bg-gray-100 rounded font-medium text-sm"
                >
                  {isAnalyzing ? '...' : 'Go'}
                  {!isAnalyzing && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              </div>
            </form>
          </div>

          <p className="text-sm text-gray-500">
            Free for public repos. <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link> for private.
          </p>
        </motion.div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} GG</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
            <a href="https://github.com/lantos1618/github.gg" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">GitHub</a>
            <a href="https://twitter.com/github_gg" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </section>
  );
}
