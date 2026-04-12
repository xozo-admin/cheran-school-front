// src/lib/toast.ts

import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 1000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'light',
};

// Add login-specific toast functions
export const toastLoginSuccess = (userType: string, options?: ToastOptions) => {
  const messages: Record<string, string> = {
    admin: 'Welcome back, Administrator!',
    teacher: 'Welcome back, Teacher!',
    student: 'Welcome back, Student!',
    staff: 'Welcome back, Staff!',
  };
  
  toast.success(messages[userType] || 'Login successful!', { 
    ...defaultOptions, 
    autoClose: 1000,
    ...options 
  });
};

export const toastLoginError = (message: string, options?: ToastOptions) => {
  toast.error(message, { 
    ...defaultOptions, 
    autoClose: 1000,
    ...options 
  });
};

export const toastLoginWarning = (message: string, options?: ToastOptions) => {
  toast.warn(message, { 
    ...defaultOptions, 
    autoClose: 1000,
    ...options 
  });
};

export const toastInfo = (message: string, options?: ToastOptions) => {
  toast.info(message, { ...defaultOptions, ...options });
};

export const toastOTPRequired = (username: string, options?: ToastOptions) => {
  toast.info(`OTP sent to ${username}. Please check your email.`, {
    ...defaultOptions,
    autoClose: 1000,
    ...options
  });
};

export const toastOTPResent = (username: string, options?: ToastOptions) => {
  toast.success(`OTP resent to ${username}`, {
    ...defaultOptions,
    autoClose: 1000,
    ...options
  });
};

export const toastOTPExpired = (options?: ToastOptions) => {
  toast.error('OTP has expired. Please request a new one.', {
    ...defaultOptions,
    autoClose: 1000,
    ...options
  });
};

export const toastLoading = (message: string, toastId?: string | number) => {
  return toast.loading(message, {
    position: 'top-right',
    theme: 'light',
  });
};

export const toastUpdateSuccess = (toastId: string | number, message: string) => {
  toast.update(toastId, {
    render: message,
    type: 'success',
    isLoading: false,
    autoClose: 1000,
  });
};

export const toastUpdateError = (toastId: string | number, message: string) => {
  toast.update(toastId, {
    render: message,
    type: 'error',
    isLoading: false,
    autoClose: 1000,
  });
};

export const toastSuccess = (message: string, options?: ToastOptions) => {
  toast.success(message, { ...defaultOptions, ...options });
};

export const toastError = (message: string, options?: ToastOptions) => {
  toast.error(message, { ...defaultOptions, ...options });
};

export const toastWarning = (message: string, options?: ToastOptions) => {
  toast.warn(message, { ...defaultOptions, ...options });
};

export const toastDefault = (message: string, options?: ToastOptions) => {
  toast(message, { ...defaultOptions, ...options });
};

// Custom toast with JSX
export const toastCustom = (
  content: React.ReactNode,
  options?: ToastOptions
) => {
  toast(content, { ...defaultOptions, ...options });
};

export const toastPromise = (
  promise: Promise<any>,
  messages: {
    pending: string;
    success: string;
    error: string;
  },
  options?: ToastOptions
) => {
  return toast.promise(promise, messages, { ...defaultOptions, ...options });
};

export { toast };