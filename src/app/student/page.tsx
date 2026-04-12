// app/student/page.tsx
'use client';

import { StudentMainContent } from '@/components/dashboard/student';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import { studentApi } from '@/lib/api';

export default function StudentDashboardPage() {
  const {  logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const profileResponse = await studentApi.profile.get();
      const profilePayload = profileResponse.data?.data || profileResponse.data;
      setProfileData(profilePayload || null);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      if (err?.response?.status === 401) {
        logout();
        router.push('/');
        return;
      }
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if ( loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchProfileData}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

 

  return <StudentMainContent profileData={profileData} />;
}
