import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'logs', 'app.log');

export async function log(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ' ' + JSON.stringify(data) : '';
  const line = `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  try {
    await mkdir(join(process.cwd(), 'logs'), { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
  } catch {
    // silently fail — don't break the app for logging failures
  }
}
