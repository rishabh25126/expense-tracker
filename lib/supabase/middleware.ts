import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback'];
type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isPublicPage = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

  if (!user && !isPublicPage && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

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
