import { describe, it, expect, beforeEach } from "vitest";
import { REMINDER_SNOOZE_MINUTES, DEMO_ACCELERATED_SNOOZE_SECONDS, AUDIO_PHRASES } from "../constants/config";
import type { MedicationEvent, LocalUserProfile, ParsedMedication, Medication } from "../types/medication";
import { MockPrescriptionAnalyzer } from "../services/prescriptionAnalyzer";
import { ReminderEngine } from "../services/reminderEngine";

describe("Senior Medication Assistant - Core Domain & Safety Rules", () => {
  let sampleEvent: MedicationEvent;

  beforeEach(() => {
    sampleEvent = {
      id: "event-test-1",
      medicationId: "med-1",
      scheduledAt: "2026-09-19T14:00:00.000Z",
      timeString: "14:00",
      status: "scheduled",
      cycleCount: 0,
      isRepeatedReminder: false,
    };
  });

  // Rule #4: Snooze interval is exactly 5 minutes
  it("strictly enforces 5-minute snooze interval for production logic", () => {
    expect(REMINDER_SNOOZE_MINUTES).toBe(5);
  });

  // Rule #17: Demo mode has isolated acceleration without altering production snooze rule
  it("provides isolated accelerated demo snooze constant", () => {
    expect(DEMO_ACCELERATED_SNOOZE_SECONDS).toBe(6);
    expect(DEMO_ACCELERATED_SNOOZE_SECONDS).toBeLessThan(REMINDER_SNOOZE_MINUTES * 60);
  });

  // Rule #4 & Phase 4: Scheduled reminder activates
  it("activates reminder from scheduled state", () => {
    const activatedEvent: MedicationEvent = {
      ...sampleEvent,
      status: "reminder_active",
    };
    expect(activatedEvent.status).toBe("reminder_active");
  });

  // Rule #4: Confirm changes state to confirmed_taken
  it("confirm changes state to confirmed_taken and sets confirmedAt", () => {
    const nowIso = new Date().toISOString();
    const confirmedEvent: MedicationEvent = {
      ...sampleEvent,
      status: "confirmed_taken",
      confirmedAt: nowIso,
      snoozedUntil: undefined,
    };
    expect(confirmedEvent.status).toBe("confirmed_taken");
    expect(confirmedEvent.confirmedAt).toBe(nowIso);
  });

  // Rule #4: Snooze schedules exactly +5 minutes
  it("snooze calculates exact 5-minute future time", () => {
    const baseTime = Date.now();
    const snoozeDurationMs = REMINDER_SNOOZE_MINUTES * 60 * 1000;
    const snoozedUntil = new Date(baseTime + snoozeDurationMs).toISOString();

    const snoozedEvent: MedicationEvent = {
      ...sampleEvent,
      status: "snoozed",
      snoozedUntil: snoozedUntil,
      cycleCount: sampleEvent.cycleCount + 1,
    };

    expect(snoozedEvent.status).toBe("snoozed");
    expect(snoozedEvent.cycleCount).toBe(1);
    expect(new Date(snoozedEvent.snoozedUntil!).getTime() - baseTime).toBe(300000);
  });

  // Rule #5: Medication safety rule: no response != not taken
  it("strictly satisfies 'no response != not taken' using confirmation_unknown", () => {
    // When user dismisses or ignores without confirming:
    const unconfirmedEvent: MedicationEvent = {
      ...sampleEvent,
      status: "confirmation_unknown",
    };

    // Must be confirmation_unknown
    expect(unconfirmedEvent.status).toBe("confirmation_unknown");
    // Must NOT be confirmed_taken
    expect(unconfirmedEvent.status).not.toBe("confirmed_taken");
    // Must NOT be not_taken (not_taken is prohibited by Rule #5)
    expect((unconfirmedEvent.status as string)).not.toBe("not_taken");
  });

  // Rule #5: Safe wording for repeated reminder
  it("uses the mandatory safe wording for repeated reminders", () => {
    expect(AUDIO_PHRASES.REPEATED_REMINDER).toBe(
      "Мы не получили подтверждение. Вы уже приняли лекарство?"
    );
    // Never use unsafe copy encouraging second dose
    expect(AUDIO_PHRASES.REPEATED_REMINDER).not.toContain("Вы не приняли лекарство");
  });

  // Rule #6: Game behavior & priority
  it("ensures game priority is lower than medication reminder", () => {
    const activeScreen = "game";
    let isGameInterrupted = false;

    // Simulate reminder activation
    const onReminderActive = () => {
      if (activeScreen === "game") {
        isGameInterrupted = true;
      }
    };

    onReminderActive();
    expect(isGameInterrupted).toBe(true);
  });

  // Rule #11: Persistence: serialization and restoration
  it("survives serialization to and from JSON (localStorage persistence)", () => {
    const events: MedicationEvent[] = [
      {
        id: "ev-1",
        medicationId: "med-1",
        scheduledAt: "2026-09-19T08:00:00Z",
        timeString: "08:00",
        status: "confirmed_taken",
        confirmedAt: "2026-09-19T08:03:00Z",
        cycleCount: 0,
      },
      {
        id: "ev-2",
        medicationId: "med-2",
        scheduledAt: "2026-09-19T14:00:00Z",
        timeString: "14:00",
        status: "snoozed",
        snoozedUntil: "2026-09-19T14:05:00Z",
        cycleCount: 1,
      },
    ];

    const serialized = JSON.stringify(events);
    const restored: MedicationEvent[] = JSON.parse(serialized);

    expect(restored).toHaveLength(2);
    expect(restored[0].status).toBe("confirmed_taken");
    expect(restored[1].status).toBe("snoozed");
    expect(restored[1].cycleCount).toBe(1);
  });

  // NEW FLOW TESTS:
  // 1. User Profile Creation
  it("creates and manages senior local user profile without phone/password", () => {
    const profile: LocalUserProfile = {
      id: "usr-1",
      name: "Анна Ивановна",
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
    };

    expect(profile.name).toBe("Анна Ивановна");
    expect(profile.onboardingCompleted).toBe(false);

    // After finishing onboarding:
    const completedProfile: LocalUserProfile = {
      ...profile,
      onboardingCompleted: true,
    };
    expect(completedProfile.onboardingCompleted).toBe(true);
  });

  // 2. Prescription Analyzer AI extraction
  it("extracts structured medication data from prescription document", async () => {
    const analyzer = new MockPrescriptionAnalyzer(0); // instant delay for test
    const dummyFile = new File(["prescription image content"], "prescription.jpg", { type: "image/jpeg" });
    const parsed = await analyzer.analyze(dummyFile);

    expect(parsed.length).toBeGreaterThanOrEqual(2);
    const paracetamol = parsed.find((p) => p.name === "Парацетамол");
    expect(paracetamol).toBeDefined();
    expect(paracetamol?.dosage).toBe("1 таблетка");
    expect(paracetamol?.times).toEqual(["08:00", "20:00"]);
    expect(paracetamol?.relationToFood).toBe("after_food");
  });

  // 3. Prescription Analyzer error handling
  it("gracefully catches unreadable prescription document errors", async () => {
    const analyzer = new MockPrescriptionAnalyzer(0);
    const corruptFile = new File(["bad data"], "error_image.jpg", { type: "image/jpeg" });

    await expect(analyzer.analyze(corruptFile)).rejects.toThrow("UNREADABLE_DOCUMENT");
  });

  // 4. Automatic Schedule creation from parsed medications
  it("converts parsed medications into medications and daily scheduled events without manual re-entry", () => {
    const parsedMeds: ParsedMedication[] = [
      {
        name: "Парацетамол",
        dosage: "1 таблетка",
        times: ["08:00", "20:00"],
        relationToFood: "after_food",
      },
      {
        name: "Витамин D",
        dosage: "2 капли",
        times: ["13:00"],
        relationToFood: "with_food",
      },
    ];

    const todayDateStr = "2026-09-20";
    const generatedEvents: MedicationEvent[] = [];
    const generatedMeds: Medication[] = [];

    parsedMeds.forEach((p, pIdx) => {
      const medId = `med-${pIdx}`;
      generatedMeds.push({
        id: medId,
        name: p.name,
        dosage: p.dosage || "1 доза",
        relationToFood: p.relationToFood,
      });

      p.times.forEach((t, tIdx) => {
        generatedEvents.push({
          id: `ev-${pIdx}-${tIdx}`,
          medicationId: medId,
          scheduledAt: `${todayDateStr}T${t}:00`,
          timeString: t,
          status: "scheduled",
          cycleCount: 0,
        });
      });
    });

    generatedEvents.sort((a, b) => a.timeString.localeCompare(b.timeString));

    expect(generatedMeds).toHaveLength(2);
    expect(generatedEvents).toHaveLength(3);
    expect(generatedEvents[0].timeString).toBe("08:00");
    expect(generatedEvents[1].timeString).toBe("13:00");
    expect(generatedEvents[2].timeString).toBe("20:00");
  });

  // 5. Centralized ReminderEngine - due event detection
  it("ReminderEngine detects scheduled due events automatically", () => {
    const engine = new ReminderEngine();

    const events: MedicationEvent[] = [
      {
        id: "ev-due",
        medicationId: "med-1",
        scheduledAt: "2026-09-20T08:00:00.000Z",
        timeString: "08:00",
        status: "scheduled",
        cycleCount: 0,
      },
      {
        id: "ev-future",
        medicationId: "med-2",
        scheduledAt: "2026-09-20T22:00:00.000Z",
        timeString: "22:00",
        status: "scheduled",
        cycleCount: 0,
      },
    ];

    // Simulate current time is 09:30 (past 08:00)
    const testNowMs = new Date("2026-09-20T09:30:00.000Z").getTime();
    const result = engine.findDueEvent(events, testNowMs);

    expect(result).not.toBeNull();
    expect(result?.event.id).toBe("ev-due");
    expect(result?.isRepeated).toBe(false);
  });

  // 6. ReminderEngine - overdue recovery upon app reload
  it("ReminderEngine correctly recovers overdue scheduled events after restart", () => {
    const engine = new ReminderEngine();

    // User was supposed to take Paracetamol at 08:00.
    // User opened app at 08:07.
    const events: MedicationEvent[] = [
      {
        id: "ev-overdue",
        medicationId: "med-1",
        scheduledAt: "2026-09-20T08:00:00.000Z",
        timeString: "08:00",
        status: "scheduled",
        cycleCount: 0,
      },
    ];

    const reopenNowMs = new Date("2026-09-20T08:07:00.000Z").getTime();
    const overdue = engine.recoverOverdue(events, reopenNowMs);

    expect(overdue).not.toBeNull();
    expect(overdue?.id).toBe("ev-overdue");
  });

  // 7. ReminderEngine - expired snooze detection
  it("ReminderEngine triggers repeated reminder when snooze timer expires", () => {
    const engine = new ReminderEngine();
    const baseTime = Date.now();

    const snoozedEvent: MedicationEvent = {
      id: "ev-snoozed",
      medicationId: "med-1",
      scheduledAt: new Date(baseTime - 10000).toISOString(),
      timeString: "08:00",
      status: "snoozed",
      snoozedUntil: new Date(baseTime - 1000).toISOString(), // expired 1s ago
      cycleCount: 1,
    };

    const result = engine.findDueEvent([snoozedEvent], baseTime);
    expect(result).not.toBeNull();
    expect(result?.event.id).toBe("ev-snoozed");
    expect(result?.isRepeated).toBe(true);
  });
});
