'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';
import { toast } from 'sonner';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function HeroSection() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!repoUrl.trim()) return;

    setIsAnalyzing(true);
    
    // Parse input (supports "owner/repo" or full URLs)
    let target = repoUrl.trim();
    
    // Strip https://github.com/ if present
    target = target.replace(/^https?:\/\/github\.com\//, '');
    // Strip trailing slashes
    target = target.replace(/\/$/, '');
    
    // Validate format owner/repo
    const parts = target.split('/');
    if (parts.length < 2) {
      toast.error('Please enter a valid repository (e.g., facebook/react)');
      setIsAnalyzing(false);
      return;
    }

    // Take only the first two parts (owner/repo) ignoring tree/blob/etc for now
    const cleanPath = `${parts[0]}/${parts[1]}`;
    router.push(`/${cleanPath}`);
  };

  return (
    <div className="relative bg-white overflow-hidden min-h-[80vh] flex flex-col justify-center">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >


          <motion.h1
            className="text-6xl md:text-8xl font-bold text-black mb-8 tracking-tighter leading-[0.9] select-none"
            variants={fadeUpVariants}
          >
            Stop reading code.
            <br />
            <span className="text-gray-400">
              Start understanding.
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-light tracking-wide"
            variants={fadeUpVariants}
          >
            Instant architectural diagrams, quality scores, and AI documentation.
          </motion.p>

          {/* The Value Interface */}
          <motion.div 
            variants={fadeUpVariants}
            className="max-w-xl mx-auto mb-12"
          >
            <form onSubmit={handleAnalyze} className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-black">
                <Github className="h-6 w-6" />
              </div>
              <Input
                type="text"
                placeholder="github.com/owner/repo"
                className="pl-14 h-16 text-lg border-2 border-gray-100 bg-white rounded-2xl focus:border-black focus:ring-0 transition-all duration-300 placeholder:text-gray-300 font-mono shadow-sm group-hover:shadow-md"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button 
                  size="lg" 
                  type="submit"
                  disabled={isAnalyzing}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                >
                  {isAnalyzing ? (
                    <span className="animate-pulse">Analyzing...</span>
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 font-mono">
            <span className="text-gray-300">Try:</span>
            <button onClick={() => { setRepoUrl('facebook/react'); }} className="hover:text-black transition-colors border-b border-transparent hover:border-black">facebook/react</button>
            <button onClick={() => { setRepoUrl('vercel/next.js'); }} className="hover:text-black transition-colors border-b border-transparent hover:border-black">vercel/next.js</button>
            <button onClick={() => { setRepoUrl('lantos1618/github.gg'); }} className="hover:text-black transition-colors border-b border-transparent hover:border-black">this repo</button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
