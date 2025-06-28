'use client';

import { ScrollingRepos } from '@/components/ScrollingRepos';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect, useState } from 'react';

// Use environment variables for GitHub App config (must be NEXT_PUBLIC_ to be available client-side)
const GITHUB_APP_ID = Number(process.env.NEXT_PUBLIC_GITHUB_APP_ID) || 1475386; // Your GitHub App ID
const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg-dev'; // Your GitHub App slug

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const roadmapItems = [
  {
    title: "GitHub OAuth Authentication",
    description: "Secure user authentication and session management via GitHub",
    completed: true
  },
  {
    title: "Repository File Browsing", 
    description: "Browse and view files from GitHub repositories with intelligent filtering",
    completed: true
  },
  {
    title: "File Content Viewing",
    description: "Display formatted code content with copy functionality",
    completed: true
  },
  {
    title: "GitHub App Integration",
    description: "Migrate to GitHub Apps for better integration and higher rate limits",
    completed: false
  },
  {
    title: "Webhook & Real-time Analysis",
    description: "Automated code analysis triggered by GitHub events",
    completed: false
  },
  {
    title: "Automated GitHub Comments",
    description: "Bot comments on PRs with code quality insights and suggestions",
    completed: false
  },
  {
    title: "Intelligent Documentation Generation",
    description: "Auto-generate comprehensive wikis and documentation from codebases",
    completed: false
  },
  {
    title: "Git Visualization & Diagrams",
    description: "Interactive diagrams for repository structure, history, and code evolution",
    completed: false
  },
  {
    title: "Repository Analysis & Insights",
    description: "Deep dive into repository structure, commits, and activity patterns",
    completed: false
  },
  {
    title: "Developer Profile Analytics",
    description: "Skill assessment, technology stack analysis, and contribution patterns",
    completed: false
  },
  {
    title: "Hiring Intelligence Tools",
    description: "Candidate comparison, skill matching, and automated screening for recruiters",
    completed: false
  },
  {
    title: "Startup & Team Evaluation",
    description: "Technical debt assessment, scalability indicators, and risk analysis",
    completed: false
  },
  {
    title: "Code Quality Metrics & Recommendations", 
    description: "Analyze code complexity, maintainability, and suggest improvements",
    completed: false
  },
  {
    title: "Collaboration Analytics & Team Insights",
    description: "Track team contributions, review patterns, and collaboration metrics",
    completed: false
  },
  {
    title: "Performance Optimization Suggestions",
    description: "Identify performance bottlenecks and optimization opportunities",
    completed: false
  },
  {
    title: "Security Vulnerability Scanning",
    description: "Scan for security issues, dependency vulnerabilities, and best practices",
    completed: false
  }
];

export default function Home() {
  const { isSignedIn, isLoading, user, signIn } = useAuth();
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [hasInstallation, setHasInstallation] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && user) {
      setCheckingInstall(true);
      // Check if the user has the GitHub App installed
      fetch('/api/auth/check-installation')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          setHasInstallation(data.hasInstallation);
        })
        .catch(() => setError('Failed to check GitHub App installation.'))
        .finally(() => setCheckingInstall(false));
    }
  }, [isSignedIn, user]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative flex items-center justify-center min-h-[80vh] p-8">
        <ScrollingRepos className="translate-y-40" />
        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center bg-gray-50/30 backdrop-blur-xl p-12 rounded-2xl shadow-lg border border-gray-200/50"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.h1
            className="text-6xl font-bold text-black mb-6 tracking-tight"
            variants={fadeUpVariants}
            transition={{ duration: 0.5 }}
          >
            github.gg
          </motion.h1>

          <motion.p
            className="text-2xl font-medium text-gray-900"
            variants={fadeUpVariants}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            The missing intelligence layer for GitHub.
          </motion.p>
          <motion.p
            className="text-lg text-gray-700 mt-4 max-w-xl mx-auto"
            variants={fadeUpVariants}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Analyze, visualize, and understand your repositories like never
            before.
          </motion.p>
        </motion.div>
      </div>

      {/* Roadmap Section */}
      <div className="py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Roadmap
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {roadmapItems.map((item, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
                variants={fadeUpVariants}
              >
                <div className="flex items-start gap-3 mb-3">
                  {item.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                </div>
                <p className="text-gray-600 ml-9">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
