import { useCallback } from 'react';

export function useNotification() {
  const notify = useCallback(async (title, options = {}) => {
    if (!('Notification' in window)) return;

    // Omba permission ikiwa bado haijapewa
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return;

    // Tumia service worker ikiwa ipo (PWA)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, options);
    } else {
      // fallback kwa desktop browser zisizo PWA
      new Notification(title, options);
    }
  }, []);

  return notify;
}
