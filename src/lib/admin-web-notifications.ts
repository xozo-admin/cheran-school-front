import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import Cookies from 'js-cookie';
import { apiFetch } from './api';

const DEFAULT_VAPID_KEY = 'BDXApKzxXBxQzsb2OHohcl5Zh5rkemfG7678QVvUgg_TCFNTSsT03kxJyEDsA2pEg_n-TDlXHoZKQyd77abiPQo';

const firebaseConfig = {
  apiKey: 'AIzaSyA_fRkcxl8clL_ERkb93APx_4wxxbu7w04',
  authDomain: 'school-management-app-64b37.firebaseapp.com',
  projectId: 'school-management-app-64b37',
  storageBucket: 'school-management-app-64b37.firebasestorage.app',
  messagingSenderId: '147413932851',
  appId: '1:147413932851:web:e12aeca18ef7069a327c46',
};

const TOKEN_CACHE_KEY = 'admin_web_fcm_token';
const LEGACY_TOKEN_CACHE_KEY = 'admin_web_fcm_token';

const getFirebaseApp = () => {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

const resolveAuthToken = (): string | null => {
  const raw = Cookies.get('token');
  if (!raw) return null;
  return raw.startsWith('Token ') ? raw.slice(6) : raw;
};

const getTokenCacheKey = (): string => {
  const authToken = resolveAuthToken() || 'anonymous';
  return `${TOKEN_CACHE_KEY}:${authToken}`;
};

const registerDeviceToken = async (token: string): Promise<void> => {
  const scopedCacheKey = getTokenCacheKey();
  const cachedToken = window.localStorage.getItem(scopedCacheKey);
  const legacyCachedToken = window.localStorage.getItem(LEGACY_TOKEN_CACHE_KEY);

  if (cachedToken === token) {
    return;
  }
  // If we had an older global cache key from previous builds, remove it so
  // current user-scoped registration is not skipped accidentally.
  if (legacyCachedToken) {
    window.localStorage.removeItem(LEGACY_TOKEN_CACHE_KEY);
  }

  const response = await apiFetch('notifications/register-device/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fcm_token: token }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register web FCM token (status ${response.status})`);
  }

  window.localStorage.setItem(scopedCacheKey, token);
};

interface SetupOptions {
  onForegroundMessage: (payload: MessagePayload) => void;
}

export const setupAdminWebNotifications = async ({ onForegroundMessage }: SetupOptions): Promise<() => void> => {
  if (typeof window === 'undefined') return () => {};
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return () => {};

  const supported = await isSupported().catch(() => false);
  if (!supported) return () => {};

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return () => {};

  const vapidKey = DEFAULT_VAPID_KEY;
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing. Web push token cannot be generated.');
    return () => {};
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);

  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (token) {
    await registerDeviceToken(token);
  }

  const unsubscribe = onMessage(messaging, onForegroundMessage);

  return () => {
    unsubscribe();
  };
};
