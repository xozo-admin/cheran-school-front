import { cookies } from 'next/headers';

export function getServerCookies() {
  const cookieStore = cookies();
  const allCookies: Record<string, string> = {};
  
  cookieStore.getAll().forEach(cookie => {
    allCookies[cookie.name] = cookie.value;
  });
  
  return allCookies;
}

export function getAuthFromCookies() {
  const cookieStore = cookies();
  
  const token = cookieStore.get('token')?.value || cookieStore.get('auth_token')?.value;
  const userType = cookieStore.get('auth_user_type')?.value;
  const userStr = cookieStore.get('auth_user')?.value;
  
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user cookie:', e);
    }
  }
  
  return { token, userType, user };
}
