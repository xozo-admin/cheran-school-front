'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { FaBars, FaTimes } from 'react-icons/fa';

interface MobileSidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MobileSidebarToggle({ isOpen, onClick }: MobileSidebarToggleProps) {
  const { theme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-lg shadow-lg transition-all duration-200
        ${theme === 'dark' 
          ? 'bg-gray-800 text-white hover:bg-gray-700' 
          : 'bg-white text-gray-800 hover:bg-gray-100'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500
      `}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      {isOpen ? (
        <FaTimes className="w-5 h-5" />
      ) : (
        <FaBars className="w-5 h-5" />
      )}
    </button>
  );
}