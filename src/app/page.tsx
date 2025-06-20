'use client';

import { ScrollingRepos } from '@/components/ScrollingRepos';
import { motion } from 'framer-motion';

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
        className="max-w-2xl mx-auto px-8 py-16" 
        aria-labelledby="roadmap-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerChildren}
      >
        <div className="text-left max-w-lg mx-auto">
          <motion.h2 
            id="roadmap-heading" 
            className="text-lg font-semibold text-black mb-6 uppercase tracking-wide"
            variants={fadeUpVariants}
          >
            Roadmap
          </motion.h2>
          
          <motion.ul 
            className="space-y-3 text-gray-900"
            variants={staggerChildren}
          >
            {[
              "GitHub repository analysis & insights",
              "Code quality metrics & recommendations",
              "Collaboration analytics & team insights",
              "Performance optimization suggestions",
              "Security vulnerability scanning"
            ].map((item) => (
              <motion.li 
                key={item}
                className="flex items-start"
                variants={fadeUpVariants}
                transition={{ duration: 0.5 }}
              >
                <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0" aria-hidden="true"></span>
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
        
        {/* Footer */}
        <motion.footer 
          className="mt-16 pt-8 border-t border-gray-200 text-center"
          variants={fadeUpVariants}
          transition={{ duration: 0.5 }}
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
