// src/components/layout/BrandSection.tsx

'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import Image from 'next/image';

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
        {/* Animated School Logo with inline colors */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="relative inline-flex items-center justify-center w-28 h-28 rounded-3xl shadow-xl mb-6 cursor-pointer group overflow-hidden"
          onClick={handleLogoClick}
        >
          <Image
            src="/app_logo1.png"
            alt="App Logo"
            fill
            className="object-cover transition-all duration-500 group-hover:scale-110"
            priority
          />
          <div className="absolute inset-0 rounded-3xl transition-all duration-500 group-hover:bg-blue-400/10"></div>
          <div className="absolute w-full h-full border-2 rounded-3xl transition-all duration-700 group-hover:border-blue-300/50"></div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ backgroundColor: '#34d399' }}
          />
        </motion.div>

        {/* Title with inline color accents */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3 relative inline-block"
        >
          School Portal
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute -bottom-2 left-0 h-1 rounded-full"
            style={{
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)'
            }}
          />
        </motion.h1>

        {/* Animated Divider with inline colors */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '8rem' }}
          transition={{ delay: 0.3, duration: 1 }}
          className="h-1 mx-auto rounded-full mb-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(to right, #3b82f6, #a78bfa, #8b5cf6)'
          }}
        >
          <div className="absolute inset-0 animate-shimmer" style={{
            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent)'
          }}></div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl lg:text-2xl font-bold text-gray-900 mb-3">
            Empowering Education,
            <motion.span
              className="block cursor-default"
              animate={{ 
                color: ['#1e40af', '#1e3a8a', '#1e40af']
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Together.
            </motion.span>
          </h2>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-700 mt-4 text-lg max-w-md"
        >
          The all-in-one platform to connect students, teachers, and parents for a seamless educational experience.
        </motion.p>
      </div>

      {/* Enhanced Secure Connection Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        className="relative cursor-pointer"
        onClick={handleSecurityClick}
      >
        <div className="relative z-10 px-6 py-4 bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300"
          style={{ borderColor: '#d1fae5' }}
        >
          <div className="flex items-center justify-center space-x-3">
            {/* Animated Secure Icon */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="relative"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'
                }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -inset-1 border-2 rounded-full animate-ping opacity-75"
                style={{ borderColor: '#6ee7b7' }}
              ></div>
            </motion.div>

            {/* Text */}
            <div className="text-left">
              <div className="font-medium text-gray-800">
                Secure Connection
              </div>
              <div className="text-xs font-medium flex items-center"
                style={{ color: '#059669' }}
              >
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: '#34d399' }}
                />
                Active • Encrypted
              </div>
            </div>
          </div>

          {/* Micro progress indicator */}
          <div className="mt-3 w-full h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: '#ecfdf5' }}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="h-full"
              style={{
                background: 'linear-gradient(to right, #6ee7b7, #34d399, #10b981)'
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
