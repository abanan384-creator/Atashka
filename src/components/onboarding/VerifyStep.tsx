import React, { useState, useEffect } from "react";
import { CheckCircle2, Edit3, Clock, AlertTriangle, X, Check } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import type { ParsedMedication, RelationToFood } from "../../types/medication";
import { AUDIO_PHRASES } from "../../constants/config";

const FOOD_RELATION_LABELS: Record<RelationToFood, string> = {
  before_food: "До еды",
  after_food: "После еды",
  with_food: "Во время еды",
  unknown: "Не указано",
};

export const VerifyStep: React.FC = () => {
  const { parsedMedications, confirmExtractedSchedule, speak } = useMedication();
  const [meds, setMeds] = useState<ParsedMedication[]>(parsedMedications);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Editable temporary values
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editTimes, setEditTimes] = useState("");
  const [editRelation, setEditRelation] = useState<RelationToFood>("after_food");


  useEffect(() => {
    speak(AUDIO_PHRASES.VERIFY_PROMPT);
  }, [speak]);

  const handleStartEdit = (index: number) => {
    const target = meds[index];
    setEditName(target.name);
    setEditDosage(target.dosage || "");
    setEditTimes(target.times.join(", "));
    setEditRelation(target.relationToFood || "after_food");
    setEditingIndex(index);
    speak(`Редактирование лекарства: ${target.name}`);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const splitTimes = editTimes
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => (t.length === 4 ? `0${t}` : t));

    const updated = [...meds];
    updated[editingIndex] = {
      ...updated[editingIndex],
      name: editName.trim() || updated[editingIndex].name,
      dosage: editDosage.trim() || "1 таблетка",
      times: splitTimes.length > 0 ? splitTimes : updated[editingIndex].times,
      relationToFood: editRelation,
    };

    setMeds(updated);
    setEditingIndex(null);
    speak("Изменения сохранены.");
  };

  const handleConfirmAll = () => {
    speak("Прекрасно! Создаём ваше расписание приёма.");
    confirmExtractedSchedule(meds);
  };

  return (
    <main className="screen-container" aria-label="Экран проверки распознанных лекарств">
      <header className="screen-header-row" style={{ justifyContent: "center", marginBottom: 12 }}>
        <h1 className="screen-title" style={{ fontSize: 28, textAlign: "center" }}>
          Мы нашли ваши лекарства
        </h1>
      </header>

      <p style={{ textAlign: "center", fontSize: 18, color: "#94A3B8", marginBottom: 20 }}>
        Пожалуйста, проверьте список перед включением расписания
      </p>

      {/* List of recognized medications */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        {meds.map((med, idx) => {
          const isLowConfidence = med.confidence !== undefined && med.confidence < 0.8;
          const relationLabel = FOOD_RELATION_LABELS[med.relationToFood || "unknown"];

          return (
            <article
              key={idx}
              className="medication-detail-card"
              style={{
                textAlign: "left",
                padding: "20px",
                borderColor: isLowConfidence ? "#D97706" : "#262626",
                background: isLowConfidence ? "#1E1708" : "#141414",
              }}
            >
              {isLowConfidence && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FBBF24", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  <AlertTriangle size={20} />
                  <span>Пожалуйста, проверьте данные этого лекарства:</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h2 className="medication-name-highlight" style={{ fontSize: 26, textAlign: "left" }}>
                    {med.name}
                  </h2>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", marginTop: 4 }}>
                    {med.dosage || "1 доза"}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-back"
                  style={{
                    padding: "10px 16px",
                    fontSize: 16,
                    background: "#222222",
                    borderColor: "#333333",
                    color: "#64FF00",
                  }}
                  onClick={() => handleStartEdit(idx)}
                  aria-label={`Изменить ${med.name}`}
                >
                  <Edit3 size={18} />
                  <span>ИЗМЕНИТЬ</span>
                </button>
              </div>

              {/* Schedule times badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94A3B8", fontSize: 16 }}>
                  <Clock size={18} />
                  <span>Время приёма:</span>
                </div>
                {med.times.map((time, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      padding: "6px 14px",
                      background: "#0E1A10",
                      border: "1px solid #16401E",
                      color: "#64FF00",
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {time}
                  </span>
                ))}
              </div>

              {/* Food relation badge */}
              {relationLabel && (
                <div style={{ marginTop: 10, fontSize: 17, color: "#E2E8F0", fontWeight: 600 }}>
                  Приём: <span style={{ color: "#64FF00" }}>{relationLabel}</span>
                </div>
              )}

              {med.instructions && (
                <p style={{ marginTop: 6, fontSize: 15, color: "#94A3B8" }}>
                  {med.instructions}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Edit Modal / Dialog */}
      {editingIndex !== null && (
        <div className="reminder-overlay" role="dialog" aria-modal="true">
          <div className="reminder-modal" style={{ maxWidth: 520, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>Изменить лекарство</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingIndex(null)}
                aria-label="Отмена"
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 16, color: "#94A3B8", marginBottom: 6 }}>
                  Название
                </label>
                <input
                  type="text"
                  className="register-input"
                  style={{ fontSize: 20 }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 16, color: "#94A3B8", marginBottom: 6 }}>
                  Дозировка (например: 1 таблетка)
                </label>
                <input
                  type="text"
                  className="register-input"
                  style={{ fontSize: 20 }}
                  value={editDosage}
                  onChange={(e) => setEditDosage(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 16, color: "#94A3B8", marginBottom: 6 }}>
                  Время приёма через запятую (например: 08:00, 20:00)
                </label>
                <input
                  type="text"
                  className="register-input"
                  style={{ fontSize: 20 }}
                  value={editTimes}
                  onChange={(e) => setEditTimes(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 16, color: "#94A3B8", marginBottom: 6 }}>
                  Отношение к еде
                </label>
                <select
                  className="register-input"
                  style={{ fontSize: 18, color: "#FFFFFF", background: "#141414" }}
                  value={editRelation}
                  onChange={(e) => setEditRelation(e.target.value as RelationToFood)}
                >
                  <option value="after_food">После еды</option>
                  <option value="before_food">До еды</option>
                  <option value="with_food">Во время еды</option>
                  <option value="unknown">Не указано</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-confirm-taken"
                  style={{ minHeight: 64, fontSize: 20 }}
                  onClick={handleSaveEdit}
                >
                  <Check size={24} />
                  <span>СОХРАНИТЬ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary CTA: ВСЁ ВЕРНО */}
      <button
        type="button"
        className="btn-confirm-taken"
        style={{ minHeight: 84, fontSize: 26, width: "100%" }}
        onClick={handleConfirmAll}
        aria-label="Всё верно. Активировать расписание приёма"
      >
        <CheckCircle2 size={36} />
        <span>ВСЁ ВЕРНО</span>
      </button>
    </main>
  );
};
