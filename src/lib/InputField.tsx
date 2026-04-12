// src/components/ui/InputField.tsx

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

export const InputField = ({
  label,
  error,
  icon,
  rightIcon,
  containerClassName = '',
  className = '',
  ...props
}: InputFieldProps) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-3.5 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
            icon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};