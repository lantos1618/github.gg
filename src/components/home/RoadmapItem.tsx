import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface RoadmapItemProps {
  title: string;
  description: string;
  completed: boolean;
  index: number;
}

export function RoadmapItem({ title, description, completed, index }: RoadmapItemProps) {
  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
      variants={fadeUpVariants}
    >
      <div className="flex items-start gap-3 mb-3">
        {completed ? (
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-gray-600 ml-9">{description}</p>
    </motion.div>
  );
} 