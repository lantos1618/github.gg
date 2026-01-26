'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight, Github, FileCode2, Network, BarChart3, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
};

// Visual feature cards - varied sizes and emphasis
const valueProps = [
  {
    icon: BarChart3,
    title: "Quality Scores",
    desc: "A-F grades per file",
    accent: "text-orange-600",
    bg: "bg-orange-50 border-orange-100"
  },
  {
    icon: Network,
    title: "Diagrams",
    desc: "Auto-generated maps",
    accent: "text-violet-600",
    bg: "bg-violet-50 border-violet-100"
  },
  {
    icon: BookOpen,
    title: "Wiki",
    desc: "Docs from code",
    accent: "text-teal-600",
    bg: "bg-teal-50 border-teal-100"
  },
  {
    icon: Sparkles,
    title: "Reviews",
    desc: "Catch bugs early",
    accent: "text-rose-600",
    bg: "bg-rose-50 border-rose-100"
  }
];

export function HeroSection() {
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
    <div className="relative bg-white overflow-hidden">
      {/* Subtle dot pattern instead of gradient */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto pt-20 pb-24">

          {/* Main hero content */}
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } }
            }}
          >
            {/* Simple badge - no generic icons */}
            <motion.div
              variants={fadeUpVariants}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 text-sm text-gray-700 mb-8 font-medium"
            >
              Free for public repos · No signup
            </motion.div>

            {/* Main headline - more direct */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5 tracking-tight leading-[1.15]"
              variants={fadeUpVariants}
            >
              Read any repo like you wrote it
            </motion.h1>

            {/* Subheadline - shorter, punchier */}
            <motion.p
              className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
              variants={fadeUpVariants}
            >
              Paste a GitHub URL. Get quality scores, architecture diagrams, and generated docs.
            </motion.p>

            {/* Search input - clean, functional */}
            <motion.div
              variants={fadeUpVariants}
              className="max-w-xl mx-auto mb-6"
            >
              <form onSubmit={handleAnalyze} className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                  <Github className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  placeholder="owner/repo or paste URL"
                  aria-label="GitHub repository URL or path"
                  className="pl-12 pr-28 h-14 text-base border border-gray-200 bg-white rounded-lg focus:border-gray-900 focus:ring-0 transition-colors placeholder:text-gray-400"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    size="default"
                    type="submit"
                    disabled={isAnalyzing}
                    className="h-11 px-5 bg-gray-900 hover:bg-gray-800 text-white rounded-md font-medium"
                  >
                    {isAnalyzing ? (
                      <span>...</span>
                    ) : (
                      <>
                        Go
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Quick examples - inline */}
            <motion.div variants={fadeUpVariants} className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="text-gray-400 py-1">Try</span>
              {[
                { name: 'facebook/react', label: 'react' },
                { name: 'vercel/next.js', label: 'next.js' },
                { name: 'denoland/deno', label: 'deno' },
              ].map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => setRepoUrl(repo.name)}
                  className="px-2.5 py-1 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 font-mono text-xs transition-colors"
                >
                  {repo.label}
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* Value props - horizontal strip */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mt-16"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } }
            }}
          >
            {valueProps.map((prop, idx) => (
              <motion.div
                key={idx}
                variants={fadeUpVariants}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border ${prop.bg}`}
              >
                <prop.icon className={`h-4 w-4 ${prop.accent}`} />
                <span className="font-medium text-gray-900 text-sm">{prop.title}</span>
                <span className="text-gray-400 text-sm hidden sm:inline">·</span>
                <span className="text-gray-500 text-sm hidden sm:inline">{prop.desc}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Simple stat - less generic */}
          <motion.p
            className="mt-12 text-center text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Works with any public GitHub repository
          </motion.p>
        </div>
      </div>
    </div>
  );
}
