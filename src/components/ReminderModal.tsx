import React, { useEffect } from "react";
import { AlarmClock, CheckCircle2, Clock, AlertTriangle, X, Mic } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { speechRecognitionService } from "../services/speechRecognition";
import type { RelationToFood } from "../types/medication";

const FOOD_LABELS: Record<RelationToFood, string> = {
  before_food: "До еды",
  after_food: "После еды",
  with_food: "Во время еды",
  unknown: "",
};

export const ReminderModal: React.FC = () => {
  const {
    activeReminderEvent,
    userProfile,
    medications,
    confirmMedicationTaken,
    snoozeMedicationReminder,
    dismissReminderModal,
    speak,
    triggerAICall,
  } = useMedication();

  const med = activeReminderEvent
    ? medications.find((m) => m.id === activeReminderEvent.medicationId)
    : null;

  const isRepeated = activeReminderEvent
    ? activeReminderEvent.isRepeatedReminder || activeReminderEvent.cycleCount > 0
    : false;

  const userName = userProfile?.name || "";

  // Speak aloud when reminder activates
  useEffect(() => {
    if (activeReminderEvent && med) {
      const phrase = isRepeated
        ? `Мы не получили подтверждение. ${userName ? `${userName}, вы` : "Вы"} уже приняли ${med.name}?`
        : `${userName ? `${userName}, пора` : "Пора"} принять ${med.name}. ${med.dosage}.`;
      speak(phrase);
    }
  }, [activeReminderEvent?.id, isRepeated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice recognition support if available
  useEffect(() => {
    if (activeReminderEvent && speechRecognitionService.isSupported()) {
      speechRecognitionService.startListening({
        onConfirm: () => {
          speak("Принято голосом. Будьте здоровы!");
          confirmMedicationTaken(activeReminderEvent.id);
        },
        onSnooze: () => {
          speak("Напомню через пять минут.");
          snoozeMedicationReminder(activeReminderEvent.id);
        },
      });
    }
    return () => {
      speechRecognitionService.stop();
    };
  }, [activeReminderEvent, confirmMedicationTaken, snoozeMedicationReminder, speak]);

  if (!activeReminderEvent || !med) return null;

  const relationLabel = med.relationToFood ? FOOD_LABELS[med.relationToFood] : "";

  const handleConfirm = () => {
    speak("Приём лекарства подтверждён! Будьте здоровы.");
    confirmMedicationTaken(activeReminderEvent.id);
  };

  const handleSnooze = () => {
    speak("Хорошо, напомню через пять минут.");
    snoozeMedicationReminder(activeReminderEvent.id);
  };

  const handleDismiss = () => {
    speak("Окно закрыто. Статус приёма остаётся неизвестным.");
    dismissReminderModal();
  };

  return (
    <div
      className="reminder-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-title"
    >
      <div className="reminder-modal">
        {/* Header section with accessible pill icon & dismiss button */}
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginBottom: -16 }}>
          <button
            type="button"
            className="icon-button"
            onClick={handleDismiss}
            aria-label="Закрыть окно без подтверждения"
            title="Закрыть (статус останется неизвестным)"
            style={{ width: 44, height: 44 }}
          >
            <X size={22} />
          </button>
        </div>

        <div className="reminder-header">
          <div className="reminder-icon-pill alarm-ringing" aria-hidden="true">
            <AlarmClock size={44} />
          </div>

          <h2 id="reminder-title" className="reminder-title">
            {userName ? `${userName}, пора принять лекарство` : "Пора принять лекарство"}
          </h2>
          <span style={{ fontSize: 18, color: "#94A3B8", fontWeight: 700, marginTop: 2 }}>
            Запланированное время: {activeReminderEvent.timeString}
          </span>
        </div>

        {/* Safety Rule #5: Exact safe wording for repeated reminder after snooze / no response */}
        {isRepeated && (
          <div className="repeated-reminder-banner" role="alert">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={22} />
              <span>Повторное напоминание</span>
            </div>
            <strong>Мы не получили подтверждение. Вы уже приняли лекарство?</strong>
          </div>
        )}

        {/* Medication Details */}
        <div className="medication-detail-card">
          <span className="medication-name-highlight">
            {med.name}
          </span>
          <span className="medication-dosage-highlight">
            {med.dosage}
          </span>
          {relationLabel && (
            <span style={{ fontSize: 18, fontWeight: 700, color: "#64FF00", marginTop: 4 }}>
              {relationLabel}
            </span>
          )}
          {med.instructions && (
            <p className="medication-instruction-text">
              {med.instructions}
            </p>
          )}
        </div>

        {/* Action Buttons: "ДА, Я ПРИНЯЛ" and "НЕТ, Я НЕ ПРИНЯЛ" */}
        <div className="reminder-actions">
          {speechRecognitionService.isSupported() && (
            <div style={{ textAlign: "center", fontSize: 15, fontWeight: 600, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <Mic size={18} color="#64FF00" />
              <span>Вы можете нажать кнопку или сказать: <strong style={{ color: "#FFFFFF" }}>«Принял»</strong></span>
            </div>
          )}

          {/* Primary CTA: "ДА, Я ПРИНЯЛ" */}
          <button
            type="button"
            className="btn-confirm-taken"
            onClick={handleConfirm}
            aria-label="Да, я принял лекарство"
          >
            <CheckCircle2 size={36} />
            <span>ДА, Я ПРИНЯЛ</span>
          </button>

          {/* Secondary Snooze CTA: "НЕТ, Я НЕ ПРИНЯЛ" */}
          <button
            type="button"
            className="btn-snooze-action"
            onClick={handleSnooze}
            aria-label="Нет, я не принял. Напомнить через пять минут"
          >
            <Clock size={28} />
            <span>НЕТ, Я НЕ ПРИНЯЛ</span>
          </button>

          {/* If repeated reminder, show option to call AI Assistant */}
          {isRepeated && activeReminderEvent.cycleCount >= 1 && (
            <button
              type="button"
              className="btn-back"
              style={{
                marginTop: 6,
                justifyContent: "center",
                fontSize: 16,
                background: "#101B13",
                borderColor: "#16401E",
                color: "#64FF00",
              }}
              onClick={() => triggerAICall(activeReminderEvent.id)}
              aria-label="Звонок голосового помощника"
            >
              <span>🤖 Поговорить с голосовым помощником</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
