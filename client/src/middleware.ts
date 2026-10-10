import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow static game assets or any static file with an extension to bypass middleware
  if (pathname.startsWith('/games/') && pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAppPage = pathname.startsWith('/dashboard') || 
                    pathname.startsWith('/chat') || 
                    pathname.startsWith('/watch') || 
                    pathname.startsWith('/map') || 
                    pathname === '/games' ||
                    pathname.startsWith('/room') || 
                    pathname.startsWith('/goals') || 
                    pathname.startsWith('/reminders');

  if (!token && isAppPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
