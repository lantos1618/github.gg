'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
    <section className="py-32 bg-black text-white relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] bg-blue-600/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-1/2 -right-1/4 w-[1000px] h-[1000px] bg-purple-600/30 rounded-full blur-3xl" />
        </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">
            Ready to ship better code?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light">
            Join thousands of developers who use GG to understand their codebases instantly. No signup required to start.
          </p>

          <div className="max-w-md mx-auto">
            <form onSubmit={handleAnalyze} className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">
                <Github className="h-6 w-6" />
              </div>
              <Input
                type="text"
                placeholder="github.com/owner/repo"
                className="pl-14 h-16 text-lg border-white/10 bg-white/5 text-white placeholder:text-gray-600 rounded-2xl focus:border-white/30 focus:ring-0 transition-all duration-300 font-mono"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button 
                  size="lg" 
                  type="submit"
                  disabled={isAnalyzing}
                  className="h-12 px-6 bg-white text-black hover:bg-gray-200 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                >
                  {isAnalyzing ? (
                    <span className="animate-pulse">Analyzing...</span>
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-12 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} GG. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
                <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

