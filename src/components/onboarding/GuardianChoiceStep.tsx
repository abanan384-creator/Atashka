import React, { useEffect, useState } from "react";
import { HeartHandshake, CheckCircle2, ShieldAlert, ArrowRight, UserPlus } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import { createGuardianInvite, checkGuardianStatus } from "../../services/guardianNotifications";

interface GuardianChoiceStepProps {
  onProceedToScan: () => void;
  onInviteCreated: (invite: { guardianLinkId: string; pairingToken: string; telegramUrl: string; alreadyConnected?: boolean; telegramFirstName?: string }) => void;
}

export const GuardianChoiceStep: React.FC<GuardianChoiceStepProps> = ({
  onProceedToScan,
  onInviteCreated,
}) => {
  const { userProfile, speak, playClick, setGuardianLinkId } = useMedication();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyConnected, setAlreadyConnected] = useState(userProfile?.guardianConnected || false);
  const [guardianName, setGuardianName] = useState(userProfile?.guardianFirstName || "");

  // Check if this senior already has a connected guardian on mount
  useEffect(() => {
    speak("Хотите подключить опекуна? Опекун сможет получать уведомления о приёме лекарств.");

    if (userProfile?.id) {
      checkGuardianStatus(userProfile.guardianLinkId, userProfile.id).then((status) => {
        if (status.connected) {
          setAlreadyConnected(true);
          if (status.telegramFirstName) setGuardianName(status.telegramFirstName);
          if (status.guardianLinkId) setGuardianLinkId(status.guardianLinkId);
        }
      }).catch(() => {});
    }
  }, [userProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async (replace = false) => {
    playClick();
    if (!userProfile?.id) {
      onProceedToScan();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invite = await createGuardianInvite(userProfile.id, userProfile.name, replace);
      setGuardianLinkId(invite.guardianLinkId);
      onInviteCreated(invite);
    } catch (err) {
      console.error("[GuardianChoice] Error creating invite:", err);
      setError("Не удалось создать приглашение. Вы можете подключить опекуна позже или пропустить этот шаг.");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    playClick();
    speak("Хорошо, продолжим без опекуна. Вы всегда сможете настроить это позже.");
    onProceedToScan();
  };

  return (
    <main className="register-container" aria-label="Экран подключения опекуна">
      <header className="register-header">
        <div
          className="register-pill-badge"
          aria-hidden="true"
          style={{
            background: alreadyConnected ? "#0E2413" : "#1A2218",
            borderColor: alreadyConnected ? "#22C55E" : "#2E3D2A",
            color: alreadyConnected ? "#22C55E" : "#4ADE80",
          }}
        >
          {alreadyConnected ? <CheckCircle2 size={44} /> : <HeartHandshake size={44} />}
        </div>

        <h1 className="register-title" style={{ fontSize: 32 }}>
          {alreadyConnected ? "Опекун подключён" : "Хотите подключить опекуна?"}
        </h1>

        <p className="register-subtitle" style={{ fontSize: 20, maxWidth: 500, margin: "0 auto" }}>
          {alreadyConnected
            ? `К вашему профилю подключён опекун${guardianName ? ` (${guardianName})` : ""}. Он получает уведомления о приёме лекарств.`
            : "Опекун сможет получать уведомления о приёме лекарств и важных событиях."}
        </p>
      </header>

      {error && (
        <div
          style={{
            background: "#2D1517",
            border: "1px solid #7F1D1D",
            borderRadius: 16,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#FCA5A5",
            fontSize: 16,
            marginBottom: 20,
          }}
          role="alert"
        >
          <ShieldAlert size={24} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", marginTop: 8 }}>
        {alreadyConnected ? (
          <>
            <button
              type="button"
              className="btn-register-primary"
              style={{ minHeight: 76, fontSize: 22, fontWeight: 800 }}
              onClick={onProceedToScan}
              aria-label="Продолжить"
            >
              <span>ПРОДОЛЖИТЬ</span>
              <ArrowRight size={24} />
            </button>

            <button
              type="button"
              className="btn-back"
              style={{
                minHeight: 64,
                fontSize: 19,
                fontWeight: 700,
                justifyContent: "center",
                background: "#1C1C1E",
                borderColor: "#3A3A3C",
                color: "#E5E5EA",
              }}
              onClick={() => handleConnect(true)}
              disabled={loading}
              aria-label="Подключить другого опекуна"
            >
              <UserPlus size={22} />
              <span>{loading ? "Создаём ссылку..." : "ПОДКЛЮЧИТЬ ДРУГОГО"}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-register-primary"
              style={{ minHeight: 80, fontSize: 24, fontWeight: 800 }}
              onClick={() => handleConnect(false)}
              disabled={loading}
              aria-label="Подключить опекуна"
            >
              <HeartHandshake size={28} />
              <span>{loading ? "Создаём приглашение..." : "ПОДКЛЮЧИТЬ ОПЕКУНА"}</span>
            </button>

            <button
              type="button"
              className="btn-back"
              style={{
                minHeight: 68,
                fontSize: 20,
                fontWeight: 700,
                justifyContent: "center",
                background: "#1C1C1E",
                borderColor: "#3A3A3C",
                color: "#A1A1AA",
              }}
              onClick={handleSkip}
              disabled={loading}
              aria-label="Пропустить подключение опекуна"
            >
              <span>ПРОПУСТИТЬ</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
};
