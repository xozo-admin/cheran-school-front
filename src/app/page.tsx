// src/app/page.tsx

'use client';

import { useState } from 'react';
import { BackgroundImage, BrandSection, LoginForm } from '@/components';
import { RegistrationDialogsWrapper } from '@/components/auth/RegistrationDialogsWrapper';
import { SUPPORT_EMAIL } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [adminRegistered, setAdminRegistered] = useState<boolean>(true);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);

  const handleAdminSuccess = () => {
    setShowAdminDialog(false);
    setTimeout(() => setShowSchoolDialog(true), 500);
  };

  const handleSchoolSuccess = () => {
    setShowSchoolDialog(false);
    setAdminRegistered(true);
  };

  const handleLoginSubmit = (data: {
    username: string;
    password: string;
    rememberMe: boolean;
  }) => {
  };

  return (
    <>
      <RegistrationDialogsWrapper
        showAdminDialog={showAdminDialog}
        showSchoolDialog={showSchoolDialog}
        onAdminClose={() => setShowAdminDialog(false)}
        onSchoolClose={() => setShowSchoolDialog(false)}
        onAdminSuccess={handleAdminSuccess}
        onSchoolSuccess={handleSchoolSuccess}
      />

      {adminRegistered && (
        <div className="min-h-screen relative overflow-hidden">
          <BackgroundImage />

          <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-4xl">
              <div className="relative">
                {/* Updated gradient with inline colors */}
                <div 
                  className="absolute -inset-4 rounded-3xl blur-3xl opacity-30"
                  style={{
                    background: 'linear-gradient(to right, rgba(37, 99, 235, 0.3), rgba(139, 92, 246, 0.3))'
                  }}
                ></div>

                <div className="relative backdrop-blur-md bg-white/95 rounded-2xl shadow-2xl overflow-hidden border border-white/40">
                  {/* Updated color stripes with inline colors */}
                  <div className="h-3 flex">
                    <div className="flex-1" style={{ backgroundColor: '#1158f2' }}></div>
                    <div className="flex-1" style={{ backgroundColor: '#525151' }}></div>
                    <div className="flex-1" style={{ backgroundColor: '#2563eb' }}></div>
                    <div className="flex-1" style={{ backgroundColor: '#525151' }}></div>
                    <div className="flex-1" style={{ backgroundColor: '#2563eb' }}></div>
                  </div>

                  <div className="p-5 sm:p-8 lg:p-12">
                    <div className="sm:hidden flex flex-col items-center text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-3 overflow-hidden">
                        <Image
                          src="/app_logo.jpeg"
                          alt="App Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          priority
                        />
                      </div>
                      <h1 className="text-xl font-bold text-gray-900">School Portal</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                      <div className="hidden sm:block">
                        <BrandSection />
                      </div>
                      
                      <div className="border-l-0 lg:border-l lg:border-gray-300 pl-0 lg:pl-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                            Welcome Back
                          </h2>
                        </div>

                        <LoginForm onSubmit={handleLoginSubmit} />
                        

                        <div className="hidden sm:block mt-8 pt-6 border-t border-gray-300">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">
                              Need help?{' '}
                              <a
                                href={`mailto:${SUPPORT_EMAIL}`}
                                className="font-medium hover:text-blue-800 transition-colors"
                                style={{ color: '#2563eb' }}
                              >
                                Contact School IT Support
                              </a>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              © {new Date().getFullYear()} School Management System
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
