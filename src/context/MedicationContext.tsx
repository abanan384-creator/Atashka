import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  Medication,
  MedicationEvent,
  ActiveScreen,
  LocalUserProfile,
  ParsedMedication,
} from "../types/medication";
import {
  REMINDER_SNOOZE_MINUTES,
  DEMO_ACCELERATED_SNOOZE_SECONDS,
  STORAGE_KEYS,
  AUDIO_PHRASES,
} from "../constants/config";
import { audioService } from "../services/audio";
import { defaultPrescriptionAnalyzer } from "../services/prescriptionAnalyzer";
import { reminderEngine } from "../services/reminderEngine";
import { notificationService } from "../services/notificationService";
import {
  notifyGuardian,
  getActiveGuardianLinkId,
  setActiveGuardianLinkId,
  checkGuardianConnection,
} from "../services/guardianNotifications";
import { MedicationContext } from "./useMedication";

// Initial fallback medications if user resets data
const INITIAL_DEMO_MEDICATIONS: Medication[] = [
  {
    id: "med-demo-1",
    name: "Парацетамол",
    dosage: "1 таблетка",
    relationToFood: "after_food",
    instructions: "После еды, запить водой",
    color: "#64FF00",
  },
  {
    id: "med-demo-2",
    name: "Витамин D",
    dosage: "2 капли",
    relationToFood: "with_food",
    instructions: "Во время еды",
    color: "#3B82F6",
  },
];

function createTodayEventsFromMeds(meds: Medication[], timesMap?: Record<string, string[]>): MedicationEvent[] {
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const events: MedicationEvent[] = [];

  meds.forEach((med, idx) => {
    const times = timesMap?.[med.id] || (idx === 0 ? ["08:00", "20:00"] : ["13:00"]);
    times.forEach((t, tIdx) => {
      events.push({
        id: `ev-${med.id}-${tIdx}`,
        medicationId: med.id,
        scheduledAt: `${todayDateStr}T${t}:00`,
        timeString: t,
        status: "scheduled",
        cycleCount: 0,
      });
    });
  });

  return events.sort((a, b) => a.timeString.localeCompare(b.timeString));
}

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User Profile
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // 2. Medications
  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_DEMO_MEDICATIONS;
  });

  // 3. Events (Today's daily schedule)
  const [events, setEvents] = useState<MedicationEvent[]>(() => {
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (saved) {
        const parsed: MedicationEvent[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isToday = parsed.some((e) => e.scheduledAt?.startsWith(todayDateStr));
          if (isToday) {
            return parsed;
          }
          // Roll over to today's date
          return parsed.map((e) => ({
            ...e,
            scheduledAt: `${todayDateStr}T${e.timeString}:00`,
            status: "scheduled",
            cycleCount: 0,
            confirmedAt: undefined,
            snoozedUntil: undefined,
          }));
        }
      }
    } catch {}

    return createTodayEventsFromMeds(INITIAL_DEMO_MEDICATIONS);
  });

  // 4. Active Screen determination based on onboarding status
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (savedProfile) {
        const parsed: LocalUserProfile = JSON.parse(savedProfile);
        if (parsed.onboardingCompleted) {
          return "home";
        }
        if (parsed.name) {
          return "onboarding_scan";
        }
      }
    } catch {}
    return "onboarding_name";
  });

  // 5. Prescription scanning & AI parsing state
  const [parsedMedications, setParsedMedications] = useState<ParsedMedication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRESCRIPTION_SCAN);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 6. Currently active reminder event (if any)
  const [activeReminderId, setActiveReminderId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
    } catch {
      return null;
    }
  });

  // 7. AI Call Modal event
  const [aiCallEventId, setAiCallEventId] = useState<string | null>(null);

  // 8. Demo mode toggle (accelerates snooze from 5 min to 6 sec for hackathon reviewers)
  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEMO_MODE_ENABLED);
      return saved !== null ? JSON.parse(saved) : true; // Default ON for smooth hackathon testing
    } catch {
      return true;
    }
  });

  // 9. Audio guidance
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIO_ENABLED);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // 10. Game resume state
  const [savedGameResumeState, setSavedGameResumeState] = useState<boolean>(false);

  // 11. Guardian / Telegram connection state
  const [guardianLinkId, setGuardianLinkIdState] = useState<string | null>(() => {
    return getActiveGuardianLinkId();
  });
  const [guardianConnected, setGuardianConnected] = useState<boolean>(false);

  const refreshGuardianStatus = useCallback(async () => {
    const status = await checkGuardianConnection(guardianLinkId || undefined);
    setGuardianConnected(status.connected);
  }, [guardianLinkId]);

  useEffect(() => {
    let isMounted = true;
    checkGuardianConnection(guardianLinkId || undefined)
      .then((status) => {
        if (isMounted) {
          setGuardianConnected(status.connected);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [guardianLinkId]);

  const setGuardianLinkId = useCallback((id: string | null) => {
    setGuardianLinkIdState(id);
    setActiveGuardianLinkId(id);
    if (userProfile) {
      setUserProfile((prev) => (prev ? { ...prev, guardianLinkId: id || undefined } : null));
    }
    checkGuardianConnection(id || undefined)
      .then((s) => setGuardianConnected(s.connected))
      .catch(() => {});
  }, [userProfile]);

  // Timers ref for snooze and reminders
  const snoozeTimersRef = useRef<Map<string, number>>(new Map());

  // Listen to audio speaking status
  useEffect(() => {
    audioService.setSpeakingListener((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  // Save profile to localStorage
  useEffect(() => {
    try {
      if (userProfile) {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      }
    } catch {}
  }, [userProfile]);

  // Save medications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    } catch {}
  }, [medications]);

  // Save events to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch {}
  }, [events]);

  // Save active reminder ID to localStorage
  useEffect(() => {
    try {
      if (activeReminderId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, activeReminderId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
      }
    } catch {}
  }, [activeReminderId]);

  const setDemoMode = useCallback((val: boolean) => {
    setDemoModeState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE_ENABLED, JSON.stringify(val));
    } catch {}
  }, []);

  const setAudioEnabled = useCallback((val: boolean) => {
    setAudioEnabledState(val);
    audioService.setEnabled(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_ENABLED, JSON.stringify(val));
    } catch {}
  }, []);

  // Sync audio enabled state
  useEffect(() => {
    audioService.setEnabled(audioEnabled);
  }, [audioEnabled]);

  // Real-time clock tick to keep nextMedicationInfo dynamically up-to-date
  const [currentMinuteTimestamp, setCurrentMinuteTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentMinuteTimestamp(Date.now());
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  // Derive next medication info for HomeView and ScheduleView
  const nextMedicationInfo = useMemo(() => {
    if (!events || events.length === 0) return null;

    // Chronologically sorted events by time of day
    const sorted = [...events].sort((a, b) => a.timeString.localeCompare(b.timeString));

    // 1. If any event is actively ringing (reminder_active) or snoozed right now, that is the immediate intake
    const activeOrSnoozed = sorted.find(
      (e) => e.status === "reminder_active" || e.status === "snoozed"
    );
    if (activeOrSnoozed) {
      const med = medications.find((m) => m.id === activeOrSnoozed.medicationId);
      return {
        time: activeOrSnoozed.timeString,
        medicationName: med ? med.name : "Лекарство",
        isDueNow: true,
      };
    }

    // 2. Real-time comparison with current clock (HH:mm)
    const now = new Date(currentMinuteTimestamp);
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // Find the next upcoming scheduled intake TODAY that hasn't been confirmed yet
    const upcomingToday = sorted.find(
      (e) => e.timeString >= currentTimeStr && e.status !== "confirmed_taken"
    );

    if (upcomingToday) {
      const med = medications.find((m) => m.id === upcomingToday.medicationId);
      return {
        time: upcomingToday.timeString,
        medicationName: med ? med.name : "Лекарство",
        isDueNow: false,
      };
    }

    // 3. If all scheduled intakes for today have passed or were confirmed:
    // Display the first scheduled dose of tomorrow's routine
    const firstDailyEvent = sorted[0];
    if (firstDailyEvent) {
      const med = medications.find((m) => m.id === firstDailyEvent.medicationId);
      return {
        time: `${firstDailyEvent.timeString} (завтра)`,
        medicationName: med ? med.name : "Лекарство",
        isDueNow: false,
        isTomorrow: true,
      };
    }

    return null;
  }, [events, medications, currentMinuteTimestamp]);

  // Derive current active reminder event
  const activeReminderEvent = useMemo(() => {
    if (!activeReminderId) return null;
    return events.find((e) => e.id === activeReminderId && (e.status === "reminder_active" || e.status === "confirmation_unknown")) || null;
  }, [activeReminderId, events]);

  // Derive current AI call event
  const aiCallEvent = useMemo(() => {
    if (!aiCallEventId) return null;
    return events.find((e) => e.id === aiCallEventId) || null;
  }, [aiCallEventId, events]);

  // Helper to activate a reminder
  const activateReminder = useCallback((eventId: string, isRepeated: boolean = false) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            status: "reminder_active",
            isRepeatedReminder: isRepeated,
            snoozedUntil: undefined,
          };
        }
        return e;
      })
    );

    setActiveReminderId(eventId);

    // Rule #6 & #18: Medication reminder takes priority over the game!
    setActiveScreen((currentScreen) => {
      if (currentScreen === "game") {
        setSavedGameResumeState(true);
      }
      return currentScreen;
    });

    // Notify user via Web Notification if supported
    const targetEvent = events.find((e) => e.id === eventId);
    const med = targetEvent ? medications.find((m) => m.id === targetEvent.medicationId) : null;
    if (targetEvent && med) {
      notificationService.showMedicationNotification(
        "Пора принять лекарство",
        `${med.name} (${med.dosage || "1 доза"})`,
        eventId
      );
    }

    // Play alarm audio
    audioService.playAlarm();
  }, [events, medications]);

  // Initialize and run centralized ReminderEngine
  useEffect(() => {
    // Only run reminder engine if user has finished onboarding
    if (!userProfile?.onboardingCompleted) return;

    // Check for overdue reminders upon recovery (Requirement 17)
    const overdue = reminderEngine.recoverOverdue(events);
    if (overdue && !activeReminderId) {
      const recoveryTimer = window.setTimeout(() => {
        activateReminder(overdue.id, overdue.cycleCount > 0);
      }, 50);
      return () => window.clearTimeout(recoveryTimer);
    }

    // Start tick listener
    reminderEngine.start(
      () => events,
      (eventId, isRepeated) => {
        activateReminder(eventId, isRepeated);
      },
      2500
    );

    return () => {
      reminderEngine.stop();
    };
  }, [userProfile?.onboardingCompleted, events, activeReminderId, activateReminder]);

  // Monitor snooze timeouts with exact timers
  useEffect(() => {
    const timers = snoozeTimersRef.current;
    timers.forEach((timerId) => window.clearTimeout(timerId));
    timers.clear();

    const now = Date.now();

    events.forEach((event) => {
      if (event.status === "snoozed" && event.snoozedUntil) {
        const snoozeEnd = new Date(event.snoozedUntil).getTime();
        const diffMs = snoozeEnd - now;

        if (diffMs <= 0) {
          // Snooze expired while app was closed / refreshed -> activate repeated reminder immediately!
          activateReminder(event.id, true);
        } else {
          const timerId = window.setTimeout(() => {
            activateReminder(event.id, true);
          }, diffMs);
          timers.set(event.id, timerId);
        }
      }
    });

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, [events, activateReminder]);

  // ==========================================
  // ONBOARDING ACTIONS
  // ==========================================

  const saveUserName = useCallback((name: string) => {
    const profile: LocalUserProfile = {
      id: `user-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
      guardianLinkId: guardianLinkId || undefined,
    };
    setUserProfile(profile);
    setActiveScreen("onboarding_scan");
    audioService.playChime("confirm");
  }, [guardianLinkId]);

  const uploadPrescriptionImage = useCallback(async (file: File | Blob | string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const parsed = await defaultPrescriptionAnalyzer.analyze(file);
      setParsedMedications(parsed);
      setIsAnalyzing(false);
      setActiveScreen("onboarding_review");
      audioService.playChime("confirm");
      try {
        localStorage.setItem(STORAGE_KEYS.PRESCRIPTION_SCAN, JSON.stringify(parsed));
      } catch {}
    } catch {
      setIsAnalyzing(false);
      setAnalysisError("Не удалось прочитать назначение");
      audioService.playChime("snooze");
    }
  }, []);

  const confirmExtractedSchedule = useCallback((confirmedMeds: ParsedMedication[]) => {
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const newMeds: Medication[] = confirmedMeds.map((m, idx) => ({
      id: `med-${Date.now()}-${idx}`,
      name: m.name,
      dosage: m.dosage || "1 доза",
      relationToFood: m.relationToFood || "after_food",
      instructions: m.instructions || "По назначению врача",
      color: idx % 2 === 0 ? "#64FF00" : "#3B82F6",
    }));

    const newEvents: MedicationEvent[] = [];
    newMeds.forEach((med, mIdx) => {
      const source = confirmedMeds[mIdx];
      source.times.forEach((timeStr, tIdx) => {
        newEvents.push({
          id: `ev-${Date.now()}-${mIdx}-${tIdx}`,
          medicationId: med.id,
          scheduledAt: `${todayDateStr}T${timeStr}:00`,
          timeString: timeStr,
          status: "scheduled",
          cycleCount: 0,
        });
      });
    });

    newEvents.sort((a, b) => a.timeString.localeCompare(b.timeString));

    setMedications(newMeds);
    setEvents(newEvents);
    setActiveScreen("onboarding_success");
    audioService.playChime("confirm");

    // Telegram Guardian Notification (Requirement 5: schedule_updated)
    notifyGuardian({
      guardianLinkId: guardianLinkId || undefined,
      type: "schedule_updated",
      seniorName: userProfile?.name,
    }).catch((err) => console.warn("[GuardianNotification] Failed to send schedule_updated:", err));
  }, [guardianLinkId, userProfile?.name]);

  const finishOnboarding = useCallback(() => {
    setUserProfile((prev) => {
      const updated = prev
        ? { ...prev, onboardingCompleted: true }
        : { id: "user-1", name: "Анна", createdAt: new Date().toISOString(), onboardingCompleted: true };
      return updated;
    });
    setActiveScreen("home");
    audioService.playChime("confirm");
  }, []);

  const restartOnboarding = useCallback((toScanOnly: boolean = false) => {
    if (toScanOnly) {
      setActiveScreen("onboarding_scan");
    } else {
      setActiveScreen("onboarding_name");
    }
  }, []);

  // ==========================================
  // CORE REMINDER DOMAIN ACTIONS
  // ==========================================

  // 1. Primary Action: ПРИНЯТЬ ЛЕКАРСТВО
  const openMedicationFlow = useCallback(() => {
    if (activeReminderEvent) return;

    const candidate = events.find(
      (e) => e.status === "reminder_active" || e.status === "confirmation_unknown" || e.status === "snoozed" || e.status === "scheduled"
    );

    if (candidate) {
      activateReminder(candidate.id, candidate.cycleCount > 0);
    } else {
      audioService.speak("Все запланированные лекарства на сегодня уже приняты.");
    }
  }, [activeReminderEvent, events, activateReminder]);

  // 2. Action: "ДА, Я ПРИНЯЛ" (confirmed_taken)
  const confirmMedicationTaken = useCallback((eventId: string) => {
    const timers = snoozeTimersRef.current;
    const existingTimer = timers.get(eventId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timers.delete(eventId);
    }

    const nowIso = new Date().toISOString();

    const targetEvent = events.find((e) => e.id === eventId);
    const med = targetEvent ? medications.find((m) => m.id === targetEvent.medicationId) : null;

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            status: "confirmed_taken",
            confirmedAt: nowIso,
            snoozedUntil: undefined,
            isRepeatedReminder: false,
          };
        }
        return e;
      })
    );

    setActiveReminderId(null);
    setAiCallEventId(null);
    reminderEngine.clearLastTriggered();

    audioService.playChime("confirm");
    audioService.speak(AUDIO_PHRASES.MEDICATION_TAKEN);

    // Telegram Guardian Notification (Requirement 2: medication_taken)
    // Non-blocking background dispatch
    if (targetEvent && med) {
      notifyGuardian({
        guardianLinkId: guardianLinkId || undefined,
        type: "medication_taken",
        seniorName: userProfile?.name,
        medication: med.name,
        time: targetEvent.timeString,
      }).catch((err) => console.warn("[GuardianNotification] Failed to send medication_taken:", err));
    }
  }, [events, medications, guardianLinkId, userProfile?.name]);

  // 3. Action: "НЕТ, Я НЕ ПРИНЯЛ" (snooze for 5 minutes)
  const snoozeMedicationReminder = useCallback((eventId: string) => {
    const snoozeDurationMs = demoMode
      ? DEMO_ACCELERATED_SNOOZE_SECONDS * 1000
      : REMINDER_SNOOZE_MINUTES * 60 * 1000;

    const snoozedUntil = new Date(Date.now() + snoozeDurationMs).toISOString();

    const timers = snoozeTimersRef.current;
    const existingTimer = timers.get(eventId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timers.delete(eventId);
    }

    const targetEvent = events.find((e) => e.id === eventId);
    const med = targetEvent ? medications.find((m) => m.id === targetEvent.medicationId) : null;

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            status: "snoozed",
            snoozedUntil: snoozedUntil,
            cycleCount: e.cycleCount + 1,
            isRepeatedReminder: false,
          };
        }
        return e;
      })
    );

    setActiveReminderId(null);
    setAiCallEventId(null);
    reminderEngine.clearLastTriggered();

    audioService.playChime("snooze");
    audioService.speak(AUDIO_PHRASES.SNOOZE_CONFIRMATION);

    const timerId = window.setTimeout(() => {
      activateReminder(eventId, true);
    }, snoozeDurationMs);
    timers.set(eventId, timerId);

    // Telegram Guardian Notification (Requirement 3: medication_snoozed)
    // Non-blocking background dispatch
    if (targetEvent && med) {
      notifyGuardian({
        guardianLinkId: guardianLinkId || undefined,
        type: "medication_snoozed",
        seniorName: userProfile?.name,
        medication: med.name,
        time: targetEvent.timeString,
      }).catch((err) => console.warn("[GuardianNotification] Failed to send medication_snoozed:", err));
    }
  }, [demoMode, activateReminder, events, medications, guardianLinkId, userProfile?.name]);

  // Action: Trigger immediate reminder for testing
  const triggerImmediateReminder = useCallback((eventId?: string) => {
    const targetId = eventId || events.find((e) => e.status !== "confirmed_taken")?.id || events[0]?.id;
    if (targetId) {
      activateReminder(targetId, false);
    }
  }, [events, activateReminder]);

  // Action: Dismiss reminder modal (keeps status as confirmation_unknown, safe rule #5)
  const dismissReminderModal = useCallback(() => {
    if (activeReminderId) {
      const targetEvent = events.find((e) => e.id === activeReminderId);
      const med = targetEvent ? medications.find((m) => m.id === targetEvent.medicationId) : null;

      // Telegram Guardian Notification (Requirement 4: medication_unconfirmed)
      // Send alert when repeated reminder finishes without confirmation
      if (targetEvent && med && (targetEvent.isRepeatedReminder || targetEvent.cycleCount > 0)) {
        notifyGuardian({
          guardianLinkId: guardianLinkId || undefined,
          type: "medication_unconfirmed",
          seniorName: userProfile?.name,
          medication: med.name,
          time: targetEvent.timeString,
        }).catch((err) => console.warn("[GuardianNotification] Failed to send medication_unconfirmed:", err));
      }

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === activeReminderId) {
            return {
              ...e,
              status: "confirmation_unknown",
            };
          }
          return e;
        })
      );
      setActiveReminderId(null);
      reminderEngine.clearLastTriggered();
    }
  }, [activeReminderId, events, medications, guardianLinkId, userProfile?.name]);

  // Action: Trigger AI Call simulation
  const triggerAICall = useCallback((eventId?: string) => {
    const targetId = eventId || activeReminderId || events.find((e) => e.status !== "confirmed_taken")?.id || events[0]?.id;
    if (targetId) {
      setActiveReminderId(null);
      setAiCallEventId(targetId);
    }
  }, [activeReminderId, events]);

  const dismissAICall = useCallback(() => {
    if (aiCallEventId) {
      const targetEvent = events.find((e) => e.id === aiCallEventId);
      const med = targetEvent ? medications.find((m) => m.id === targetEvent.medicationId) : null;

      // Telegram Guardian Notification (Requirement 4: medication_unconfirmed)
      if (targetEvent && med && targetEvent.status !== "confirmed_taken") {
        notifyGuardian({
          guardianLinkId: guardianLinkId || undefined,
          type: "medication_unconfirmed",
          seniorName: userProfile?.name,
          medication: med.name,
          time: targetEvent.timeString,
        }).catch((err) => console.warn("[GuardianNotification] Failed to send medication_unconfirmed:", err));
      }

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === aiCallEventId && e.status !== "confirmed_taken") {
            return {
              ...e,
              status: "confirmation_unknown",
            };
          }
          return e;
        })
      );
      setAiCallEventId(null);
    }
  }, [aiCallEventId, events, medications, guardianLinkId, userProfile?.name]);

  // Action: Reset all data and restart flow
  const resetAllData = useCallback(() => {
    const timers = snoozeTimersRef.current;
    timers.forEach((timerId) => window.clearTimeout(timerId));
    timers.clear();

    setUserProfile(null);
    setMedications(INITIAL_DEMO_MEDICATIONS);
    setEvents(createTodayEventsFromMeds(INITIAL_DEMO_MEDICATIONS));
    setParsedMedications([]);
    setActiveReminderId(null);
    setAiCallEventId(null);
    setActiveScreen("onboarding_name");
    setSavedGameResumeState(false);
    reminderEngine.stop();

    try {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.PRESCRIPTION_SCAN);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
      localStorage.removeItem(STORAGE_KEYS.MEDICATIONS);
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
    } catch {}

    audioService.playChime("reminder");
  }, []);

  const speak = useCallback((text: string) => {
    audioService.playClick();
    audioService.speak(text);
  }, []);

  const playClick = useCallback(() => {
    audioService.playClick();
  }, []);

  return (
    <MedicationContext.Provider
      value={{
        userProfile,
        saveUserName,
        medications,
        events,
        activeScreen,
        setActiveScreen,
        parsedMedications,
        isAnalyzing,
        analysisError,
        uploadPrescriptionImage,
        confirmExtractedSchedule,
        finishOnboarding,
        restartOnboarding,
        activeReminderEvent,
        nextMedicationInfo,
        demoMode,
        setDemoMode,
        audioEnabled,
        setAudioEnabled,
        isSpeaking,
        speak,
        playClick,
        savedGameResumeState,
        aiCallEvent,
        triggerAICall,
        dismissAICall,
        guardianLinkId,
        setGuardianLinkId,
        guardianConnected,
        refreshGuardianStatus,
        openMedicationFlow,
        confirmMedicationTaken,
        snoozeMedicationReminder,
        triggerImmediateReminder,
        resetAllData,
        dismissReminderModal,
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
};
