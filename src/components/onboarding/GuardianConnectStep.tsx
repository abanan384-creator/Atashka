import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Send, CheckCircle2, ArrowRight, Loader2, HeartHandshake } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import { checkGuardianStatus } from "../../services/guardianNotifications";

interface GuardianConnectStepProps {
  invite: {
    guardianLinkId: string;
    pairingToken: string;
    telegramUrl: string;
    alreadyConnected?: boolean;
    telegramFirstName?: string;
  };
  onProceedToScan: () => void;
}

export const GuardianConnectStep: React.FC<GuardianConnectStepProps> = ({
  invite,
  onProceedToScan,
}) => {
  const { userProfile, speak, playClick, setGuardianLinkId } = useMedication();
  const [connected, setConnected] = useState(Boolean(invite.alreadyConnected));
  const [guardianFirstName, setGuardianFirstName] = useState(invite.telegramFirstName || "");
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (connected) {
      speak("Опекун подключён. Нажмите продолжить.");
      return;
    }

    speak("Подключите Telegram опекуна. Попросите опекуна открыть ссылку или отсканировать QR-код.");

    // Poll every 2 seconds for guardian connection
    const poll = async () => {
      try {
        const status = await checkGuardianStatus(invite.guardianLinkId, userProfile?.id);
        if (status.connected) {
          setConnected(true);
          if (status.telegramFirstName) {
            setGuardianFirstName(status.telegramFirstName);
          }
          if (status.guardianLinkId) {
            setGuardianLinkId(status.guardianLinkId);
          }
          speak(`Опекун успешно подключён! ${status.telegramFirstName ? `Опекун: ${status.telegramFirstName}.` : ""} Нажмите кнопку Продолжить.`);
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (err) {
        console.warn("[GuardianConnectStep] Poll check error:", err);
      }
    };

    pollTimerRef.current = window.setInterval(poll, 2000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [connected, invite.guardianLinkId, userProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenTelegram = () => {
    playClick();
    window.open(invite.telegramUrl, "_blank", "noopener,noreferrer");
  };

  const handleProceed = () => {
    playClick();
    onProceedToScan();
  };

  return (
    <main className="register-container" aria-label="Экран подключения Telegram опекуна">
      <header className="register-header">
        <div
          className="register-pill-badge"
          aria-hidden="true"
          style={{
            background: connected ? "#0E2413" : "#1A2218",
            borderColor: connected ? "#22C55E" : "#2E3D2A",
            color: connected ? "#22C55E" : "#4ADE80",
          }}
        >
          {connected ? <CheckCircle2 size={44} /> : <HeartHandshake size={44} />}
        </div>

        <h1 className="register-title" style={{ fontSize: 32 }}>
          {connected ? "✅ Опекун подключён" : "Подключите Telegram опекуна"}
        </h1>

        <p className="register-subtitle" style={{ fontSize: 20, maxWidth: 500, margin: "0 auto" }}>
          {connected
            ? `Опекун${guardianFirstName ? ` ${guardianFirstName}` : ""} теперь будет получать уведомления о приёме лекарств.`
            : "Попросите опекуна открыть ссылку или отсканировать QR-код."}
        </p>
      </header>

      {!connected ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            width: "100%",
            marginTop: 8,
          }}
        >
          {/* High-contrast QR Code Container */}
          <div
            style={{
              background: "#FFFFFF",
              padding: 16,
              borderRadius: 24,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QRCodeSVG
              value={invite.telegramUrl}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          {/* Live Polling Status Indicator */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 99,
              color: "#94A3B8",
              fontSize: 16,
              fontWeight: 600,
            }}
            role="status"
            aria-live="polite"
          >
            <Loader2 size={18} className="animate-spin" style={{ animation: "spin 2s linear infinite" }} />
            <span>Ожидаем подтверждения в Telegram...</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
            <button
              type="button"
              className="btn-register-primary"
              style={{
                minHeight: 76,
                fontSize: 22,
                fontWeight: 800,
                background: "#0088CC",
                borderColor: "#0077B5",
              }}
              onClick={handleOpenTelegram}
              aria-label="Открыть Telegram"
            >
              <Send size={26} />
              <span>ОТКРЫТЬ TELEGRAM</span>
            </button>

            <button
              type="button"
              className="btn-back"
              style={{
                minHeight: 64,
                fontSize: 18,
                fontWeight: 700,
                justifyContent: "center",
                background: "#1C1C1E",
                borderColor: "#3A3A3C",
                color: "#A1A1AA",
              }}
              onClick={handleProceed}
              aria-label="Продолжить без ожидания"
            >
              <span>ПРОДОЛЖИТЬ (ПОДКЛЮЧУ ПОЗЖЕ)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Connected State */
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", marginTop: 12 }}>
          <div
            style={{
              background: "#0E2413",
              border: "2px solid #22C55E",
              borderRadius: 20,
              padding: "24px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={48} color="#22C55E" />
            <span style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>
              Связь установлена!
            </span>
            {guardianFirstName && (
              <span style={{ fontSize: 18, color: "#86EFAC" }}>
                Опекун: {guardianFirstName}
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn-register-primary"
            style={{ minHeight: 80, fontSize: 24, fontWeight: 800 }}
            onClick={handleProceed}
            aria-label="Продолжить"
          >
            <span>ПРОДОЛЖИТЬ</span>
            <ArrowRight size={26} />
          </button>
        </div>
      )}
    </main>
  );
};
