'use client';

import { motion } from 'framer-motion';
import { RoadmapItem } from './RoadmapItem';

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

interface RoadmapItem {
  title: string;
  description: string;
  completed: boolean;
}

interface RoadmapSectionProps {
  items: RoadmapItem[];
}

export function RoadmapSection({ items }: RoadmapSectionProps) {
  return (
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
          {items.map((item, index) => (
            <RoadmapItem
              key={index}
              title={item.title}
              description={item.description}
              completed={item.completed}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
} 