// src/components/auth/LoginForm/OTPForm.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface OTPFormProps {
  username: string;
  otp: string;
  timeLeft: number;
  isLoading: boolean;
  onOtpChange: (otp: string) => void;
  onBackToLogin: () => void;
}

const OTP_LENGTH = 4;

export const OTPForm = ({
  username,
  otp,
  timeLeft,
  isLoading,
  onOtpChange,
  onBackToLogin,
}: OTPFormProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isComplete = otp.length === OTP_LENGTH;
  const isValid = isComplete && /^\d{4}$/.test(otp);
  const isInvalid = otp.length > 0 && !isValid;
  const isExpiringSoon = timeLeft <= 60;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const maskDestination = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) return 'your registered account';

    if (!trimmedValue.includes('@')) return trimmedValue;

    const [name, domain] = trimmedValue.split('@');
    const visibleName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name.slice(0, 1)}***`;

    return `${visibleName}@${domain}`;
  };

  const handleOtpChange = (value: string) => {
    onOtpChange(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const statusContent = () => {
    if (isValid) {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: 'Code ready to verify',
        className: 'text-emerald-600',
      };
    }

    if (isInvalid) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        text: `Enter all ${OTP_LENGTH} digits`,
        className: 'text-red-600',
      };
    }

    return {
      icon: <ShieldCheck className="h-4 w-4" />,
      text: `Enter the ${OTP_LENGTH}-digit security code`,
      className: 'text-gray-500',
    };
  };

  const status = statusContent();

  return (
    <div className="py-2 sm:py-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        

        <div className="mt-5 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-sm ring-1 ring-gray-200">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-gray-500">
              Code sent to
            </p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {maskDestination(username)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-700">Security code</p>
          <div
            className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
              isExpiringSoon
                ? 'bg-red-50 text-red-700 ring-red-100'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            }`}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div
          className={`mt-3 rounded-lg border bg-white p-3 transition-all ${
            isValid
              ? 'border-emerald-300 ring-4 ring-emerald-50'
              : isInvalid
                ? 'border-red-300 ring-4 ring-red-50'
                : isFocused
                  ? 'border-blue-400 ring-4 ring-blue-50'
                  : 'border-gray-200'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const digit = otp[index];
              const isActive = isFocused && otp.length === index;

              return (
                <div
                  key={index}
                  className={`flex aspect-square min-h-[52px] items-center justify-center rounded-md border text-xl font-semibold transition-all sm:min-h-[58px] sm:text-2xl ${
                    digit
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                      : isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                >
                  {digit || ''}
                </div>
              );
            })}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={otp}
            onChange={(e) => handleOtpChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPaste={(e) => {
              e.preventDefault();
              handleOtpChange(e.clipboardData.getData('text'));
            }}
            disabled={isLoading}
            maxLength={OTP_LENGTH}
            pattern="[0-9]*"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="One-time password"
            className="sr-only"
          />
        </div>

        <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${status.className}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>

        <motion.button
          type="submit"
          disabled={isLoading || !isValid}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={isValid && !isLoading ? { scale: 0.98 } : undefined}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying
            </>
          ) : (
            <>
              Verify code
              <motion.span
                animate={{ x: isHovered && isValid ? 4 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </>
          )}
        </motion.button>

        <div className="mt-4 border-t border-gray-100 pt-4 text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </div>
      </motion.div>
    </div>
  );
};
