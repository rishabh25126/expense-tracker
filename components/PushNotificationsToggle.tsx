'use client';

import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/deviceId';

type Props = {
  groupId: string;
};

function base64ToUint8Array(base64: string) {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const raw = window.atob(normalized + padding);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PushNotificationsToggle({ groupId }: Props) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (
        !publicKey ||
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        if (!cancelled) {
          setSupported(false);
          setLoading(false);
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!cancelled) {
          setSupported(true);
          setEnabled(Boolean(subscription));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSupported(false);
          setLoading(false);
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enableNotifications() {
    if (!publicKey) {
      setError('Push notifications are not configured.');
      return;
    }

    setPending(true);
    setError('');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      });

      const res = await fetch(`/api/groups/${groupId}/push-subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          subscription,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save notification subscription.');
      }

      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable notifications.');
    } finally {
      setPending(false);
    }
  }

  async function disableNotifications() {
    setPending(true);
    setError('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch(`/api/groups/${groupId}/push-subscriptions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: getDeviceId(),
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }

      setEnabled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable notifications.');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-500">Checking notifications...</p>;
  }

  if (!supported) {
    return (
      <p className="text-xs text-gray-500">
        Notifications unavailable here. On iPhone/iPad, install the app to the Home Screen first.
      </p>
    );
  }

  return (
    <div className="rounded border border-gray-800 bg-gray-900/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-100">Other-phone alerts</p>
          <p className="text-xs text-gray-400">
            Notify this device when another phone adds an expense in this tracker.
          </p>
        </div>
        <button
          type="button"
          onClick={enabled ? disableNotifications : enableNotifications}
          disabled={pending}
          className={`rounded px-3 py-2 text-xs font-medium ${
            enabled ? 'border border-gray-700 text-gray-300' : 'bg-white text-gray-900'
          } disabled:opacity-50`}
        >
          {pending ? 'Saving...' : enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
