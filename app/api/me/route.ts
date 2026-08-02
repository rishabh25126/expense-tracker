import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ensureProfile } from '@/lib/profile';

export async function GET() {
  const auth = await requireUser();
  if ('response' in auth) return auth.response;
  const profile = await ensureProfile(auth.user);
  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile,
  });
}
