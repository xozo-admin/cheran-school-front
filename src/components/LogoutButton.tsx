// components/LogoutButton.tsx
'use client';

import { FiLogOut } from 'react-icons/fi';
import { clearAllCookies } from '@/lib/auth';

export const LogoutButton = () => {
  const handleLogout = () => {
    clearAllCookies();
    localStorage.clear();
    
    // Redirect to login page
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      <FiLogOut />
      <span>Logout</span>
    </button>
  );
};
