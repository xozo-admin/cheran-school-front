import { InputHTMLAttributes } from 'react';
import { FaCheck } from 'react-icons/fa';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = ({ label, checked, onChange, className = '', ...props }: CheckboxProps) => {
  return (
    <label className="flex items-center space-x-2 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
        <div className={`w-5 h-5 border rounded transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400'} ${className}`}>
          {checked && <FaCheck className="w-3 h-3 text-white absolute top-1 left-1" />}
        </div>
      </div>
      <span className="text-sm text-gray-700 hover:text-gray-900">{label}</span>
    </label>
  );
};