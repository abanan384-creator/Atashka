import React from "react";
import { Zap, RotateCcw, Bell, PhoneCall, Camera } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { DEMO_ACCELERATED_SNOOZE_SECONDS, REMINDER_SNOOZE_MINUTES } from "../constants/config";

export const DemoControls: React.FC = () => {
  const {
    demoMode,
    setDemoMode,
    triggerImmediateReminder,
    triggerAICall,
    resetAllData,
    restartOnboarding,
    events,
  } = useMedication();

  const activeOrFirstEventId = events.find((e) => e.status !== "confirmed_taken")?.id || events[0]?.id;

  return (
    <div className="demo-banner" role="region" aria-label="Панель жюри и демонстрации" style={{ width: "100%", maxWidth: 600 }}>
      <div className="demo-banner-row">
        <div>
          <strong style={{ fontSize: 14 }}>Панель тестирования (для жюри)</strong>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Повтор: {demoMode ? `${DEMO_ACCELERATED_SNOOZE_SECONDS}с (ускорено)` : `${REMINDER_SNOOZE_MINUTES}м (стандарт)`}
          </div>
        </div>

        <div className="demo-btn-group" style={{ flexWrap: "wrap", gap: 6 }}>
          {/* SNOOZE TIME ACCELERATION TOGGLE */}
          <button
            type="button"
            className={`btn-demo-pill ${demoMode ? "active" : ""}`}
            onClick={() => setDemoMode(!demoMode)}
            title="Переключить ускоренный повтор"
          >
            <Zap size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            {demoMode ? "6 сек" : "5 мин"}
          </button>

          {/* TRIGGER IMMEDIATE REMINDER */}
          <button
            type="button"
            className="btn-demo-pill"
            onClick={() => triggerImmediateReminder()}
            title="Вызвать окно напоминания прямо сейчас"
          >
            <Bell size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Напоминание
          </button>

          {/* TRIGGER AI CALL */}
          <button
            type="button"
            className="btn-demo-pill"
            onClick={() => triggerAICall(activeOrFirstEventId)}
            title="Запустить симуляцию AI-звонка"
          >
            <PhoneCall size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            AI-звонок
          </button>

          {/* TEST PRESCRIPTION SCAN */}
          <button
            type="button"
            className="btn-demo-pill"
            onClick={() => restartOnboarding(true)}
            title="Перейти к сканированию рецепта"
          >
            <Camera size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Скан
          </button>

          {/* RESET DATA & RESTART ONBOARDING */}
          <button
            type="button"
            className="btn-demo-pill"
            onClick={() => resetAllData()}
            title="Сбросить все данные и начать онбординг с нуля"
          >
            <RotateCcw size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Сброс
          </button>
        </div>
      </div>
    </div>
  );
};
