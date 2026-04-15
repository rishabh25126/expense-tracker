'use client';
import 'regenerator-runtime/runtime';
import { useState, useCallback, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

type Props = {
  onTranscript: (text: string) => void;
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

  // Safety to ensure we don't listen forever and we pass transcript
  useEffect(() => {
    if (!listening && transcript && transcript !== lastProcessedRef.current) {
      lastProcessedRef.current = transcript;
      clientLog('info', 'Mic stopped recording', { transcript });
      onTranscript(transcript);
      resetTranscript();
      // small delay to reset the ref so subsequent matching inputs aren't ignored
      setTimeout(() => { lastProcessedRef.current = ''; }, 1000);
    }
  }, [listening, transcript, onTranscript, resetTranscript, clientLog]);

  const start = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      alert('Voice not supported in this browser');
      return;
    }
    resetTranscript();
    clientLog('info', 'Mic started recording');
    SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
  }, [browserSupportsSpeechRecognition, resetTranscript, clientLog]);

  const stop = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-red-400">Voice input not supported in this browser</p>
      </div>
    );
  }

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
