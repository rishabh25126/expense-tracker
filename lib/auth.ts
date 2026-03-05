import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get('app_session')?.value === '1';
}

export function unauth() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
