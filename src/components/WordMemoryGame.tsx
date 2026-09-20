import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Brain, Check, X, RotateCcw, Volume2, Sparkles, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useMedication } from "../context/useMedication";
import { audioService } from "../services/audio";
import { notifyGuardian } from "../services/guardianNotifications";

interface WordMemoryGameProps {
  onBackToMenu: () => void;
}

interface WordQuestionSet {
  words: [string, string, string];
  emojis: [string, string, string];
  testWord: string;
  testEmoji: string;
  wasPresent: boolean;
}

const WORD_QUESTION_POOL: WordQuestionSet[] = [
  {
    words: ["яблоко", "стул", "зонт"],
    emojis: ["🍎", "🪑", "☂️"],
    testWord: "стул",
    testEmoji: "🪑",
    wasPresent: true,
  },
  {
    words: ["яблоко", "стул", "зонт"],
    emojis: ["🍎", "🪑", "☂️"],
    testWord: "книга",
    testEmoji: "📖",
    wasPresent: false,
  },
  {
    words: ["хлеб", "ложка", "окно"],
    emojis: ["🍞", "🥄", "🪟"],
    testWord: "ложка",
    testEmoji: "🥄",
    wasPresent: true,
  },
  {
    words: ["хлеб", "ложка", "окно"],
    emojis: ["🍞", "🥄", "🪟"],
    testWord: "пальто",
    testEmoji: "🧥",
    wasPresent: false,
  },
  {
    words: ["чашка", "книга", "часы"],
    emojis: ["☕", "📖", "⏰"],
    testWord: "часы",
    testEmoji: "⏰",
    wasPresent: true,
  },
  {
    words: ["чашка", "книга", "часы"],
    emojis: ["☕", "📖", "⏰"],
    testWord: "лодка",
    testEmoji: "⛵",
    wasPresent: false,
  },
  {
    words: ["лампа", "цветок", "шарф"],
    emojis: ["💡", "🌸", "🧣"],
    testWord: "цветок",
    testEmoji: "🌸",
    wasPresent: true,
  },
  {
    words: ["лампа", "цветок", "шарф"],
    emojis: ["💡", "🌸", "🧣"],
    testWord: "стол",
    testEmoji: "🪵",
    wasPresent: false,
  },
  {
    words: ["чай", "ключ", "газета"],
    emojis: ["🍵", "🔑", "📰"],
    testWord: "чай",
    testEmoji: "🍵",
    wasPresent: true,
  },
  {
    words: ["чай", "ключ", "газета"],
    emojis: ["🍵", "🔑", "📰"],
    testWord: "солнце",
    testEmoji: "☀️",
    wasPresent: false,
  },
];

export const WordMemoryGame: React.FC<WordMemoryGameProps> = ({ onBackToMenu }) => {
  const { speak, playClick, userProfile, guardianLinkId } = useMedication();

  const [questionIndex, setQuestionIndex] = useState(() =>
    Math.floor(Math.random() * WORD_QUESTION_POOL.length)
  );
  const [phase, setPhase] = useState<"memorizing" | "asking" | "result">("memorizing");
  const [countdown, setCountdown] = useState<number>(10);
  const [userChoseYes, setUserChoseYes] = useState<boolean | null>(null);
  const timerRef = useRef<number | null>(null);

  const currentSet = WORD_QUESTION_POOL[questionIndex];

  // Start round
  const startRound = (newIndex?: number) => {
    const nextIdx =
      newIndex !== undefined
        ? newIndex
        : Math.floor(Math.random() * WORD_QUESTION_POOL.length);
    setQuestionIndex(nextIdx);
    setPhase("memorizing");
    setCountdown(10);
    setUserChoseYes(null);

    const set = WORD_QUESTION_POOL[nextIdx];
    speak(`Запомните три слова: ${set.words[0]}... ${set.words[1]}... ${set.words[2]}.`);
  };

  useEffect(() => {
    speak(`Запомните три слова: ${currentSet.words[0]}... ${currentSet.words[1]}... ${currentSet.words[2]}.`);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for 10 seconds during "memorizing"
  useEffect(() => {
    if (phase !== "memorizing") return;

    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPhase("asking");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase]);

  // When switching to asking phase, speak the question
  useEffect(() => {
    if (phase === "asking") {
      audioService.playChime("reminder");
      const q = `Было ли слово ${currentSet.testWord}?`;
      speak(q);
    }
  }, [phase, currentSet.testWord, speak]);

  const handleAnswer = (choseYes: boolean) => {
    playClick();
    setUserChoseYes(choseYes);
    setPhase("result");

    const isCorrect = choseYes === currentSet.wasPresent;

    if (isCorrect) {
      audioService.playChime("confirm");
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      speak("Правильно! Отличная память!");

      // Telegram notification to guardian
      notifyGuardian({
        guardianLinkId: guardianLinkId || undefined,
        userId: userProfile?.id || undefined,
        type: "game_completed",
        seniorName: userProfile?.name,
      }).catch((err) => console.warn("[WordMemoryGame] game_completed notification error:", err));
    } else {
      audioService.playChime("snooze");
      speak("Почти получилось! В следующий раз обязательно вспомните.");
    }
  };

  const handleRepeatVoice = () => {
    playClick();
    if (phase === "memorizing") {
      speak(`Запомните три слова: ${currentSet.words[0]}... ${currentSet.words[1]}... ${currentSet.words[2]}.`);
    } else if (phase === "asking") {
      speak(`Было ли слово ${currentSet.testWord}?`);
    }
  };

  const isCorrect = userChoseYes !== null ? userChoseYes === currentSet.wasPresent : false;

  return (
    <div className="screen-container" role="region" aria-label="Игра Запомни слова">
      {/* Header */}
      <div className="screen-header-row">
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            playClick();
            onBackToMenu();
          }}
          aria-label="Вернуться к выбору игр"
        >
          <ArrowLeft size={24} />
          <span>К ИГРАМ</span>
        </button>

        <h1 className="screen-title" style={{ fontSize: 26 }}>
          Запомни слова
        </h1>

        <button
          type="button"
          className="icon-button"
          onClick={() => startRound()}
          aria-label="Начать сначала"
          title="Начать сначала"
        >
          <RotateCcw size={22} />
        </button>
      </div>

      {/* PHASE 1: MEMORIZING (10 SECONDS) */}
      {phase === "memorizing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", marginTop: 8 }}>
          <div
            style={{
              background: "#0E2413",
              border: "2px solid #22C55E",
              borderRadius: 24,
              padding: "20px",
              textAlign: "center",
              boxShadow: "0 0 35px rgba(34, 197, 94, 0.2)",
            }}
          >
            <span style={{ fontSize: 22, color: "#86EFAC", fontWeight: 700, textTransform: "uppercase" }}>
              Запомните 3 слова
            </span>
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#07170B",
                padding: "8px 20px",
                borderRadius: 99,
                border: "1px solid #166534",
                color: "#64FF00",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              <span>Осталось:</span>
              <span style={{ fontSize: 26, fontVariantNumeric: "tabular-nums" }}>{countdown} сек</span>
            </div>
          </div>

          {/* 3 Large Word Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {currentSet.words.map((word, idx) => (
              <div
                key={idx}
                style={{
                  background: "#121A15",
                  border: "2px solid #1D4525",
                  borderRadius: 20,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                }}
              >
                <span style={{ fontSize: 44 }} aria-hidden="true">
                  {currentSet.emojis[idx]}
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    textTransform: "capitalize",
                    letterSpacing: "0.5px",
                  }}
                >
                  {word}
                </span>
              </div>
            ))}
          </div>

          {/* Listen Again Button */}
          <button
            type="button"
            className="btn-back"
            style={{
              justifyContent: "center",
              minHeight: 60,
              fontSize: 18,
              fontWeight: 700,
              color: "#86EFAC",
              background: "#0E2413",
              borderColor: "#166534",
            }}
            onClick={handleRepeatVoice}
            aria-label="Повторить слова голосом"
          >
            <Volume2 size={22} />
            <span>ПОВТОРИТЬ ГОЛОСОМ</span>
          </button>
        </div>
      )}

      {/* PHASE 2: ASKING (YES / NO QUESTION) */}
      {phase === "asking" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", marginTop: 8 }}>
          <div
            style={{
              background: "linear-gradient(180deg, #1A1F2C 0%, #0E131F 100%)",
              border: "2px solid #3B82F6",
              borderRadius: 24,
              padding: "26px 20px",
              textAlign: "center",
              boxShadow: "0 0 40px rgba(59, 130, 246, 0.25)",
            }}
          >
            <span style={{ fontSize: 18, color: "#93C5FD", fontWeight: 700, textTransform: "uppercase" }}>
              Проверка памяти
            </span>

            <div style={{ fontSize: 50, margin: "10px 0" }} aria-hidden="true">
              {currentSet.testEmoji}
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
              Было ли слово <span style={{ color: "#60A5FA" }}>«{currentSet.testWord}»</span>?
            </h2>
          </div>

          {/* Repeat voice button */}
          <button
            type="button"
            className="btn-back"
            style={{
              justifyContent: "center",
              minHeight: 52,
              fontSize: 17,
              fontWeight: 700,
              color: "#93C5FD",
              background: "#1E293B",
              borderColor: "#334155",
            }}
            onClick={handleRepeatVoice}
            aria-label="Повторить вопрос голосом"
          >
            <Volume2 size={20} />
            <span>ПОВТОРИТЬ ВОПРОС</span>
          </button>

          {/* YES / NO Huge Single-Tap Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 4 }}>
            {/* YES */}
            <button
              type="button"
              className="btn-confirm-taken"
              style={{
                minHeight: 90,
                fontSize: 30,
                fontWeight: 900,
                background: "#22C55E",
                borderColor: "#16A34A",
                color: "#05200D",
                flexDirection: "column",
                gap: 6,
                padding: "16px",
              }}
              onClick={() => handleAnswer(true)}
              aria-label="Да, было такое слово"
            >
              <Check size={40} strokeWidth={3} />
              <span>ДА</span>
            </button>

            {/* NO */}
            <button
              type="button"
              className="btn-snooze-action"
              style={{
                minHeight: 90,
                fontSize: 30,
                fontWeight: 900,
                background: "#2A1215",
                borderColor: "#EF4444",
                color: "#FCA5A5",
                flexDirection: "column",
                gap: 6,
                padding: "16px",
              }}
              onClick={() => handleAnswer(false)}
              aria-label="Нет, такого слова не было"
            >
              <X size={40} strokeWidth={3} />
              <span>НЕТ</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: RESULT */}
      {phase === "result" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", marginTop: 8 }}>
          <div
            style={{
              background: isCorrect ? "#0E2413" : "#241517",
              border: `2px solid ${isCorrect ? "#22C55E" : "#EF4444"}`,
              borderRadius: 24,
              padding: "30px 20px",
              textAlign: "center",
              boxShadow: `0 0 40px ${isCorrect ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.25)"}`,
            }}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 size={64} color="#64FF00" style={{ margin: "0 auto 12px" }} />
                <h2 style={{ fontSize: 34, fontWeight: 900, color: "#64FF00", margin: 0 }}>
                  Правильно! 🎉
                </h2>
                <p style={{ fontSize: 20, color: "#E2E8F0", marginTop: 10 }}>
                  {currentSet.wasPresent
                    ? `Слово «${currentSet.testWord}» действительно было в списке!`
                    : `Слова «${currentSet.testWord}» действительно не было!`}
                </p>
              </>
            ) : (
              <>
                <Brain size={64} color="#FCA5A5" style={{ margin: "0 auto 12px" }} />
                <h2 style={{ fontSize: 32, fontWeight: 900, color: "#FCA5A5", margin: 0 }}>
                  Почти получилось! 😊
                </h2>
                <p style={{ fontSize: 20, color: "#E2E8F0", marginTop: 10 }}>
                  {currentSet.wasPresent
                    ? `Слово «${currentSet.testWord}» было в списке.`
                    : `Слова «${currentSet.testWord}» не было в списке.`}
                </p>
                <div style={{ marginTop: 14, padding: "12px", background: "#150C0D", borderRadius: 14 }}>
                  <span style={{ fontSize: 16, color: "#94A3B8" }}>
                    Были слова: <strong>{currentSet.words.join(", ")}</strong>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              type="button"
              className="btn-register-primary"
              style={{ minHeight: 76, fontSize: 24, fontWeight: 800 }}
              onClick={() => startRound()}
              aria-label="Сыграть ещё раз"
            >
              <Sparkles size={26} />
              <span>СЫГРАТЬ ЕЩЁ РАЗ</span>
            </button>

            <button
              type="button"
              className="btn-back"
              style={{
                justifyContent: "center",
                minHeight: 64,
                fontSize: 20,
                fontWeight: 700,
                color: "#E2E8F0",
                background: "#1C1C1E",
                borderColor: "#3A3A3C",
              }}
              onClick={() => {
                playClick();
                onBackToMenu();
              }}
              aria-label="Вернуться к выбору игр"
            >
              <span>ВЫБРАТЬ ДРУГУЮ ИГРУ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
