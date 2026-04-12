// src/components/ui/Card/index.tsx

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  gradient?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
};

export const Card = ({
  children,
  className,
  padding = 'md',
  shadow = 'md',
  border = true,
  gradient = false,
}: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-white',
        border && 'border border-gray-200',
        paddingClasses[padding],
        shadowClasses[shadow],
        gradient && 'bg-gradient-to-br from-white to-gray-50',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mb-4', className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn('text-lg font-semibold text-gray-900', className)}>{children}</h3>
);

export const CardDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn('text-sm text-gray-500', className)}>{children}</p>
);

export const CardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export const CardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mt-6 pt-4 border-t border-gray-200', className)}>{children}</div>
);