// lib/auth.ts
import Cookies from 'js-cookie';

const getCookieOptions = (expirationDays?: number) => ({
  ...(expirationDays ? { expires: expirationDays } : {}),
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
  sameSite: 'strict' as const,
});

export const storeAuthData = (data: any, username: string, rememberMe: boolean = false) => {
  const expirationDays = rememberMe ? 30 : 1;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expirationDays);

  if (data.token) Cookies.set('token', data.token, getCookieOptions(expirationDays));
  if (data.user_type) Cookies.set('auth_user_type', data.user_type, getCookieOptions(expirationDays));
  if (data.session_key) Cookies.set('session_key', data.session_key, getCookieOptions(expirationDays));
  if (data.auth_code) Cookies.set('auth_code', data.auth_code, getCookieOptions(expirationDays));
  if (data.redirect_to) Cookies.set('redirect_to', data.redirect_to, getCookieOptions(expirationDays));

  Cookies.set('username', username, getCookieOptions(expirationDays));
  Cookies.set('login_time', new Date().toISOString(), getCookieOptions(expirationDays));
  Cookies.set('token_expiry', expiry.toISOString(), getCookieOptions(expirationDays));

  return true;
};

export const getAuthToken = () => (typeof window !== 'undefined' ? Cookies.get('token') || null : null);

export const getUserType = () => (typeof window !== 'undefined' ? Cookies.get('auth_user_type') || null : null);

export const getSessionKey = () => (typeof window !== 'undefined' ? Cookies.get('session_key') || null : null);

export const getAuthCode = () => (typeof window !== 'undefined' ? Cookies.get('auth_code') || null : null);

export const isTokenValid = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = Cookies.get('token');
  const expiry = Cookies.get('token_expiry');
  if (!token || !expiry) return false;

  return new Date() < new Date(expiry);
};

export const clearAuthData = () => {
  if (typeof window === 'undefined') return;

  Cookies.remove('token');
  Cookies.remove('session_key');
  Cookies.remove('auth_user_type');
  Cookies.remove('auth_user');
  Cookies.remove('auth_code');
  Cookies.remove('username');
  Cookies.remove('login_time');
  Cookies.remove('token_expiry');
  Cookies.remove('redirect_to');
};

export const clearAllCookies = () => {
  if (typeof window === 'undefined') return;

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter(Boolean) as string[];

  const hostname = window.location.hostname;
  const domains = [hostname, `.${hostname}`];
  const pathVariants = ['/', window.location.pathname];

  cookieNames.forEach((name) => {
    Cookies.remove(name);

    pathVariants.forEach((path) => {
      Cookies.remove(name, { path });
      domains.forEach((domain) => {
        Cookies.remove(name, { path, domain });
      });
    });
  });
};

// Auth fetch wrapper
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthData();
    window.location.href = '/';
    throw new Error('Authentication required');
  }

  return response;
};
