import React, { useState, useEffect, useMemo } from "react";
import { Timer, CheckCircle2, Pill, X } from "lucide-react";
import { useMedication } from "../context/useMedication";
import type { Medication, MedicationEvent } from "../types/medication";

interface NextDoseTimerModalProps {
  onClose: () => void;
}

function getNextDoseTarget(events: MedicationEvent[], medications: Medication[]) {
  const now = new Date();
  const sorted = [...events].sort((a, b) => a.timeString.localeCompare(b.timeString));

  const curHours = String(now.getHours()).padStart(2, "0");
  const curMins = String(now.getMinutes()).padStart(2, "0");
  const curTimeStr = `${curHours}:${curMins}`;

  // 1. Next scheduled intake today not yet confirmed
  const upcomingToday = sorted.find(
    (e) => e.timeString >= curTimeStr && e.status !== "confirmed_taken"
  );

  if (upcomingToday) {
    const [hh, mm] = upcomingToday.timeString.split(":").map(Number);
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    const med = medications.find((m) => m.id === upcomingToday.medicationId);
    return {
      event: upcomingToday,
      med,
      targetDate,
      isTomorrow: false,
    };
  }

  // 2. Otherwise next dose tomorrow
  if (sorted.length > 0) {
    const firstDaily = sorted[0];
    const [hh, mm] = firstDaily.timeString.split(":").map(Number);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm, 0, 0);
    const med = medications.find((m) => m.id === firstDaily.medicationId);
    return {
      event: firstDaily,
      med,
      targetDate: tomorrow,
      isTomorrow: true,
    };
  }

  return null;
}

export const NextDoseTimerModal: React.FC<NextDoseTimerModalProps> = ({ onClose }) => {
  const { events, medications, speak, playClick } = useMedication();
  const [nowTime, setNowTime] = useState(() => Date.now());

  // Real-time ticking every second
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const nextDose = useMemo(() => {
    return getNextDoseTarget(events, medications);
  }, [events, medications]);

  // Calculate remaining time
  const remaining = useMemo(() => {
    if (!nextDose) return null;
    const diffMs = Math.max(0, nextDose.targetDate.getTime() - nowTime);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return {
      totalMs: diffMs,
      hours,
      minutes,
      seconds,
    };
  }, [nextDose, nowTime]);

  // Voice announcement on open
  useEffect(() => {
    if (!nextDose || !remaining) {
      speak("Все назначенные лекарства на сегодня приняты.");
    } else if (remaining.totalMs <= 0) {
      speak(`Пора принимать ${nextDose.med?.name || "лекарство"}!`);
    } else {
      const hoursText = remaining.hours > 0 ? `${remaining.hours} ч. ` : "";
      const minText = `${remaining.minutes} мин.`;
      speak(`До приёма лекарства ${nextDose.med?.name || ""} осталось ${hoursText}${minText}. Назначено на ${nextDose.event.timeString}.`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    playClick();
    onClose();
  };

  const medName = nextDose?.med?.name || "Лекарство";
  const medDosage = nextDose?.med?.dosage || "";
  const timeLabel = nextDose
    ? `${nextDose.event.timeString}${nextDose.isTomorrow ? " (завтра)" : ""}`
    : "";

  return (
    <div
      className="reminder-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-modal-title"
      style={{
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="reminder-modal"
        style={{
          maxWidth: 540,
          background: "linear-gradient(180deg, #091F0E 0%, #040D06 100%)",
          border: "2px solid #22C55E",
          boxShadow: "0 0 50px rgba(34, 197, 94, 0.3)",
        }}
      >
        {/* Top Dismiss Action */}
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginBottom: -10 }}>
          <button
            type="button"
            className="icon-button"
            onClick={handleClose}
            aria-label="Закрыть таймер"
            title="Закрыть"
            style={{
              width: 44,
              height: 44,
              color: "#86EFAC",
              background: "#0E2A15",
              borderColor: "#166534",
            }}
          >
            <X size={26} />
          </button>
        </div>

        {/* Header Badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#0E2E16",
              border: "3px solid #64FF00",
              color: "#64FF00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 35px rgba(100, 255, 0, 0.35)",
            }}
          >
            <Timer size={44} />
          </div>

          <h2
            id="timer-modal-title"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#FFFFFF",
              textAlign: "center",
              margin: 0,
            }}
          >
            Время до приёма лекарства
          </h2>
        </div>

        {nextDose && remaining ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", marginTop: 8 }}>
            {/* Target Medication Card */}
            <div
              style={{
                background: "#0A2412",
                border: "1px solid #166534",
                borderRadius: 20,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 4,
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#86EFAC", fontSize: 16, fontWeight: 700, textTransform: "uppercase" }}>
                <Pill size={18} />
                <span>Следующий приём в {timeLabel}</span>
              </div>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#64FF00",
                  marginTop: 4,
                }}
              >
                {medName}
              </span>
              {medDosage && (
                <span style={{ fontSize: 20, color: "#E2E8F0", fontWeight: 600 }}>
                  {medDosage}
                </span>
              )}
            </div>

            {/* Countdown Blocks */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                padding: "20px 10px",
                background: "#07170B",
                border: "2px solid #22C55E",
                borderRadius: 24,
                boxShadow: "inset 0 2px 10px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Hours */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#64FF00",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {String(remaining.hours).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>
                  Часов
                </span>
              </div>

              <span style={{ fontSize: 40, fontWeight: 900, color: "#22C55E", marginBottom: 16 }}>:</span>

              {/* Minutes */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#64FF00",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {String(remaining.minutes).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>
                  Минут
                </span>
              </div>

              <span style={{ fontSize: 40, fontWeight: 900, color: "#22C55E", marginBottom: 16 }}>:</span>

              {/* Seconds */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#64FF00",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {String(remaining.seconds).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>
                  Секунд
                </span>
              </div>
            </div>

            <p style={{ textAlign: "center", color: "#86EFAC", fontSize: 16, margin: "0" }}>
              Будильник прозвенит точно по расписанию
            </p>
          </div>
        ) : (
          /* All medications confirmed */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
              padding: "24px 16px",
              background: "#0A2412",
              border: "1px solid #166534",
              borderRadius: 20,
              marginTop: 12,
            }}
          >
            <CheckCircle2 size={48} color="#64FF00" />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>
              Все лекарства на сегодня приняты!
            </span>
            <span style={{ fontSize: 18, color: "#86EFAC" }}>
              Отличная забота о здоровье. Отдыхайте!
            </span>
          </div>
        )}

        {/* Green Close Button */}
        <button
          type="button"
          className="btn-register-primary"
          style={{
            minHeight: 74,
            fontSize: 22,
            fontWeight: 800,
            background: "#22C55E",
            borderColor: "#16A34A",
            color: "#05200D",
            marginTop: 14,
          }}
          onClick={handleClose}
          aria-label="Закрыть окно таймера"
        >
          <span>ПОНЯТНО</span>
        </button>
      </div>
    </div>
  );
};
