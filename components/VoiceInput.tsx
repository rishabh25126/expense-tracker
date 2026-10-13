'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type NativeResult = { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
type NativeRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<NativeResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
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
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<NativeRecognition | null>(null);
  const transcriptRef = useRef('');
  const callbackRef = useRef(onTranscript);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  callbackRef.current = onTranscript;

  const clientLog = useCallback((level: string, message: string) => {
    void fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message }),
    }).catch(() => undefined);
  }, []);

  const releaseMic = useCallback((submitTranscript: boolean) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognitionRef.current = null;
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    // Abort the native instance even if it has not emitted its start/end event.
    try { recognition.abort(); } catch { /* Already ended by the browser. */ }

    const text = transcriptRef.current.trim();
    transcriptRef.current = '';
    if (mountedRef.current) {
      setListening(false);
      setTranscript(submitTranscript ? text : '');
    }
    if (submitTranscript && text && mountedRef.current) {
      clientLog('info', 'Mic stopped recording');
      void Promise.resolve().then(() => callbackRef.current(text)).catch(() => undefined);
    }
  }, [clientLog]);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(Boolean(recognitionConstructor()));
    setHydrated(true);
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => { setOnline(false); releaseMic(false); };
    const onPageHide = () => releaseMic(false);
    const onVisibilityChange = () => { if (document.hidden) releaseMic(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      mountedRef.current = false;
      releaseMic(false);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [releaseMic]);

  useEffect(() => { if (disabled) releaseMic(false); }, [disabled, releaseMic]);

  const start = () => {
    if (disabled || !online || recognitionRef.current) return;
    const Constructor = recognitionConstructor();
    if (!Constructor) return;

    setError('');
    setTranscript('');
    transcriptRef.current = '';
    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const results = Array.from(event.results);
      const text = results.map(result => result[0]?.transcript ?? '').join(' ').trim();
      transcriptRef.current = text;
      setTranscript(text);
      if (results.some(result => result.isFinal)) releaseMic(true);
    };
    recognition.onend = () => releaseMic(true);
    recognition.onerror = event => {
      releaseMic(false);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input stopped. Try again.');
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
      clientLog('info', 'Mic started recording');
      timeoutRef.current = setTimeout(() => releaseMic(true), 20000);
    } catch {
      releaseMic(false);
      setError('Could not start voice input. Try again.');
    }
  };

  if (!hydrated) return <div aria-hidden="true" className="h-[104px] w-full" />;
  if (!supported) return <p className="text-center text-xs text-red-400">Voice input not supported in this browser</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={listening ? () => releaseMic(true) : start}
        disabled={disabled || !online}
        whileTap={reducedMotion ? undefined : { scale: .94 }}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl transition-colors disabled:opacity-40 ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-gray-950'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? '■' : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-8 w-8"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>}
      </motion.button>
      {listening && <p aria-live="polite" className="text-sm font-medium text-red-500 animate-pulse">Listening…</p>}
      {!online && <p className="text-xs text-red-400">Voice input disabled — you are offline</p>}
      {error && <p role="alert" className="text-center text-xs text-red-400">{error}</p>}
      {transcript && <p className="max-w-xs text-center text-sm text-gray-400">{transcript}</p>}
    </div>
  );
}
