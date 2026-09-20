import type { MedicationEvent } from "../types/medication";

export interface ReminderTriggerHandler {
  (eventId: string, isRepeated: boolean): void;
}

export class ReminderEngine {
  private timerInterval: number | null = null;
  private onTrigger: ReminderTriggerHandler | null = null;
  private getEvents: (() => MedicationEvent[]) | null = null;
  private lastTriggeredId: string | null = null;

  /**
   * Evaluates if any event is due (scheduled time reached or snooze timer expired)
   */
  public findDueEvent(events: MedicationEvent[], nowMs: number = Date.now()): { event: MedicationEvent; isRepeated: boolean } | null {
    // 1. First check snoozed events whose snooze period has expired
    for (const event of events) {
      if (event.status === "snoozed" && event.snoozedUntil) {
        const snoozeTime = new Date(event.snoozedUntil).getTime();
        if (nowMs >= snoozeTime) {
          return { event, isRepeated: true };
        }
      }
    }

    // 2. Check scheduled events whose scheduled time has been reached or is overdue today
    // Convert current time to "HH:MM"
    const now = new Date(nowMs);
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const event of events) {
      if (event.status === "scheduled") {
        const scheduledDate = new Date(event.scheduledAt);
        // If scheduledAt is an absolute date <= nowMs
        if (scheduledDate.getTime() <= nowMs || event.timeString <= currentTimeStr) {
          return { event, isRepeated: false };
        }
      }
    }

    return null;
  }

  /**
   * Recovery on app open: checks for overdue scheduled/snoozed events
   */
  public recoverOverdue(events: MedicationEvent[], nowMs: number = Date.now()): MedicationEvent | null {
    const due = this.findDueEvent(events, nowMs);
    return due ? due.event : null;
  }

  public start(getEvents: () => MedicationEvent[], onTrigger: ReminderTriggerHandler, intervalMs: number = 2000) {
    this.stop();
    this.getEvents = getEvents;
    this.onTrigger = onTrigger;

    // Run immediate check
    this.tick();

    // Start interval
    if (typeof window !== "undefined") {
      this.timerInterval = window.setInterval(() => {
        this.tick();
      }, intervalMs);
    }
  }

  public stop() {
    if (this.timerInterval !== null && typeof window !== "undefined") {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.lastTriggeredId = null;
  }

  private tick() {
    if (!this.getEvents || !this.onTrigger) return;

    const events = this.getEvents();
    const due = this.findDueEvent(events);

    if (due && due.event.id !== this.lastTriggeredId) {
      this.lastTriggeredId = due.event.id;
      this.onTrigger(due.event.id, due.isRepeated);
    }
  }

  public clearLastTriggered() {
    this.lastTriggeredId = null;
  }
}

export const reminderEngine = new ReminderEngine();
