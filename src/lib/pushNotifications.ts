import { supabase } from './supabase';
import { NotificationItem } from '../types';

const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

const base64UrlToUint8Array = (value: string) => {
  const normalized = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const getPushPermission = (): NotificationPermission | 'unsupported' =>
  isPushSupported() ? Notification.permission : 'unsupported';

export async function enablePushNotifications(userId: string) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  if (!isPushSupported()) return { ok: false, message: 'This browser does not support device notifications.' };
  if (!publicVapidKey) return { ok: false, message: 'Push is not configured yet. Ask the administrator to add the VAPID public key.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, message: 'Notification permission was not granted.' };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicVapidKey) });
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    subscription: subscription.toJSON(),
    device_label: `${navigator.platform || 'Device'} · ${navigator.userAgent.slice(0, 80)}`,
  }, { onConflict: 'endpoint' });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Device notifications are enabled.' };
}

export function dispatchPushNotification(notification: NotificationItem) {
  if (!supabase || !publicVapidKey) return;
  void supabase.functions.invoke('dispatch-push', { body: { notificationId: notification.id } })
    .then(({ error }) => { if (error) console.warn('Push delivery will remain available in the in-app inbox:', error.message); });
}
