'use client';
import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/deviceId';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function PushNotificationsToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ok = Boolean('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && publicKey);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => setEnabled(Boolean(subscription)))
      .catch(() => setEnabled(false));
  }, [publicKey]);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notification permission was not granted');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

      const res = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), subscription }),
      });
      if (!res.ok) throw new Error('Failed to save subscription');
      setEnabled(true);
      setMessage('Push notifications enabled');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to enable push notifications');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), endpoint: subscription?.endpoint }),
      });
      await subscription?.unsubscribe();
      setEnabled(false);
      setMessage('Push notifications disabled');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to disable push notifications');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-700 bg-gray-900 rounded p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Phone push alerts</p>
          <p className="text-xs text-gray-500">{supported ? 'For expenses added by other members' : 'Unavailable on this browser or missing VAPID key'}</p>
        </div>
        <button
          type="button"
          onClick={enabled ? disable : enable}
          disabled={!supported || busy}
          className={`text-xs px-3 py-1.5 rounded disabled:opacity-40 ${enabled ? 'border border-gray-700 text-gray-300' : 'bg-white text-gray-900'}`}
        >
          {busy ? '...' : enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {message && <p className="text-xs text-gray-400 mt-2">{message}</p>}
    </div>
  );
}
