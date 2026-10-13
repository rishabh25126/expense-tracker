'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const reducedMotion = useReducedMotion();
  const close = () => { setOpen(false); sendFeedback.reset(); opener.current?.focus(); };
  const sendFeedback = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      if (!res.ok) throw new Error('Failed to save feedback');
      return res;
    },
    onSuccess: () => { setMessage(''); timer.current = setTimeout(close, 1500); },
  });
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const status = sendFeedback.isSuccess ? 'sent' : sendFeedback.isError ? 'error' : sendFeedback.isPending ? 'sending' : 'idle';
  return <>
    <button ref={opener} type="button" onClick={() => { setOpen(true); sendFeedback.reset(); }} className="secondary-action text-sm">Feedback</button>
    <AnimatePresence>
      {open && <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
        <motion.div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="sheet space-y-5" initial={{ y: reducedMotion ? 0 : 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reducedMotion ? 0 : 28, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
          <div className="flex items-center justify-between gap-4"><h2 id="feedback-title" className="section-title">Send feedback</h2><button type="button" onClick={close} className="secondary-action" aria-label="Close feedback">Close</button></div>
          {status === 'sent' ? <p aria-live="polite" className="py-4 text-emerald-400">Feedback saved. Thank you.</p> :
            <form onSubmit={event => { event.preventDefault(); if (message.trim()) sendFeedback.mutate(message.trim()); }} className="space-y-4">
              <div><label htmlFor="feedback-message" className="field-label">Your feedback</label><textarea ref={input} id="feedback-message" name="message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Share a bug or idea…" rows={5} className="field min-h-32 resize-y" required /></div>
              <p aria-live="polite" className="status-message text-red-400">{status === 'error' ? 'Failed to save. Try again.' : ''}</p>
              <div className="flex gap-3"><button type="submit" disabled={status === 'sending' || !message.trim()} className="primary-action flex-1 disabled:opacity-50">{status === 'sending' ? 'Saving…' : 'Submit'}</button><button type="button" onClick={close} className="secondary-action flex-1">Cancel</button></div>
            </form>}
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </>;
}
