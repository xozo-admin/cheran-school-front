// src/components/ui/InputField/index.tsx

'use client';

import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'outline';

export interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: InputSize; // Changed to inputSize to avoid conflict
  variant?: InputVariant;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm rounded',
  md: 'px-4 py-3 text-base rounded-md',
  lg: 'px-5 py-4 text-lg rounded-lg',
};

// Update the variantClasses in InputField component:
const variantClasses: Record<InputVariant, string> = {
  default: 'bg-white border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
  filled: 'bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
  outline: 'bg-transparent border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
};

export const InputField = ({
  label,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  inputSize = 'md', // Changed to inputSize
  variant = 'default',
  type = 'text',
  showPasswordToggle = false,
  containerClassName,
  className,
  ...props
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle && type === 'password' 
    ? (showPassword ? 'text' : 'password') 
    : type;

  const hasError = !!error;
  const hasSuccess = !!success && !hasError;

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          type={inputType}
          className={cn(
            'w-full border focus:outline-none focus:ring-2 transition-colors',
            sizeClasses[inputSize], // Changed to inputSize
            variantClasses[variant],
            hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            hasSuccess && 'border-green-300 focus:border-green-500 focus:ring-green-500',
            leftIcon && 'pl-10',
            (rightIcon || showPasswordToggle || hasError || hasSuccess) && 'pr-10',
            className
          )}
          {...props}
        />
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {hasSuccess && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {hasError && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              tabIndex={-1}
              disabled={props.disabled}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
          {rightIcon && !showPasswordToggle && !hasError && !hasSuccess && (
            <div className="text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
      </div>
      
      {(error || success || hint) && (
        <p className={cn(
          'text-sm',
          error && 'text-red-600',
          success && 'text-green-600',
          hint && !error && !success && 'text-gray-500'
        )}>
          {error || success || hint}
        </p>
      )}
    </div>
  );
};