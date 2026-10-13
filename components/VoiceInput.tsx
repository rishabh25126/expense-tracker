'use client';
import 'regenerator-runtime/runtime';
import { useState, useCallback, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { motion, useReducedMotion } from 'motion/react';

type Props = {
  onTranscript: (text: string) => void | Promise<void>;
  disabled?: boolean;
};

export default function VoiceInput({ onTranscript, disabled }: Props) {
  const clientLog = useCallback((level: string, message: string, metadata?: any) => {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, metadata })
    }).catch(() => null);
  }, []);

  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const lastProcessedRef = useRef('');
  const processingTranscriptRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      void SpeechRecognition.abortListening();
    };
  }, []);

  useEffect(() => {
    if ((!disabled && online) || !listening) return;
    void SpeechRecognition.abortListening();
    clientLog('info', 'Mic aborted while input disabled');
  }, [disabled, online, listening, clientLog]);

  useEffect(() => {
    if (!listening) {
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      return;
    }
    recordingTimer.current = setTimeout(() => { void SpeechRecognition.abortListening(); }, 20000);
    return () => { if (recordingTimer.current) clearTimeout(recordingTimer.current); };
  }, [listening]);

  // Safety to ensure we don't listen forever and we pass transcript
  useEffect(() => {
    if (listening || !transcript || transcript === lastProcessedRef.current || processingTranscriptRef.current) {
      return;
    }

    processingTranscriptRef.current = true;
    lastProcessedRef.current = transcript;
    clientLog('info', 'Mic stopped recording', { transcript });

    Promise.resolve(onTranscript(transcript))
      .finally(() => {
        if (!mounted.current) return;
        resetTranscript();
        processingTranscriptRef.current = false;
        // small delay to reset the ref so subsequent matching inputs aren't ignored
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => { lastProcessedRef.current = ''; }, 1000);
      });
  }, [listening, transcript, onTranscript, resetTranscript, clientLog]);

  const start = useCallback(() => {
    if (disabled) return;
    if (!browserSupportsSpeechRecognition) {
      alert('Voice not supported in this browser');
      return;
    }
    resetTranscript();
    clientLog('info', 'Mic started recording');
    SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
  }, [browserSupportsSpeechRecognition, disabled, resetTranscript, clientLog]);

  const stop = useCallback(() => {
    // Web Speech stop() can keep the native mic session open on mobile until its
    // final result. abort() releases it immediately; the captured transcript remains.
    void SpeechRecognition.abortListening();
  }, []);

  if (!hydrated) return <div aria-hidden="true" className="h-[104px] w-full" />;

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-red-400">Voice input not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled || !online}
        whileTap={reducedMotion ? undefined : { scale: .94 }}
        className={`h-[72px] w-[72px] rounded-full flex items-center justify-center text-2xl transition-colors disabled:opacity-40
          ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-gray-950'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? '■' : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-8 w-8"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>}
      </motion.button>
      {listening && (
        <p aria-live="polite" className="text-sm font-medium text-red-500 animate-pulse">Listening…</p>
      )}
      {!online && (
        <p className="text-xs text-red-400">Voice input disabled — you are offline</p>
      )}
      {transcript && (
        <p className="text-sm text-gray-400 text-center max-w-xs">{transcript}</p>
      )}
    </div>
  );
}
