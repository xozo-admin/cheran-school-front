// src/components/ui/LoadingSpinner/index.tsx

'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-3',
  xl: 'h-8 w-8 border-3',
};

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-solid border-current border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
};