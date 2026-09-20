import React, { useState } from "react";
import { Pill, Calendar, Brain, Settings } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { DemoControls } from "./DemoControls";

export const HomeView: React.FC = () => {
  const { openMedicationFlow, setActiveScreen, nextMedicationInfo, speak } = useMedication();
  const [showDemoToolbar, setShowDemoToolbar] = useState(false);

  const nextTimeDisplay = nextMedicationInfo
    ? `Следующий приём: ${nextMedicationInfo.time}`
    : "Все приёмы на сегодня завершены";

  const handleTakePills = () => {
    speak("Принять лекарство. Открываем приём лекарств.");
    openMedicationFlow();
  };

  const handleOpenSchedule = () => {
    speak(`Расписание приёма лекарств. ${nextTimeDisplay}`);
    setActiveScreen("schedule");
  };

  const handleOpenGame = () => {
    speak("Игра. Тренировка памяти.");
    setActiveScreen("game");
  };

  return (
    <main className="home-container" aria-label="Главный экран" style={{ minHeight: "90vh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, justifyContent: "center" }}>
        {/* 1. ПРИНЯТЬ ЛЕКАРСТВО */}
        <button
          type="button"
          className="btn-primary-intake"
          onClick={handleTakePills}
          aria-label="Принять лекарство прямо сейчас"
        >
          <div className="btn-intake-icon-wrap" aria-hidden="true">
            <Pill size={42} />
          </div>
          <div className="btn-intake-content">
            <span className="btn-intake-title">ПРИНЯТЬ ЛЕКАРСТВО</span>
            <span className="btn-intake-sub">Будильник и отметка приёма</span>
          </div>
        </button>

        {/* 2. РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ (Следующий приём: [time] or Все приёмы на сегодня завершены) */}
        <button
          type="button"
          className="btn-schedule-action"
          onClick={handleOpenSchedule}
          aria-label={`Расписание приёма лекарств. ${nextTimeDisplay}`}
        >
          <div className="btn-schedule-icon-wrap" aria-hidden="true">
            <Calendar size={38} />
          </div>
          <div className="btn-schedule-content">
            <span className="btn-schedule-title">РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ</span>
            <span className="btn-schedule-next-badge">{nextTimeDisplay}</span>
          </div>
        </button>

        {/* 3. ИГРА */}
        <button
          type="button"
          className="btn-game-action"
          onClick={handleOpenGame}
          aria-label="Игра. Тренируй память"
        >
          <div className="btn-game-icon-wrap" aria-hidden="true">
            <Brain size={38} />
          </div>
          <div className="btn-game-content">
            <span className="btn-game-title">ИГРА</span>
            <span className="btn-game-sub">Тренируй память</span>
          </div>
        </button>
      </div>

      {/* Discrete developer demo panel toggle (does not clutter senior UI) */}
      <footer style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {showDemoToolbar && <DemoControls />}
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "#404040",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            marginTop: 6,
          }}
          onClick={() => setShowDemoToolbar(!showDemoToolbar)}
          aria-label="Панель тестирования демо"
        >
          <Settings size={14} />
          <span>{showDemoToolbar ? "Скрыть панель тестирования" : "Панель тестирования (для жюри)"}</span>
        </button>
      </footer>
    </main>
  );
};
