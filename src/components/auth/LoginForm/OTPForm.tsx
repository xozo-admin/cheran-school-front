// src/components/auth/LoginForm/OTPForm.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { FaArrowRight, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface OTPFormProps {
  username: string;
  otp: string;
  timeLeft: number;
  isLoading: boolean;
  onOtpChange: (otp: string) => void;
  onBackToLogin: () => void;
}

export const OTPForm = ({
  username,
  otp,
  timeLeft,
  isLoading,
  onOtpChange,
  onBackToLogin,
}: OTPFormProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [otpStatus, setOtpStatus] = useState<'empty' | 'valid' | 'invalid'>('empty');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format time left as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Focus on OTP input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Real-time OTP validation
  useEffect(() => {
    if (otp.length === 0) {
      setOtpStatus('empty');
    } else if (otp.length === 4 && /^\d+$/.test(otp)) {
      setOtpStatus('valid');
    } else {
      setOtpStatus('invalid');
    }
  }, [otp]);

  const getOtpStatusIcon = () => {
    switch (otpStatus) {
      case 'valid':
        return <FaCheckCircle style={{ color: '#10b981', marginLeft: '8px' }} />;
      case 'invalid':
        return <FaTimesCircle style={{ color: '#ef4444', marginLeft: '8px' }} />;
      default:
        return null;
    }
  };

  const getOtpStatusText = () => {
    switch (otpStatus) {
      case 'valid':
        return 'Valid OTP format';
      case 'invalid':
        return 'Must be 4 digits (0-9)';
      default:
        return 'Enter 4-digit code';
    }
  };

  // Get border color based on status
  const getBorderColor = () => {
    switch (otpStatus) {
      case 'valid':
        return '#10b981';
      case 'invalid':
        return '#ef4444';
      default:
        return '#d1d5db';
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ textAlign: 'center', marginBottom: '32px' }}
      >
        <p style={{ 
          color: '#4b5563', 
          fontSize: '14px', 
          marginBottom: '4px' 
        }}>
          Enter the 4-digit code sent to
        </p>
        <p style={{ 
          color: '#1f2937', 
          fontWeight: 600, 
          fontSize: '16px',
          wordBreak: 'break-all'
        }}>
          xozo@gmail.com
        </p>
      </motion.div>

      {/* Timer Display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          padding: '8px 16px',
          backgroundColor: timeLeft <= 60 ? '#fee2e2' : '#f3f4f6',
          borderRadius: '9999px',
          width: 'fit-content',
          margin: '0 auto 20px'
        }}
      >
        <FaClock style={{ 
          color: timeLeft <= 60 ? '#ef4444' : '#6b7280',
          fontSize: '14px'
        }} />
        <span style={{ 
          fontSize: '14px',
          fontWeight: 600,
          color: timeLeft <= 60 ? '#ef4444' : '#374151'
        }}>
          {formatTime(timeLeft)}
        </span>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* OTP Input with Real-time Feedback */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '0.35em',
                height: '48px',
                padding: '8px 12px',
                width: '100%',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: getBorderColor(),
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: otpStatus === 'valid' ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 
                           otpStatus === 'invalid' ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 
                           'none'
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    onOtpChange(value);
                  }}
                  placeholder="• • • •"
                  disabled={isLoading}
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    letterSpacing: '0.35em',
                    color: otp.length === 4 ? '#1f2937' : '#9ca3af',
                    border: 'none',
                    opacity: isLoading ? 0.5 : 1,
                    cursor: isLoading ? 'not-allowed' : 'text'
                  }}
                  autoFocus
                />
              </div>
              
              {/* OTP Status Indicator */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginTop: '12px',
                fontSize: '13px'
              }}>
                <span style={{ 
                  color: otpStatus === 'valid' ? '#10b981' : 
                         otpStatus === 'invalid' ? '#ef4444' : 
                         '#6b7280',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {getOtpStatusIcon()}
                  <span style={{ marginLeft: otpStatus !== 'empty' ? '4px' : '0' }}>
                    {getOtpStatusText()}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Verify Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: '8px' }}
        >
          <button
            type="submit"
            disabled={isLoading || otp.length !== 4 || otpStatus !== 'valid'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              height: '44px',
              fontSize: '14px',
              fontWeight: 600,
              width: '100%',
              background: otpStatus === 'valid' ? 
                'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0 24px',
              cursor: otpStatus === 'valid' && !isLoading ? 'pointer' : 'not-allowed',
              opacity: otpStatus === 'valid' ? 1 : 0.7,
              transition: 'all 0.3s ease',
              boxShadow: otpStatus === 'valid' ? 
                '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)' : 
                'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <span style={{ 
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify OTP</span>
                <motion.div
                  animate={{ 
                    x: isHovered ? 5 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <FaArrowRight />
                </motion.div>
              </>
            )}
          </button>
        </motion.div>

        {/* Back to Login */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ 
            textAlign: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <button
            type="button"
            onClick={onBackToLogin}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#4b5563',
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            className="group"
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#1f2937';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#4b5563';
              }
            }}
          >
            <motion.svg 
              style={{ 
                width: '14px', 
                height: '14px',
                transition: 'transform 0.2s ease'
              }}
              className="group-hover:-translate-x-1"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </motion.svg>
            <span style={{ fontWeight: 500 }}>Back to login</span>
          </button>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
