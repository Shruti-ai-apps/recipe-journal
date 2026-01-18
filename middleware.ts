import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware for handling authentication
 * - Refreshes the session on every request
 * - Protects routes that require authentication
 */
export async function middleware(request: NextRequest) {
  // Update the session (refresh if needed)
  const response = await updateSession(request);

  // Define protected routes (require authentication)
  const protectedRoutes: string[] = [
    // Add protected routes here as needed
    // '/settings',
    // '/profile',
  ];

  // Define auth routes (redirect to home if already logged in)
  const authRoutes = ['/login', '/signup', '/forgot-password'];

  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if this is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // For now, just return the response with refreshed session
  // Protected route logic can be added later when needed
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
