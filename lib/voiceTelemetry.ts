type VoiceEvent = {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata: Record<string, string | number | boolean | null>;
};

const STORAGE_KEY = 'pending_voice_diagnostics';
const MAX_EVENTS = 200;
let queue: VoiceEvent[] | null = null;
let sending = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function pending(): VoiceEvent[] {
  if (queue) return queue;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    queue = Array.isArray(saved) ? saved.slice(-MAX_EVENTS) as VoiceEvent[] : [];
  } catch {
    queue = [];
  }
  return queue;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pending())); }
  catch { /* Keep the in-memory queue if storage is unavailable. */ }
}

function retryLater() {
  if (retryTimer || !navigator.onLine) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushVoiceEvents();
  }, 10_000);
}

export function recordVoiceEvent(event: VoiceEvent) {
  const events = pending();
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  persist();
  void flushVoiceEvents();
}

export async function flushVoiceEvents() {
  if (sending || !navigator.onLine) return;
  sending = true;
  let shouldRetry = false;
  try {
    const events = pending();
    while (events.length) {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events[0]),
        keepalive: true,
      });
      if (!response.ok) {
        console.warn('[Voice mic] Log storage delayed', { status: response.status, pending: events.length });
        shouldRetry = response.status >= 500;
        break;
      }
      events.shift();
      persist();
    }
  } catch {
    console.warn('[Voice mic] Log storage delayed', { pending: pending().length });
    shouldRetry = true;
  }
  finally {
    sending = false;
    if (pending().length && shouldRetry) retryLater();
    else if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }
}
