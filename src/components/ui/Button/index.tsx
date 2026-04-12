// src/components/ui/Button/index.tsx

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { LoadingSpinner } from '../LoadingSpinner';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Omit standard button props that conflict with MotionProps
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 
  'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  icon?: ReactNode;
  animated?: boolean;
  pulse?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md border-transparent',
  secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white shadow-sm hover:shadow-md border-transparent',
  outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs rounded-sm',
  sm: 'px-3 py-1.5 text-sm rounded',
  md: 'px-4 py-2.5 text-sm rounded-md',
  lg: 'px-5 py-3 text-base rounded-lg',
  xl: 'px-6 py-3.5 text-lg rounded-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  icon,
  animated = true,
  pulse = false,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const baseClasses = 'font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    pulse && 'animate-pulse',
    className
  );

  const finalLeftIcon = icon || leftIcon;

  const content = (
    <>
      {isLoading && <LoadingSpinner size={size} />}
      {!isLoading && finalLeftIcon}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {!isLoading && rightIcon}
    </>
  );

  if (animated) {
    // Cast props to MotionProps
    const motionProps = props as MotionProps;
    
    return (
      <motion.button
        className={buttonClasses}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...motionProps}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};