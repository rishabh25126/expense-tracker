import { createAdminClient } from '@/lib/supabase/admin';

export async function log(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: unknown) {
  try {
    const supabase = createAdminClient();
    
    // Convert 'INFO', 'ERROR', 'WARN' to lowercase for consistency
    const dbLevel = level.toLowerCase();
    
    const { error } = await supabase.from('app_logs').insert({
      level: dbLevel,
      message,
      metadata: data || null,
    });
    
    if (error) {
      console.error('Failed to write app log to database:', error);
    }
  } catch (e) {
    // silently fail — don't break the app for logging failures
    console.error('Failed to execute log function:', e);
  }
}
