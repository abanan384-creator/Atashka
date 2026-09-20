/**
 * Notification service for Web Notifications & Service Worker integration.
 * Respects browser permissions and provides fallback to in-app audio/modal.
 */

class NotificationService {
  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    if (Notification.permission === "granted") {
      return "granted";
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  public hasPermission(): boolean {
    return this.isSupported() && Notification.permission === "granted";
  }

  public showMedicationNotification(title: string, body: string, eventId?: string) {
    if (!this.hasPermission()) return;

    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            tag: `med-${eventId || Date.now()}`,
            data: { eventId },
          });
        });
      } else {
        new Notification(title, {
          body,
          icon: "/favicon.svg",
        });
      }
    } catch {
      // Browser notification fallback
    }
  }
}

export const notificationService = new NotificationService();
