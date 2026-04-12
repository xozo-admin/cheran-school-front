// src/components/ui/Button.tsx

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  animated?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  icon,
  animated = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const baseClasses = 'font-semibold py-3.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    gradient: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]';

  const ButtonContent = (
    <button
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span>Loading...</span>
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {ButtonContent}
      </motion.div>
    );
  }

  return ButtonContent;
};