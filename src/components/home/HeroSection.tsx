'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight, Github, FileCode2, Network, BarChart3, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Visual feature cards that show what you get
const valueProps = [
  {
    icon: BarChart3,
    title: "Code Quality Scores",
    desc: "Instant A-F grades for any file",
    color: "bg-blue-500"
  },
  {
    icon: Network,
    title: "Architecture Diagrams",
    desc: "Auto-generated visual maps",
    color: "bg-purple-500"
  },
  {
    icon: BookOpen,
    title: "AI Documentation",
    desc: "Wiki pages from your code",
    color: "bg-emerald-500"
  },
  {
    icon: Sparkles,
    title: "AI Code Reviews",
    desc: "Find bugs before production",
    color: "bg-amber-500"
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
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto pt-16 pb-20">

          {/* Main hero content */}
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {/* Trust badge */}
            <motion.div
              variants={fadeUpVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 text-sm text-gray-600 mb-8"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Free for public repos</span>
              <span className="text-gray-300">|</span>
              <span>No signup required</span>
            </motion.div>

            {/* Main headline - clear value prop */}
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-black mb-6 tracking-tight leading-[1.1]"
              variants={fadeUpVariants}
            >
              Understand any GitHub repo
              <br />
              <span className="text-gray-400">in seconds, not hours</span>
            </motion.h1>

            {/* Subheadline - what you get */}
            <motion.p
              className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto font-normal leading-relaxed"
              variants={fadeUpVariants}
            >
              Paste a repo URL and instantly get <span className="text-black font-medium">quality scores</span>, <span className="text-black font-medium">architecture diagrams</span>, and <span className="text-black font-medium">AI-generated docs</span>.
            </motion.p>

            {/* Search input - main CTA */}
            <motion.div
              variants={fadeUpVariants}
              className="max-w-2xl mx-auto mb-6"
            >
              <form onSubmit={handleAnalyze} className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-black z-10">
                  <Github className="h-6 w-6" />
                </div>
                <Input
                  type="text"
                  placeholder="Paste any GitHub URL or owner/repo"
                  className="pl-14 pr-36 h-16 text-lg border-2 border-gray-200 bg-white rounded-2xl focus:border-black focus:ring-0 transition-all duration-300 placeholder:text-gray-400 shadow-sm hover:shadow-md hover:border-gray-300"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    size="lg"
                    type="submit"
                    disabled={isAnalyzing}
                    className="h-12 px-6 bg-black hover:bg-gray-800 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  >
                    {isAnalyzing ? (
                      <span className="animate-pulse">Analyzing...</span>
                    ) : (
                      <>
                        Analyze
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Quick examples */}
            <motion.div variants={fadeUpVariants} className="flex flex-wrap justify-center gap-3 text-sm mb-16">
              <span className="text-gray-400">Try:</span>
              {[
                { name: 'facebook/react', label: 'React' },
                { name: 'vercel/next.js', label: 'Next.js' },
                { name: 'microsoft/vscode', label: 'VS Code' },
              ].map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => setRepoUrl(repo.name)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                >
                  {repo.label}
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* Value props grid - what you actually get */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
            }}
          >
            {valueProps.map((prop, idx) => (
              <motion.div
                key={idx}
                variants={fadeUpVariants}
                className="group p-5 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl ${prop.color} flex items-center justify-center mb-3`}>
                  <prop.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{prop.title}</h3>
                <p className="text-sm text-gray-500">{prop.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-sm text-gray-400 mb-4">Trusted by developers analyzing</p>
            <div className="flex justify-center items-center gap-8 text-gray-300">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5" />
                <span className="text-lg font-semibold text-gray-600">50K+</span>
                <span className="text-sm text-gray-400">repos analyzed</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
