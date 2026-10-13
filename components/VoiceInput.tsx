'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { recordVoiceEvent, flushVoiceEvents } from '@/lib/voiceTelemetry';

type NativeResult = { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
type NativeRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<NativeResult> }) => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionWindow = {
  SpeechRecognition?: new () => NativeRecognition;
  webkitSpeechRecognition?: new () => NativeRecognition;
};
type Props = {
  onTranscript: (text: string) => void | Promise<void>;
  disabled?: boolean;
};

function recognitionConstructor(): (new () => NativeRecognition) | undefined {
  const browser = window as unknown as RecognitionWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export default function VoiceInput({ onTranscript, disabled = false }: Props) {
  const [supported, setSupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<NativeRecognition | null>(null);
  const transcriptRef = useRef('');
  const callbackRef = useRef(onTranscript);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppingRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef('');
  const sequenceRef = useRef(0);
  const startedAtRef = useRef(0);
  const reducedMotion = useReducedMotion();
  callbackRef.current = onTranscript;

  const voiceLog = useCallback((event: string, details: Record<string, string | number | boolean | null> = {}, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') => {
    const metadata = {
      session: sessionRef.current,
      sequence: ++sequenceRef.current,
      elapsedMs: startedAtRef.current ? Math.round(performance.now() - startedAtRef.current) : 0,
      ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
      standalone: window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
      visibility: document.visibilityState,
      online: navigator.onLine,
      ...details,
    };
    console.info(`[Voice mic] ${event}`, metadata);
    recordVoiceEvent({ level, message: `Voice mic: ${event}`, metadata });
  }, []);

  const releaseMic = useCallback((submitTranscript: boolean, abort = true, reason = 'unknown') => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    voiceLog('release', { reason, submitTranscript, abort, transcriptLength: transcriptRef.current.length });
    recognitionRef.current = null;
    recognition.onresult = null;
    recognition.onstart = null;
    recognition.onaudiostart = null;
    recognition.onaudioend = null;
    recognition.onspeechstart = null;
    recognition.onspeechend = null;
    recognition.onend = null;
    recognition.onerror = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (startupRef.current) clearTimeout(startupRef.current);
    if (endingRef.current) clearTimeout(endingRef.current);
    timeoutRef.current = null;
    startupRef.current = null;
    endingRef.current = null;
    stoppingRef.current = false;
    // Aborting after a normal onend can leave WebKit's next session stalled.
    if (abort) {
      try { recognition.abort(); voiceLog('native.abort.return', { reason }); }
      catch (error) { voiceLog('native.abort.throw', { reason, error: error instanceof Error ? error.name : 'unknown' }, 'WARN'); }
    }

    const text = transcriptRef.current.trim();
    transcriptRef.current = '';
    if (mountedRef.current) {
      setListening(false);
      setStarting(false);
      setFinishing(false);
      setTranscript(submitTranscript ? text : '');
    }
    if (submitTranscript && text && mountedRef.current) {
      voiceLog('transcript.dispatch', { length: text.length });
      void Promise.resolve().then(() => callbackRef.current(text))
        .then(() => voiceLog('transcript.handled'))
        .catch(error => voiceLog('transcript.failed', { error: error instanceof Error ? error.name : 'unknown' }, 'ERROR'));
    }
  }, [voiceLog]);

  const stopRecording = useCallback((reason = 'button') => {
    const recognition = recognitionRef.current;
    if (!recognition || stoppingRef.current) return;
    stoppingRef.current = true;
    setFinishing(true);
    voiceLog('stop.request', { reason });
    try { recognition.stop(); voiceLog('native.stop.return', { reason }); }
    catch (error) { voiceLog('native.stop.throw', { reason, error: error instanceof Error ? error.name : 'unknown' }, 'WARN'); }
    // WebKit occasionally omits onend; unlock the control if that happens.
    endingRef.current = setTimeout(() => {
      voiceLog('timeout.end', {}, 'WARN');
      releaseMic(true, true, 'end-timeout');
    }, 2000);
  }, [releaseMic, voiceLog]);

  const waitForNaturalEnd = useCallback(() => {
    if (!recognitionRef.current || stoppingRef.current) return;
    stoppingRef.current = true;
    setFinishing(true);
    // With continuous=false, the first final result ends recognition naturally.
    // Calling stop() here can interrupt WebKit while it is already ending.
    voiceLog('final-result.wait-end');
    endingRef.current = setTimeout(() => {
      voiceLog('timeout.final-end', {}, 'WARN');
      releaseMic(true, true, 'final-end-timeout');
    }, 2000);
  }, [releaseMic, voiceLog]);

  useEffect(() => {
    mountedRef.current = true;
    const available = Boolean(recognitionConstructor());
    setSupported(available);
    setHydrated(true);
    setOnline(navigator.onLine);
    void flushVoiceEvents();
    voiceLog('component.mount', { supported: available });
    const onOnline = () => { setOnline(true); void flushVoiceEvents(); };
    const onOffline = () => { voiceLog('browser.offline'); setOnline(false); releaseMic(false, true, 'offline'); };
    const onPageHide = () => { voiceLog('browser.pagehide'); releaseMic(false, true, 'pagehide'); };
    const onVisibilityChange = () => { if (document.hidden) { voiceLog('browser.hidden'); releaseMic(false, true, 'hidden'); } };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mountedRef.current = false;
      voiceLog('component.unmount');
      releaseMic(false, true, 'unmount');
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [releaseMic, voiceLog]);

  useEffect(() => { if (disabled && recognitionRef.current) { voiceLog('component.disabled'); releaseMic(false, true, 'disabled'); } }, [disabled, releaseMic, voiceLog]);

  const start = () => {
    if (disabled || !online || recognitionRef.current) {
      voiceLog('start.blocked', { disabled, online, active: Boolean(recognitionRef.current) }, 'WARN');
      return;
    }
    sessionRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sequenceRef.current = 0;
    startedAtRef.current = performance.now();
    voiceLog('start.request');
    const Constructor = recognitionConstructor();
    if (!Constructor) { voiceLog('start.unsupported', {}, 'ERROR'); return; }

    setError('');
    setTranscript('');
    transcriptRef.current = '';
    stoppingRef.current = false;
    setFinishing(false);
    let recognition: NativeRecognition;
    try { recognition = new Constructor(); voiceLog('native.constructed'); }
    catch (error) {
      voiceLog('native.construct.throw', { error: error instanceof Error ? error.name : 'unknown' }, 'ERROR');
      setError('Could not open voice input. Try again.');
      return;
    }
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      voiceLog('native.start');
      if (startupRef.current) clearTimeout(startupRef.current);
      startupRef.current = null;
      setStarting(false);
    };
    recognition.onaudiostart = () => voiceLog('native.audio-start');
    recognition.onaudioend = () => voiceLog('native.audio-end');
    recognition.onspeechstart = () => voiceLog('native.speech-start');
    recognition.onspeechend = () => voiceLog('native.speech-end');
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      if (startupRef.current) clearTimeout(startupRef.current);
      startupRef.current = null;
      setStarting(false);
      const results = Array.from(event.results);
      const text = results.map(result => result[0]?.transcript ?? '').join(' ').trim();
      voiceLog('native.result', { resultCount: results.length, final: results.some(result => result.isFinal), transcriptLength: text.length });
      transcriptRef.current = text;
      setTranscript(text);
      if (results.some(result => result.isFinal)) waitForNaturalEnd();
    };
    recognition.onend = () => { voiceLog('native.end'); releaseMic(true, false, 'native-end'); };
    recognition.onerror = event => {
      voiceLog('native.error', { error: event.error }, 'ERROR');
      if (stoppingRef.current && event.error === 'aborted') {
        releaseMic(true, false, 'native-aborted-after-stop');
        return;
      }
      releaseMic(false, true, 'native-error');
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input stopped. Try again.');
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    setStarting(true);
    timeoutRef.current = setTimeout(() => { voiceLog('timeout.max-duration', {}, 'WARN'); stopRecording('max-duration'); }, 20000);
    startupRef.current = setTimeout(() => {
      if (recognitionRef.current !== recognition) return;
      voiceLog('timeout.startup', {}, 'WARN');
      releaseMic(false, true, 'startup-timeout');
      setError('Microphone did not start. Tap to try again.');
    }, 5000);
    try {
      voiceLog('native.start.call');
      recognition.start();
      voiceLog('native.start.return');
    } catch (error) {
      voiceLog('native.start.throw', { error: error instanceof Error ? error.name : 'unknown' }, 'ERROR');
      releaseMic(false, true, 'start-throw');
      setError('Could not start voice input. Try again.');
    }
  };

  if (!hydrated) return <div aria-hidden="true" className="h-[104px] w-full" />;
  if (!supported) return <p className="text-center text-xs text-red-400">Voice input not supported in this browser</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={listening ? () => stopRecording('button') : start}
        disabled={disabled || !online}
        whileTap={reducedMotion ? undefined : { scale: .94 }}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl transition-colors disabled:opacity-40 ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-gray-950'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? '■' : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-8 w-8"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>}
      </motion.button>
      {listening && <p aria-live="polite" className="text-sm font-medium text-red-500 animate-pulse">{starting ? 'Connecting microphone…' : finishing ? 'Finishing…' : 'Listening…'}</p>}
      {!online && <p className="text-xs text-red-400">Voice input disabled — you are offline</p>}
      {error && <p role="alert" className="text-center text-xs text-red-400">{error}</p>}
      {transcript && <p className="max-w-xs text-center text-sm text-gray-400">{transcript}</p>}
    </div>
  );
}
