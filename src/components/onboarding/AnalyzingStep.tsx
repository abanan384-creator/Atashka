import React, { useEffect, useRef } from "react";
import { Loader2, AlertCircle, Camera, Image as ImageIcon } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import { AUDIO_PHRASES } from "../../constants/config";

interface AnalyzingStepProps {
  error: string | null;
  onRetry: () => void;
}

export const AnalyzingStep: React.FC<AnalyzingStepProps> = ({ error, onRetry }) => {
  const { speak, uploadPrescriptionImage } = useMedication();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      speak("Не удалось прочитать назначение. Пожалуйста, сфотографируйте ещё раз или выберите другое фото.");
    } else {
      speak(AUDIO_PHRASES.ANALYZING);
    }
  }, [error, speak]);

  const handleCameraClick = () => {
    onRetry();
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    onRetry();
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPrescriptionImage(file);
    }
  };

  if (error) {
    return (
      <main className="register-container" aria-label="Ошибка чтения рецепта">
        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <header className="register-header">
          <div
            className="register-pill-badge"
            style={{ background: "#2A1215", borderColor: "#EF4444", color: "#EF4444" }}
            aria-hidden="true"
          >
            <AlertCircle size={44} />
          </div>
          <h1 className="register-title" style={{ fontSize: 28, color: "#FCA5A5" }}>
            Не удалось прочитать назначение
          </h1>
          <p className="register-subtitle">
            Попробуйте сделать снимок при лучшем освещении
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", marginTop: 12 }}>
          {/* Option 1: СФОТОГРАФИРОВАТЬ ЕЩЁ РАЗ */}
          <button
            type="button"
            className="btn-confirm-taken"
            style={{ minHeight: 80, fontSize: 22 }}
            onClick={handleCameraClick}
            aria-label="Сфотографировать ещё раз"
          >
            <Camera size={30} />
            <span>СФОТОГРАФИРОВАТЬ ЕЩЁ РАЗ</span>
          </button>

          {/* Option 2: ВЫБРАТЬ ДРУГОЕ ФОТО */}
          <button
            type="button"
            className="btn-snooze-action"
            style={{
              minHeight: 74,
              fontSize: 20,
              background: "#161B26",
              borderColor: "#3B82F6",
              color: "#60A5FA",
            }}
            onClick={handleGalleryClick}
            aria-label="Выбрать другое фото"
          >
            <ImageIcon size={28} />
            <span>ВЫБРАТЬ ДРУГОЕ ФОТО</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="register-container" aria-label="Анализ назначений">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 24, textAlign: "center" }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "#0E1A10",
            border: "2px solid #16401E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64FF00",
            boxShadow: "0 0 30px rgba(100, 255, 0, 0.2)",
          }}
        >
          <Loader2 size={54} className="animate-spin" />
        </div>

        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", marginBottom: 10 }}>
            Читаем ваши назначения...
          </h1>
          <p style={{ fontSize: 20, color: "#94A3B8" }}>
            Это займёт несколько секунд
          </p>
        </div>

        {/* Calm visual progress bar */}
        <div style={{ width: "80%", maxWidth: 320, height: 8, background: "#222222", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#64FF00",
              animation: "indeterminateProgress 1.6s infinite ease-in-out",
            }}
          />
        </div>
      </div>
    </main>
  );
};
