import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'staff';

const ROLE_TO_BASE_PATH: Record<UserRole, string> = {
  super_admin: '/admin',
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  staff: '/staff',
};

const PROTECTED_PREFIXES = Object.values(ROLE_TO_BASE_PATH);

const resolveUserRole = (req: NextRequest): UserRole | null => {
  const roleFromCookie = req.cookies.get('auth_user_type')?.value as UserRole | undefined;
  if (roleFromCookie && roleFromCookie in ROLE_TO_BASE_PATH) {
    return roleFromCookie;
  }

  const userRaw = req.cookies.get('auth_user')?.value;
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw) as { user_type?: string };
    if (user.user_type && user.user_type in ROLE_TO_BASE_PATH) {
      return user.user_type as UserRole;
    }
  } catch {
    return null;
  }

  return null;
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('token')?.value;
  const userRole = resolveUserRole(req);
  const isAuthenticated = Boolean(token && userRole);

  // Logged-in users should not access login page again.
  if (pathname === '/' && isAuthenticated && userRole) {
    return NextResponse.redirect(new URL(ROLE_TO_BASE_PATH[userRole], req.url));
  }

  const protectedPrefix = PROTECTED_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  if (!protectedPrefix) {
    return NextResponse.next();
  }

  if (!isAuthenticated || !userRole) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const allowedBase = ROLE_TO_BASE_PATH[userRole];
  if (!pathname.startsWith(allowedBase)) {
    return NextResponse.redirect(new URL(allowedBase, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
