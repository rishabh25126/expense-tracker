'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [online, setOnline] = useState(true);

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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRec = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const abortRec = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e) {}
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) abortRec();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      abortRec();
    };
  }, [abortRec]);

  const startRec = useCallback(() => {
    if (recognitionRef.current) abortRec();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported in this browser'); return; }

    transcriptRef.current = '';
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      transcriptRef.current = text;
      setTranscript(text);
      // Stop as soon as we get a final result — don't wait for onend
      if (e.results[e.results.length - 1].isFinal) rec.stop();
    };
    rec.onend = () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      recognitionRef.current = null;
      setListening(false);
      if (transcriptRef.current) onTranscript(transcriptRef.current);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        if (!transcriptRef.current) setTranscript("Didn't catch that. Try again.");
      } else {
        console.warn('Speech recognition error:', e.error);
        setTranscript(`Mic error: ${e.error}`);
      }
      abortRec();
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript('');
    // Safety timeout: auto-stop after 30s
    timeoutRef.current = setTimeout(() => rec.stop(), 30000);
  }, [onTranscript, abortRec]);

  const start = useCallback(() => {
    startRec();
  }, [startRec]);

  const stop = useCallback(() => stopRec(), [stopRec]);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled || !online}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors disabled:opacity-40
          ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-white'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      {listening && (
        <p className="text-sm font-medium text-red-500 animate-pulse">Listening...</p>
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
