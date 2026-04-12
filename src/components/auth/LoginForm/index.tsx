// src/components/auth/LoginForm/index.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { LoginFormFields } from './LoginFormFields';
import { OTPForm } from './OTPForm';
import { LoginData } from '@/types';
// Import toast functions
import {
  toastInfo,
  toastError,
  toastSuccess,
  toastWarning
} from '@/lib/toast';

import { useRouter } from 'next/navigation';

interface LoginFormProps {
  onSubmit?: (data: LoginData) => void;
}

export const LoginForm = ({ onSubmit }: LoginFormProps) => {

  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [loginStep, setLoginStep] = useState<'initial' | 'otp'>('initial');
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const otpTimerStartedRef = useRef(false);

  const resetOtpFlow = () => {
    otpTimerStartedRef.current = false;
    setOtp('');
    setTimeLeft(0);
    setLoginStep('initial');
  };

  const startOtpFlow = () => {
    otpTimerStartedRef.current = true;
    setOtp('');
    setTimeLeft(300);
    setLoginStep('otp');
  };

  // OTP Countdown Timer
  useEffect(() => {
    if (loginStep === 'otp' && otpTimerStartedRef.current && timeLeft === 0) {
      toastError('OTP has expired. Please login again.');
      resetOtpFlow();
    }
  }, [loginStep, timeLeft]);

  useEffect(() => {
    if (loginStep !== 'otp') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [loginStep]);




  const handleSuccessfulLogin = (data: any) => {
    console.log('Login successful:', data);

    if (!data.token) {
      toastError('No token received');
      return;
    }

    toastSuccess(`Welcome back, ${data.user_type}!`);

    console.log("Received session key:", data.session_key);

    const enrichedData = {
      ...data,
      username: data.username || username,
      staff_role: data.staff_role || undefined,
    };

    // Cookie-based login
    login(enrichedData, rememberMe);

    setTimeout(() => {
      if (data.user_type === 'staff') {
        router.push('/staff');
        return;
      }
      router.push(`/${data.user_type}`);
    }, 1500);
  };


  const handleForgotPassword = () => {
    if (!username.trim()) {
      toastWarning('Please enter your username to reset password');
      return;
    }
    toastInfo('Password reset feature coming soon!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading) return;

    setIsLoading(true);
    setApiResponse(null);
    console.log('🚀 Login attempt with:', { username, password });

    // OTP verification step
    if (loginStep === 'otp') {
      if (timeLeft <= 0) {
        toastError('OTP Expired');
        resetOtpFlow();
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔐 Verifying OTP:', { username, otp });
        const response = await api.auth.verifyOtp({ username, otp });
        const data = response.data;

        console.log('✅ OTP verification response:', data);

        const otpVerified =
          !!data.token &&
          !!data.session_key &&
          !!data.user_type;

        if (otpVerified) {
          toastSuccess('OTP verified successfully!');
          handleSuccessfulLogin(data);
        } else {
          const errorMessage = data.error || data.message || 'Invalid OTP';
          toastError(errorMessage);
          console.error('❌ OTP verification failed:', errorMessage);

          // 🔁 Go back to login form
          resetOtpFlow();
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Something went wrong. Please try again.';

        toastError(errorMessage);
        resetOtpFlow();
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Initial login validation
    const newErrors: any = {};

    if (!username.trim()) {
      newErrors.username = 'Please enter your username';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!password.trim()) {
      newErrors.password = 'Please enter your password';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.log('❌ Validation errors:', newErrors);
      setIsLoading(false);

      return;
    }

    try {
      console.log('📡 Sending login request...');
      const response = await api.auth.login({ username, password });
      const data = response.data;

      console.log('📥 Login API response:', data);
      setApiResponse(data);

      const isTwoFactorRequired = data.status === '2FA_REQUIRED';
      const isFinalizedLogin =
        !!data.token &&
        !!data.session_key &&
        !!data.user_type;

      if (isTwoFactorRequired) {
        console.log('🔐 2FA required, switching to OTP step');
        toastInfo('OTP sent successfully. Please enter the 4-digit code.');
        startOtpFlow();
      } else if (isFinalizedLogin) {
        toastSuccess('Login successful!');
        console.log('✅ Login successful, processing...');
        handleSuccessfulLogin(data);
      } else {
        const errorMessage = data.error || data.message || 'Login failed';
        toastError(errorMessage);
        console.error('❌ Login failed:', errorMessage);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';

      toastError(errorMessage);
      console.error('❌ Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={loginStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {loginStep === 'otp' ? (
            <OTPForm
              username={username}
              otp={otp}
              timeLeft={timeLeft}
              isLoading={isLoading}
              onOtpChange={setOtp}
              onBackToLogin={() => {
                setLoginStep('initial');
                setOtp('');
                toastInfo('Returned to login form');
              }}
            />
          ) : (
            <LoginFormFields
              username={username}
              password={password}
              rememberMe={rememberMe}
              errors={errors}
              isLoading={isLoading}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onRememberMeChange={setRememberMe}
              onForgotPassword={handleForgotPassword}
              onShowPasswordToggle={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
            />
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
