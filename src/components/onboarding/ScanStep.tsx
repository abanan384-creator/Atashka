import React, { useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, FileText } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import { AUDIO_PHRASES } from "../../constants/config";

export const ScanStep: React.FC = () => {
  const { uploadPrescriptionImage, speak } = useMedication();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    speak(AUDIO_PHRASES.SCAN_PROMPT);
  }, [speak]);

  const handleCameraClick = () => {
    speak("Открываем камеру. Сфотографируйте рецепт или список лекарств.");
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    speak("Открываем галерею. Выберите фотографию рецепта.");
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPrescriptionImage(file);
    }
  };

  const handleSampleClick = () => {
    speak("Загружаем образец листа назначений от терапевта.");
    // Create a dummy file representation
    const sampleFile = new File(["sample prescription"], "prescription-sample.jpg", {
      type: "image/jpeg",
    });
    uploadPrescriptionImage(sampleFile);
  };

  return (
    <main className="register-container" aria-label="Экран сканирования рецепта">
      <header className="register-header">
        <div className="register-pill-badge" aria-hidden="true">
          <Camera size={40} />
        </div>
        <h1 className="register-title" style={{ fontSize: 30, lineHeight: 1.25 }}>
          Сфотографируйте лист с назначенными лекарствами
        </h1>
        <p className="register-subtitle">
          Подойдёт рецепт врача, памятка или список таблеток
        </p>
      </header>

      {/* Hidden file inputs */}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", marginTop: 8 }}>
        {/* OPTION 1: СФОТОГРАФИРОВАТЬ */}
        <button
          type="button"
          className="btn-confirm-taken"
          style={{ minHeight: 88, fontSize: 24 }}
          onClick={handleCameraClick}
          aria-label="Сфотографировать лист назначений"
        >
          <Camera size={34} />
          <span>СФОТОГРАФИРОВАТЬ</span>
        </button>

        {/* OPTION 2: ВЫБРАТЬ ИЗ ГАЛЕРЕИ */}
        <button
          type="button"
          className="btn-snooze-action"
          style={{
            minHeight: 80,
            fontSize: 22,
            background: "#161B26",
            borderColor: "#3B82F6",
            color: "#60A5FA",
          }}
          onClick={handleGalleryClick}
          aria-label="Выбрать фотографию из галереи"
        >
          <ImageIcon size={30} />
          <span>ВЫБРАТЬ ИЗ ГАЛЕРЕИ</span>
        </button>

        {/* REVIEWER / DEMO QUICK ACTION */}
        <button
          type="button"
          className="btn-back"
          style={{
            marginTop: 14,
            width: "100%",
            justifyContent: "center",
            padding: "16px 20px",
            fontSize: 16,
            background: "#121212",
            border: "1px dashed #333333",
            color: "#A1A1AA",
          }}
          onClick={handleSampleClick}
          aria-label="Использовать готовый образец назначения врача"
        >
          <FileText size={20} />
          <span>Использовать образец листа назначений</span>
        </button>
      </div>
    </main>
  );
};
