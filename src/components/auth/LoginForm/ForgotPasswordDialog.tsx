'use client';

import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import { FaCheckCircle, FaEnvelope, FaKey, FaLock, FaTimes, FaUser } from 'react-icons/fa';

type ResetStep = 'request' | 'otp' | 'password';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  step: ResetStep;
  username: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  message: string;
  onClose: () => void;
  onUsernameChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onRequestOtp: (event: FormEvent<HTMLFormElement>) => void;
  onVerifyOtp: (event: FormEvent<HTMLFormElement>) => void;
  onConfirmPassword: (event: FormEvent<HTMLFormElement>) => void;
  onBackToRequest: () => void;
}

const inputStyle = {
  width: '100%',
  padding: '12px 12px 12px 42px',
  fontSize: '15px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  outline: 'none',
  backgroundColor: '#ffffff',
  color: '#111827',
} as const;

const primaryButtonStyle = {
  width: '100%',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#ffffff',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  cursor: 'pointer',
} as const;

export const ForgotPasswordDialog = ({
  isOpen,
  step,
  username,
  otp,
  newPassword,
  confirmPassword,
  isLoading,
  message,
  onClose,
  onUsernameChange,
  onOtpChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onRequestOtp,
  onVerifyOtp,
  onConfirmPassword,
  onBackToRequest,
}: ForgotPasswordDialogProps) => {
  if (!isOpen) return null;

  const title =
    step === 'request'
      ? 'Reset Password'
      : step === 'otp'
        ? 'Verify OTP'
        : 'Set New Password';

  const description =
    step === 'request'
      ? 'Enter your username or phone number. We will send an OTP to your registered email.'
      : step === 'otp'
        ? 'Enter the OTP sent by the school system.'
        : 'Create a new password for your account.';

  const renderIconInput = (
    icon: ReactNode,
    input: ReactNode,
  ) => (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9ca3af',
          display: 'flex',
          pointerEvents: 'none',
        }}
      >
        {icon}
      </div>
      {input}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '6px', background: 'linear-gradient(90deg, #2563eb, #64748b, #1d4ed8)' }} />

        <div style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{title}</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: 1.5, color: '#6b7280' }}>
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
              style={{
                border: 'none',
                background: '#f3f4f6',
                color: '#4b5563',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <FaTimes />
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '13px',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FaCheckCircle />
              <span>{message}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={onRequestOtp} style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
              {renderIconInput(
                <FaUser />,
                <input
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="Username or phone number"
                  disabled={isLoading}
                  style={{ ...inputStyle, opacity: isLoading ? 0.65 : 1 }}
                />,
              )}
              <button type="submit" disabled={isLoading} style={{ ...primaryButtonStyle, opacity: isLoading ? 0.65 : 1 }}>
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={onVerifyOtp} style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
              {renderIconInput(
                <FaEnvelope />,
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  inputMode="numeric"
                  disabled={isLoading}
                  style={{ ...inputStyle, letterSpacing: '0', opacity: isLoading ? 0.65 : 1 }}
                />,
              )}
              <button type="submit" disabled={isLoading} style={{ ...primaryButtonStyle, opacity: isLoading ? 0.65 : 1 }}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={onBackToRequest}
                disabled={isLoading}
                style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
              >
                Change username
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={onConfirmPassword} style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
              {renderIconInput(
                <FaLock />,
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => onNewPasswordChange(event.target.value)}
                  placeholder="New password"
                  disabled={isLoading}
                  style={{ ...inputStyle, opacity: isLoading ? 0.65 : 1 }}
                />,
              )}
              {renderIconInput(
                <FaKey />,
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => onConfirmPasswordChange(event.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  style={{ ...inputStyle, opacity: isLoading ? 0.65 : 1 }}
                />,
              )}
              <button type="submit" disabled={isLoading} style={{ ...primaryButtonStyle, opacity: isLoading ? 0.65 : 1 }}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
