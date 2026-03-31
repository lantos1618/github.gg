'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github } from 'lucide-react';
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
    <section className="bg-[#111] text-white" data-testid="home-cta-section">
      <div className="w-[90%] max-w-[800px] mx-auto py-20">

        {/* Section label */}
        <div className="text-[12px] text-[#666] font-semibold tracking-[1.5px] uppercase mb-4">
          Get Started
        </div>

        <h2 className="text-[26px] font-semibold text-white mb-2">
          Try it now
        </h2>

        <p className="text-[14px] text-[#666] mb-8">
          Paste any public repo and see what you get
        </p>

        <div className="max-w-md mb-6">
          <form onSubmit={handleAnalyze} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]">
              <Github className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="owner/repo"
              data-testid="home-cta-repo-input"
              className="pl-12 pr-24 h-12 text-[15px] bg-transparent text-white placeholder:text-[#555] border-[#444] hover:border-[#888] focus:border-white"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <Button
                size="default"
                type="submit"
                disabled={isAnalyzing}
                data-testid="home-cta-submit-btn"
                className="h-9 px-4 bg-white text-[#111] hover:bg-[#eee] rounded font-medium text-[14px]"
              >
                {isAnalyzing ? '...' : 'Go'}
                {!isAnalyzing && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-[14px] text-[#555] mb-16">
          Free for public repos. <Link href="/pricing" className="text-[#888] hover:text-white transition-colors" data-testid="home-cta-pricing-link">Pricing</Link> for private.
        </p>

        {/* Footer */}
        <div className="pt-4 border-t border-[#222]">
          <table className="w-full text-[14px]">
            <tbody>
              <tr>
                <td className="text-[#555] py-1">&copy; {new Date().getFullYear()} GG</td>
                <td className="text-right">
                  <div className="flex justify-end gap-6">
                    <Link href="/pricing" className="text-[#555] hover:text-[#aaa] transition-colors">Pricing</Link>
                    <a href="https://github.com/lantos1618/github.gg" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#aaa] transition-colors">GitHub</a>
                    <a href="https://twitter.com/github_gg" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#aaa] transition-colors">Twitter</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
