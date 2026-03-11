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
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startRec = useCallback(() => {
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
    rec.onerror = () => stopRec();

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript('');
    // Safety timeout: auto-stop after 30s
    timeoutRef.current = setTimeout(() => rec.stop(), 30000);
  }, [onTranscript, stopRec]);

  const start = useCallback(async () => {
    // Prime mic permission before starting recognition (needed for PWA first-use)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      alert('Microphone permission denied');
      return;
    }
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
      {!online && (
        <p className="text-xs text-red-400">Voice input disabled — you are offline</p>
      )}
      {transcript && (
        <p className="text-sm text-gray-400 text-center max-w-xs">{transcript}</p>
      )}
    </div>
  );
}
