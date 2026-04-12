'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
}

export const AnimatedCard = ({
  children,
  className = '',
  delay = 0,
  hoverEffect = true,
}: AnimatedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hoverEffect ? { scale: 1.02, transition: { duration: 0.2 } } : {}}
      className={`${className}`}
    >
      {children}
    </motion.div>
  );
};