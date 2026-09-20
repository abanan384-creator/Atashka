import React, { useEffect } from "react";
import { CheckCircle2, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { useMedication } from "../../context/useMedication";
import { notificationService } from "../../services/notificationService";

export const SuccessStep: React.FC = () => {
  const { userProfile, finishOnboarding, speak } = useMedication();
  const userName = userProfile?.name || "Друг";

  useEffect(() => {
    // Gentle celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#64FF00", "#5BF000", "#ffffff"],
      });
    } catch {}

    const text = `Готово, ${userName}! Мы добавили ваши лекарства и будем напоминать о каждом приёме.`;
    speak(text);

    // Gently request notification permission for autonomous reminders if supported
    if (notificationService.isSupported()) {
      notificationService.requestPermission().catch(() => {});
    }
  }, [userName, speak]);

  const handleGoHome = () => {
    speak("Переходим на главный экран.");
    finishOnboarding();
  };

  return (
    <main className="register-container" aria-label="Экран завершения настройки">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", gap: 24, textAlign: "center" }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "#0E1A10",
            border: "3px solid #16401E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64FF00",
            boxShadow: "0 0 35px rgba(100, 255, 0, 0.25)",
          }}
          aria-hidden="true"
        >
          <CheckCircle2 size={54} />
        </div>

        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#FFFFFF", marginBottom: 12 }}>
            Готово, {userName}!
          </h1>
          <p style={{ fontSize: 22, color: "#E2E8F0", lineHeight: 1.35, maxWidth: 460 }}>
            Мы добавили ваши лекарства и будем напоминать о каждом приёме.
          </p>
        </div>

        <button
          type="button"
          className="btn-confirm-taken"
          style={{ minHeight: 84, fontSize: 26, width: "100%", marginTop: 24 }}
          onClick={handleGoHome}
          aria-label="На главный экран"
        >
          <Home size={34} />
          <span>НА ГЛАВНУЮ</span>
        </button>
      </div>
    </main>
  );
};
