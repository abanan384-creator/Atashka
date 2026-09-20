import React, { useState } from "react";
import { Zap, RotateCcw, Bell, PhoneCall, Camera, Send, ShieldCheck, ShieldOff } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { DEMO_ACCELERATED_SNOOZE_SECONDS, REMINDER_SNOOZE_MINUTES } from "../constants/config";
import { notifyGuardian } from "../services/guardianNotifications";

export const DemoControls: React.FC = () => {
  const {
    demoMode,
    setDemoMode,
    triggerImmediateReminder,
    triggerAICall,
    resetAllData,
    restartOnboarding,
    events,
    guardianLinkId,
    setGuardianLinkId,
    guardianConnected,
    refreshGuardianStatus,
    userProfile,
  } = useMedication();

  const [tgStatus, setTgStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const activeOrFirstEventId = events.find((e) => e.status !== "confirmed_taken")?.id || events[0]?.id;

  const handleTestTelegram = async () => {
    setIsSending(true);
    setTgStatus("Отправка...");
    try {
      const res = await notifyGuardian({
        guardianLinkId: guardianLinkId || undefined,
        type: "medication_taken",
        seniorName: userProfile?.name || "Анна",
        medication: "Парацетамол",
        time: "12:05",
      });

      if (res.sent) {
        setTgStatus("✅ Отправлено в Telegram!");
      } else if (res.skipped) {
        setTgStatus("ℹ️ Пропущено (нет опекуна)");
      } else {
        setTgStatus(`⚠️ Ошибка: ${res.error || "Сбой"}`);
      }
    } catch {
      setTgStatus("⚠️ Ошибка отправки");
    } finally {
      setIsSending(false);
      setTimeout(() => setTgStatus(null), 3500);
    }
  };

  const handleToggleGuardian = () => {
    if (guardianLinkId) {
      // Disconnect guardian to test flow D
      setGuardianLinkId(null);
    } else {
      // Reconnect default guardian
      const defaultId = import.meta.env.VITE_GUARDIAN_LINK_ID || "f28511fe-cfc0-4a7f-9389-c695d72899b7";
      setGuardianLinkId(defaultId);
    }
    refreshGuardianStatus();
  };

  return (
    <div className="demo-banner" role="region" aria-label="Панель жюри и демонстрации" style={{ width: "100%", maxWidth: 640 }}>
      <div className="demo-banner-row" style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 14 }}>Панель тестирования (для жюри)</strong>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Повтор: {demoMode ? `${DEMO_ACCELERATED_SNOOZE_SECONDS}с (ускорено)` : `${REMINDER_SNOOZE_MINUTES}м (стандарт)`}
            </div>
          </div>

          <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 99,
                background: guardianConnected ? "#0E2413" : "#241315",
                color: guardianConnected ? "#64FF00" : "#F87171",
                border: `1px solid ${guardianConnected ? "#164E24" : "#7F1D1D"}`,
                fontWeight: 700,
              }}
            >
              {guardianConnected ? "🤖 Telegram: подключен" : "🤖 Telegram: отключен"}
            </span>
          </div>
        </div>

        {tgStatus && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "#18181B",
              fontSize: 12,
              color: "#64FF00",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {tgStatus}
          </div>
        )}

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

          {/* TEST TELEGRAM NOTIFICATION */}
          <button
            type="button"
            className="btn-demo-pill"
            style={{ background: "#0E2413", borderColor: "#164E24", color: "#64FF00" }}
            onClick={handleTestTelegram}
            disabled={isSending}
            title="Отправить тестовое уведомление в Telegram опекуна"
          >
            <Send size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Тест TG
          </button>

          {/* TOGGLE GUARDIAN CONNECTION */}
          <button
            type="button"
            className="btn-demo-pill"
            onClick={handleToggleGuardian}
            title={guardianLinkId ? "Отключить опекуна (проверка работы без опекуна)" : "Подключить опекуна"}
          >
            {guardianLinkId ? (
              <>
                <ShieldOff size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Откл. TG
              </>
            ) : (
              <>
                <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Вкл. TG
              </>
            )}
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
