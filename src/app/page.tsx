'use client';

import { ScrollingRepos } from '@/components/ScrollingRepos';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

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
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative flex items-center justify-center min-h-[80vh] p-8">
        <ScrollingRepos className="translate-y-40" />
        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center bg-gray-50/20 backdrop-blur-lg p-12 rounded-2xl shadow-lg border border-gray-100/30"
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
      <motion.section 
        className="max-w-4xl mx-auto px-8 py-16" 
        aria-labelledby="roadmap-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerChildren}
      >
        <div className="text-center mb-12">
          <motion.h2 
            id="roadmap-heading" 
            className="text-3xl font-bold text-black mb-4"
            variants={fadeUpVariants}
          >
            Roadmap
          </motion.h2>
          <motion.p 
            className="text-gray-600 text-lg"
            variants={fadeUpVariants}
          >
            Our journey to revolutionize GitHub analytics
          </motion.p>
        </div>
        
        <motion.div 
          className="space-y-6"
          variants={staggerChildren}
        >
          {roadmapItems.map((item, index) => (
            <motion.div 
              key={item.title}
              className={`flex items-start p-6 rounded-xl border transition-all duration-300 ${
                item.completed 
                  ? 'bg-green-50 border-green-200 shadow-sm' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              variants={fadeUpVariants}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex-shrink-0 mr-4 mt-1">
                {item.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  item.completed ? 'text-green-800' : 'text-gray-900'
                }`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${
                  item.completed ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {item.description}
                </p>
              </div>
              {item.completed && (
                <div className="flex-shrink-0 ml-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Completed
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
        
        {/* Progress Summary */}
        <motion.div 
          className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Progress</h3>
            <span className="text-2xl font-bold text-blue-600">
              {roadmapItems.filter(item => item.completed).length}/{roadmapItems.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(roadmapItems.filter(item => item.completed).length / roadmapItems.length) * 100}%` 
              }}
            ></div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.footer 
          className="mt-16 pt-8 border-t border-gray-200 text-center"
          variants={fadeUpVariants}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <p className="text-gray-900">
            Ready to level up your GitHub game? 
            <br />
            <span className="text-black font-medium">Coming soon to a repository near you.</span>
          </p>
        </motion.footer>
      </motion.section>
    </main>
  );
}
