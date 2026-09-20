import React, { useState } from "react";
import { Pill, Calendar, Brain, Settings, Timer } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { DemoControls } from "./DemoControls";
import { NextDoseTimerModal } from "./NextDoseTimerModal";

export const HomeView: React.FC = () => {
  const { openMedicationFlow, setActiveScreen, speak, playClick, activeReminderEvent } = useMedication();
  const [showDemoToolbar, setShowDemoToolbar] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

  const handleOpenSchedule = () => {
    speak("Расписание приёма лекарств.");
    setActiveScreen("schedule");
  };

  const handleOpenTimer = () => {
    playClick();
    speak("Время до следующего приёма лекарства.");
    setShowTimerModal(true);
  };

  const handleOpenGame = () => {
    speak("Игры для тренировки памяти.");
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
          gap: 20,
          flex: 1,
          justifyContent: "center",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* SilverCare Brand Header */}
        <header className="home-brand-header" style={{ textAlign: "center", marginBottom: 6, marginTop: 4 }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.5px", margin: 0, lineHeight: 1.1 }}>
            <span style={{ color: "#FFFFFF" }}>Silver</span>
            <span style={{ color: "#64FF00" }}>Care</span>
          </h1>
          <p style={{ fontSize: 19, color: "#94A3B8", marginTop: 6, fontWeight: 500, letterSpacing: "0.2px" }}>
            Просто. Забота каждый день.
          </p>
        </header>

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
          style={{ minHeight: 125 }}
          onClick={handleOpenSchedule}
          aria-label="Расписание приёма лекарств"
        >
          <div className="btn-schedule-icon-wrap" aria-hidden="true">
            <Calendar size={42} />
          </div>
          <div className="btn-schedule-content">
            <span className="btn-schedule-title" style={{ fontSize: 26 }}>
              РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ
            </span>
          </div>
        </button>

        {/* 2. ВРЕМЯ ДО СЛЕДУЮЩЕГО ПРИЁМА (VIBRANT BRIGHT GREEN) */}
        <button
          type="button"
          className="btn-timer-action"
          style={{ minHeight: 125 }}
          onClick={handleOpenTimer}
          aria-label="Время до следующего приёма лекарства"
        >
          <div className="btn-timer-icon-wrap" aria-hidden="true">
            <Timer size={42} />
          </div>
          <div className="btn-timer-content">
            <span className="btn-timer-title" style={{ fontSize: 26 }}>
              ВРЕМЯ ДО СЛЕДУЮЩЕГО ПРИЁМА
            </span>
            <span className="btn-timer-sub" style={{ fontSize: 17 }}>
              Таймер обратного отсчёта
            </span>
          </div>
        </button>

        {/* 3. ИГРА */}
        <button
          type="button"
          className="btn-game-action"
          style={{ minHeight: 120 }}
          onClick={handleOpenGame}
          aria-label="Игра. Тренируй память"
        >
          <div className="btn-game-icon-wrap" aria-hidden="true">
            <Brain size={42} />
          </div>
          <div className="btn-game-content">
            <span className="btn-game-title" style={{ fontSize: 26 }}>
              ИГРА
            </span>
            <span className="btn-game-sub" style={{ fontSize: 18 }}>
              Тренируй память
            </span>
          </div>
        </button>
      </div>

      {/* Discrete developer demo panel toggle (does not clutter senior UI) */}
      <footer style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
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

      {/* Next Dose Green Timer Modal */}
      {showTimerModal && (
        <NextDoseTimerModal onClose={() => setShowTimerModal(false)} />
      )}
    </main>
  );
};
