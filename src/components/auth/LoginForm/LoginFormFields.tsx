// src/components/auth/LoginForm/LoginFormFields.tsx

'use client';

import { useState } from 'react';
import { FaEye, FaEyeSlash, FaUser, FaLock, FaArrowRight } from 'react-icons/fa';

interface LoginFormFieldsProps {
  username: string;
  password: string;
  rememberMe: boolean;
  errors: { username?: string; password?: string };
  isLoading: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onForgotPassword: () => void;
  onShowPasswordToggle: () => void;
  showPassword: boolean;
}

export const LoginFormFields = ({
  username,
  password,
  rememberMe,
  errors,
  isLoading,
  onUsernameChange,
  onPasswordChange,
  onRememberMeChange,
  onForgotPassword,
  onShowPasswordToggle,
  showPassword,
}: LoginFormFieldsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px'
    }}>
      {/* Username Field */}
      <div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '4px'
          }}>
            Username
          </label>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <FaUser style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
          </div>
          <input
            type="text"
            placeholder="Enter your username or email"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 12px 12px 42px',
              fontSize: '16px',
              border: `1px solid ${errors.username ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: isLoading ? '#f3f4f6' : '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'text',
              opacity: isLoading ? 0.7 : 1,
              color: '#000000'
            }}
            onFocus={(e) => {
              if (!isLoading) {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.username ? '#ef4444' : '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        {errors.username && (
          <p style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#ef4444' 
          }}>
            {errors.username}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '4px'
          }}>
            Password
          </label>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <FaLock style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 42px 12px 42px',
              fontSize: '16px',
              border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: isLoading ? '#f3f4f6' : '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'text',
              opacity: isLoading ? 0.7 : 1,
              color: '#000000'
            }}
            onFocus={(e) => {
              if (!isLoading) {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.password ? '#ef4444' : '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="button"
            onClick={onShowPasswordToggle}
            style={{ 
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              transition: 'color 0.2s ease',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => {
              if (!isLoading) e.currentTarget.style.color = '#4b5563';
            }}
            onMouseOut={(e) => {
              if (!isLoading) e.currentTarget.style.color = '#9ca3af';
            }}
            disabled={isLoading}
          >
            {showPassword ? 
              <FaEyeSlash style={{ height: '20px', width: '20px' }} /> : 
              <FaEye style={{ height: '20px', width: '20px' }} />
            }
          </button>
        </div>
        {errors.password && (
          <p style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: '#ef4444' 
          }}>
            {errors.password}
          </p>
        )}
      </div>

      {/* Remember Me and Forgot Password Row */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '4px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          {/* Remember Me Checkbox */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center'
          }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              style={{
                height: '16px',
                width: '16px',
                accentColor: '#2563eb',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
              disabled={isLoading}
            />
            <label 
              htmlFor="rememberMe" 
              style={{
                marginLeft: '8px',
                fontSize: '14px',
                color: '#374151',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              Remember me
            </label>
          </div>
          
          {/* Forgot Password Link */}
          <button
            type="button"
            onClick={onForgotPassword}
            style={{
              fontSize: '14px',
              color: '#2563eb',
              transition: 'color 0.2s ease',
              background: 'none',
              border: 'none',
              padding: '4px 0',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              textDecoration: 'none',
              fontWeight: 500
            }}
            onMouseOver={(e) => {
              if (!isLoading) e.currentTarget.style.color = '#1e40af';
            }}
            onMouseOut={(e) => {
              if (!isLoading) e.currentTarget.style.color = '#2563eb';
            }}
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>
      </div>

      {/* Sign In Button */}
      <div style={{ marginTop: '8px' }}>
        <button
          type="submit"
          disabled={isLoading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }
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
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <FaArrowRight style={{ 
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
                fontSize: '14px'
              }} />
            </>
          )}
        </button>
      </div>


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};