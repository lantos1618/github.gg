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
    title: "GitHub repository analysis & insights",
    description: "Deep dive into repository structure, commits, and activity patterns",
    completed: true
  },
  {
    title: "Code quality metrics & recommendations", 
    description: "Analyze code complexity, maintainability, and suggest improvements",
    completed: false
  },
  {
    title: "Collaboration analytics & team insights",
    description: "Track team contributions, review patterns, and collaboration metrics",
    completed: false
  },
  {
    title: "Performance optimization suggestions",
    description: "Identify performance bottlenecks and optimization opportunities",
    completed: false
  },
  {
    title: "Security vulnerability scanning",
    description: "Scan for security issues, dependency vulnerabilities, and best practices",
    completed: false
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative flex items-center justify-center min-h-[80vh] p-8">
        <ScrollingRepos />
        <motion.div 
          className="relative z-10 max-w-2xl mx-auto text-center bg-gray-50/20 backdrop-blur-sm p-12 rounded-2xl shadow-lg border border-gray-100/30"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.h1 
            className="text-6xl font-bold text-black mb-8 tracking-tight"
            variants={fadeUpVariants}
            transition={{ duration: 0.5 }}
          >
            github.gg
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-900 leading-relaxed"
            variants={fadeUpVariants}
            transition={{ duration: 0.5 }}
          >
            We&apos;re building something amazing. 
            <br />
            Stay tuned.
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
