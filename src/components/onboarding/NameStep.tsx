import React, { useState, useEffect } from "react";
import { User } from "lucide-react";
import { useMedication } from "../../context/useMedication";
import { AUDIO_PHRASES } from "../../constants/config";

export const NameStep: React.FC = () => {
  const { userProfile, saveUserName, speak } = useMedication();
  const [name, setName] = useState(userProfile?.name || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    speak(AUDIO_PHRASES.NAME_PROMPT);
  }, [speak]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      const err = "Пожалуйста, введите ваше имя";
      setError(err);
      speak(err);
      return;
    }
    setError(null);
    speak(`Приятно познакомиться, ${trimmed}! Теперь сфотографируем ваши назначения.`);
    saveUserName(trimmed);
  };

  return (
    <main className="register-container" aria-label="Экран ввода имени">
      <header className="register-header">
        <div className="register-pill-badge" aria-hidden="true">
          <User size={40} />
        </div>
        <h1 className="register-title" style={{ fontSize: 34 }}>Как вас зовут?</h1>
        <p className="register-subtitle">Чтобы обращаться к вам по имени</p>
      </header>

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-field-group">
          <label htmlFor="user-name-input" className="register-label" style={{ fontSize: 20 }}>
            Ваше имя
          </label>
          <div className="register-input-wrapper">
            <input
              id="user-name-input"
              type="text"
              className="register-input"
              style={{ fontSize: 24, padding: "18px 20px" }}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Например: Анна"
              autoFocus
              required
              aria-required="true"
            />
          </div>
          {error && <p className="register-error-text" role="alert">{error}</p>}
        </div>

        <button
          type="submit"
          className="btn-register-primary"
          style={{ minHeight: 80, fontSize: 24, fontWeight: 800 }}
          aria-label="Продолжить"
        >
          ПРОДОЛЖИТЬ
        </button>
      </form>
    </main>
  );
};
