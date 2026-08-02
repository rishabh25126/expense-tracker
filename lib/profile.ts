import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

function randomProfileColor() {
  return PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];
}

export async function ensureProfile(user: User): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) return existing as Profile;

  const email = user.email ?? null;
  const metadataName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      full_name: metadataName,
      color: randomProfileColor(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) return null;
  return data;
}

export function displayName(profile?: Pick<Profile, 'full_name' | 'email'> | null) {
  return profile?.full_name?.trim() || profile?.email || 'Someone';
}

export function firstName(profile?: Pick<Profile, 'full_name' | 'email'> | null) {
  return displayName(profile).split(/\s+/)[0] || 'Someone';
}
