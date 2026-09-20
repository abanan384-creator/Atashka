import React, { useState } from "react";
import { Pill, Calendar, Brain, Settings } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { DemoControls } from "./DemoControls";

export const HomeView: React.FC = () => {
  const { openMedicationFlow, setActiveScreen, speak, activeReminderEvent } = useMedication();
  const [showDemoToolbar, setShowDemoToolbar] = useState(false);

  const handleOpenSchedule = () => {
    speak("Расписание приёма лекарств.");
    setActiveScreen("schedule");
  };

  const handleOpenGame = () => {
    speak("Игра. Тренировка памяти.");
    setActiveScreen("game");
  };

  return (
    <main
      className="home-container"
      aria-label="Главный экран"
      style={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          flex: 1,
          justifyContent: "center",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* If an alarm is currently ringing / active, show prominent reminder banner */}
        {activeReminderEvent && (
          <button
            type="button"
            className="btn-primary-intake"
            style={{
              animation: "pulseGlow 2s infinite ease-in-out",
            }}
            onClick={openMedicationFlow}
            aria-label="Звенит будильник! Нажмите, чтобы подтвердить приём лекарства"
          >
            <div className="btn-intake-icon-wrap" aria-hidden="true">
              <Pill size={42} />
            </div>
            <div className="btn-intake-content">
              <span className="btn-intake-title">ЗВЕНИТ БУДИЛЬНИК!</span>
              <span className="btn-intake-sub">
                Пора принять назначенное лекарство
              </span>
            </div>
          </button>
        )}

        {/* 1. РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ */}
        <button
          type="button"
          className="btn-schedule-action"
          style={{ minHeight: 140 }}
          onClick={handleOpenSchedule}
          aria-label="Расписание приёма лекарств"
        >
          <div className="btn-schedule-icon-wrap" aria-hidden="true">
            <Calendar size={44} />
          </div>
          <div className="btn-schedule-content">
            <span className="btn-schedule-title" style={{ fontSize: 28 }}>
              РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ
            </span>
          </div>
        </button>

        {/* 2. ИГРА */}
        <button
          type="button"
          className="btn-game-action"
          style={{ minHeight: 130 }}
          onClick={handleOpenGame}
          aria-label="Игра. Тренируй память"
        >
          <div className="btn-game-icon-wrap" aria-hidden="true">
            <Brain size={44} />
          </div>
          <div className="btn-game-content">
            <span className="btn-game-title" style={{ fontSize: 28 }}>
              ИГРА
            </span>
            <span className="btn-game-sub" style={{ fontSize: 19 }}>
              Тренируй память
            </span>
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
