'use client';

import { FaSchool } from 'react-icons/fa';

export const BrandSection = () => {
  const handleLogoClick = () => {
    console.log('Logo clicked - Welcome!');
  };

  const handleSecurityClick = () => {
    console.log('Security status clicked');
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-8">
        {/* Animated School Logo */}
        <div
          className="relative inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-700 to-blue-800 rounded-3xl shadow-xl mb-6 hover:shadow-2xl transition-all duration-500 cursor-pointer group"
          onClick={handleLogoClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <FaSchool className="w-16 h-16 text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-blue-400/0 rounded-3xl group-hover:from-blue-400/20 group-hover:to-blue-400/20 transition-all duration-500"></div>
          <div className="absolute w-full h-full border-2 border-blue-300/0 rounded-3xl group-hover:border-blue-300/50 transition-all duration-700"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
        </div>

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3 relative inline-block">
          School Portal
          <span className="absolute -bottom-2 left-0 w-0 h-1 bg-gradient-to-r from-blue-600 to-gray-600 rounded-full group-hover:w-full transition-all duration-700"></span>
        </h1>

        {/* Animated Divider */}
        <div className="w-32 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-gray-600 mx-auto rounded-full mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
        </div>

        {/* Tagline */}
        <h2 className="text-2xl lg:text-2xl font-bold text-gray-900 mb-3">
          Empowering Education,
          <span className="block text-blue-600 hover:text-blue-700 transition-colors duration-300 cursor-default">
            Together.
          </span>
        </h2>

        {/* Description */}
        <p className="text-gray-700 mt-4 text-lg max-w-md">
          All-in-one platform to connect students, teachers, and parents for a seamless educational experience.
        </p>
      </div>

      {/* Enhanced Secure Connection Indicator */}
      <div
        className="relative group cursor-pointer"
        onClick={handleSecurityClick}
      >
        <div className="relative z-10 px-6 py-4 bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm rounded-xl border border-green-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-300">
          <div className="flex items-center justify-center space-x-3">
            {/* Animated Secure Icon */}
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute -inset-1 border-2 border-green-300/50 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -inset-1 bg-green-300/0 rounded-full group-hover:bg-green-300/20 blur transition-all duration-500"></div>
            </div>

            {/* Text */}
            <div className="text-left">
              <div className="font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                Secure Connection
              </div>
              <div className="text-xs text-green-600 font-medium flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                Active • Encrypted
              </div>
            </div>
          </div>

          {/* Micro progress indicator */}
          <div className="mt-3 w-full h-1 bg-green-50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-300 via-green-400 to-green-500 animate-shimmer-green"></div>
          </div>
        </div>
      </div>
    </div>
  );
};