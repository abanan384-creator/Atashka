import React, { useEffect } from "react";
import { PhoneCall, CheckCircle2, Clock, PhoneOff, Bot } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { audioService } from "../services/audio";

export const AICallModal: React.FC = () => {
  const {
    aiCallEvent,
    userProfile,
    medications,
    confirmMedicationTaken,
    snoozeMedicationReminder,
    dismissAICall,
    speak,
  } = useMedication();

  useEffect(() => {
    if (aiCallEvent) {
      // Ringtone chime
      audioService.playChime("alarm");

      const userName = userProfile?.name || "Вам";
      const med = medications.find((m) => m.id === aiCallEvent.medicationId);
      const medName = med ? med.name : "лекарства";

      // Short delay for ringtone before speaking
      const t = setTimeout(() => {
        const text = `${userName}, мы не получили подтверждение приёма ${medName}. Вы уже приняли лекарство?`;
        speak(text);
      }, 900);

      return () => clearTimeout(t);
    }
  }, [aiCallEvent, userProfile, medications, speak]);

  if (!aiCallEvent) return null;

  const med = medications.find((m) => m.id === aiCallEvent.medicationId);
  const userName = userProfile?.name || "Вам";
  const medName = med ? med.name : "Лекарство";
  const medDosage = med?.dosage || "";

  const handleConfirm = () => {
    confirmMedicationTaken(aiCallEvent.id);
    dismissAICall();
  };

  const handleSnooze = () => {
    snoozeMedicationReminder(aiCallEvent.id);
    dismissAICall();
  };

  const handleDismiss = () => {
    speak("Звонок завершён. Напоминание остаётся в расписании.");
    dismissAICall();
  };

  return (
    <div
      className="reminder-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aicall-title"
      style={{ zIndex: 1100 }}
    >
      <div
        className="reminder-modal"
        style={{
          maxWidth: 540,
          background: "linear-gradient(180deg, #121A15 0%, #080C0A 100%)",
          borderColor: "#16401E",
        }}
      >
        {/* Incoming call header badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "#0E2413",
              border: "3px solid #64FF00",
              color: "#64FF00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(100, 255, 0, 0.3)",
              animation: "alarmRing 1.5s infinite ease-in-out",
            }}
          >
            <Bot size={50} />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#0E2413", borderRadius: 99, color: "#64FF00", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              <PhoneCall size={18} />
              <span>Входящий звонок помощника</span>
            </div>
            <h2 id="aicall-title" style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF" }}>
              {userName}, вы приняли лекарство?
            </h2>
          </div>
        </div>

        {/* Medication Card */}
        <div
          className="medication-detail-card"
          style={{
            background: "#141414",
            borderColor: "#262626",
            padding: "20px",
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 16, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
            Назначение:
          </span>
          <span className="medication-name-highlight" style={{ fontSize: 30 }}>
            {medName}
          </span>
          {medDosage && (
            <span style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>
              {medDosage}
            </span>
          )}
          {med?.instructions && (
            <p style={{ fontSize: 16, color: "#94A3B8", marginTop: 4 }}>
              {med.instructions}
            </p>
          )}
        </div>

        {/* Call Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {/* YES, I TOOK IT */}
          <button
            type="button"
            className="btn-confirm-taken"
            style={{ minHeight: 82, fontSize: 24 }}
            onClick={handleConfirm}
            aria-label="Да, я уже принял лекарство"
          >
            <CheckCircle2 size={34} />
            <span>ДА, Я ПРИНЯЛ</span>
          </button>

          {/* NO, SNOOZE 5 MIN */}
          <button
            type="button"
            className="btn-snooze-action"
            style={{ minHeight: 74, fontSize: 21 }}
            onClick={handleSnooze}
            aria-label="Нет, напомнить через пять минут"
          >
            <Clock size={28} />
            <span>НЕТ, НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ</span>
          </button>

          {/* DECLINE / DISMISS CALL */}
          <button
            type="button"
            className="btn-back"
            style={{
              minHeight: 56,
              justifyContent: "center",
              fontSize: 18,
              background: "#221113",
              borderColor: "#7F1D1D",
              color: "#F87171",
            }}
            onClick={handleDismiss}
            aria-label="Завершить звонок"
          >
            <PhoneOff size={22} />
            <span>Завершить звонок</span>
          </button>
        </div>
      </div>
    </div>
  );
};
