import React from "react";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useMedication } from "../context/useMedication";
import type { MedicationEventStatus, RelationToFood } from "../types/medication";

const FOOD_LABELS: Record<RelationToFood, string> = {
  before_food: "До еды",
  after_food: "После еды",
  with_food: "Во время еды",
  unknown: "",
};

export const ScheduleView: React.FC = () => {
  const {
    events,
    medications,
    setActiveScreen,
    nextMedicationInfo,
    triggerImmediateReminder,
    speak,
  } = useMedication();

  const getStatusLabel = (status: MedicationEventStatus) => {
    switch (status) {
      case "confirmed_taken":
        return { label: "Принято", className: "confirmed_taken", icon: <CheckCircle2 size={18} /> };
      case "snoozed":
        return { label: "Отложено на 5 мин", className: "snoozed", icon: <Clock size={18} /> };
      case "confirmation_unknown":
        return { label: "Статус не подтверждён", className: "confirmation_unknown", icon: <AlertCircle size={18} /> };
      case "reminder_active":
        return { label: "Сейчас", className: "scheduled", icon: <Clock size={18} /> };
      case "scheduled":
      default:
        return { label: "Запланировано", className: "scheduled", icon: <Clock size={18} /> };
    }
  };

  const handleBack = () => {
    speak("Возврат на главный экран");
    setActiveScreen("home");
  };

  const handleCardClick = (eventId: string, medName: string, dosage: string, time: string, status: MedicationEventStatus) => {
    speak(`Лекарство: ${medName}. Дозировка: ${dosage}. Время приёма: ${time}.`);
    if (status !== "confirmed_taken") {
      triggerImmediateReminder(eventId);
    }
  };

  return (
    <div className="screen-container" role="region" aria-label="Экран расписания лекарств">
      <div className="screen-header-row">
        <button
          type="button"
          className="btn-back"
          onClick={handleBack}
          aria-label="Вернуться на главный экран"
        >
          <ArrowLeft size={24} />
          <span>НАЗАД</span>
        </button>

        <h1 className="screen-title">Сегодня</h1>
      </div>

      <div className="schedule-list">
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8", fontSize: 20 }}>
            Расписание пока не добавлено
          </div>
        ) : (
          events.map((event) => {
            const med = medications.find((m) => m.id === event.medicationId);
            const statusInfo = getStatusLabel(event.status);
            const isNext = nextMedicationInfo && nextMedicationInfo.time === event.timeString && event.status !== "confirmed_taken";
            const medName = med?.name || "Лекарство";
            const medDosage = med?.dosage || "";
            const relationLabel = med?.relationToFood ? FOOD_LABELS[med.relationToFood] : "";

            return (
              <article
                key={event.id}
                className={`schedule-card ${isNext ? "is-next" : ""}`}
                onClick={() => handleCardClick(event.id, medName, medDosage, event.timeString, event.status)}
                style={{ cursor: event.status !== "confirmed_taken" ? "pointer" : "default" }}
              >
                <div className="schedule-card-header">
                  <div className="schedule-time-badge">
                    <Clock size={22} />
                    <span>{event.timeString}</span>
                  </div>

                  <div className={`status-badge ${statusInfo.className}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="schedule-card-body">
                  <h2 className="schedule-med-name">{medName}</h2>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                    <span className="schedule-med-dosage">{medDosage}</span>
                    {relationLabel && (
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#64FF00" }}>
                        • {relationLabel}
                      </span>
                    )}
                  </div>
                  {med?.instructions && (
                    <p className="schedule-med-notes">{med.instructions}</p>
                  )}
                </div>

                {isNext && (
                  <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: "#64FF00" }}>
                    ★ Следующий приём (нажмите для перехода)
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
