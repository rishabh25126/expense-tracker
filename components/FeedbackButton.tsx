'use client';
import { useState } from 'react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      setStatus('sent');
      setMessage('');
      setTimeout(() => { setOpen(false); setStatus('idle'); }, 1500);
    } else {
      setStatus('error');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 underline"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-t-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-sm">Send Feedback</h2>
              <button onClick={() => { setOpen(false); setStatus('idle'); }} className="text-gray-400 text-sm">✕</button>
            </div>
            {status === 'sent' ? (
              <p className="text-green-400 text-sm text-center py-4">Feedback saved!</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What's on your mind? Bugs, ideas, anything..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {status === 'error' && <p className="text-red-400 text-xs">Failed to save. Try again.</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={status === 'sending' || !message.trim()}
                    className="flex-1 bg-white text-gray-900 rounded py-2 text-sm disabled:opacity-40">
                    {status === 'sending' ? 'Saving...' : 'Submit'}
                  </button>
                  <button type="button" onClick={() => { setOpen(false); setStatus('idle'); }}
                    className="flex-1 border border-gray-700 rounded py-2 text-sm text-gray-300">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
