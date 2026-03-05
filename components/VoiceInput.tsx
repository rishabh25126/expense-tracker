'use client';
import { useState, useRef, useCallback } from 'react';

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  const start = useCallback(() => {
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
    };
    rec.onend = () => {
      setListening(false);
      if (transcriptRef.current) onTranscript(transcriptRef.current);
    };
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript('');
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors disabled:opacity-40
          ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white'}`}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      {transcript && (
        <p className="text-sm text-gray-600 text-center max-w-xs">{transcript}</p>
      )}
    </div>
  );
}
