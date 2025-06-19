'use client';

import { motion } from 'framer-motion';

interface LoadingWaveProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingWave({ 
  size = 'md', 
  color = 'currentColor',
  className = '' 
}: LoadingWaveProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const dots = [0, 1, 2];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {dots.map((index) => (
        <motion.div
          key={index}
          className={`${sizeClasses[size]} rounded-full`}
          style={{ backgroundColor: color }}
          animate={{
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

interface AnimatedTickProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function AnimatedTick({ 
  size = 'sm', 
  color = 'currentColor',
  className = '' 
}: AnimatedTickProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        duration: 0.3
      }}
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.1,
          ease: "easeInOut"
        }}
      />
    </motion.svg>
  );
} 