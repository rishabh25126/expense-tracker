import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('app_session')?.value;
  const { pathname } = request.nextUrl;

  if (!session && !pathname.startsWith('/api/') && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Persist last_group cookie whenever visiting a group page
  const groupMatch = pathname.match(/^\/groups\/([^/]+)/);
  if (groupMatch) {
    response.cookies.set('last_group', groupMatch[1], {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)'],
};
