import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function isAuthed(): Promise<boolean> {
  return Boolean(await getCurrentUser());
}

export async function requireUser(): Promise<{ user: User; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { response: unauth() };
  return { user };
}

export function unauth() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
