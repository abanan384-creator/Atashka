import React, { useState } from "react";
import { ArrowLeft, RotateCcw, Bell, Brain, LayoutGrid } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { audioService } from "../services/audio";
import { notifyGuardian } from "../services/guardianNotifications";
import { WordMemoryGame } from "./WordMemoryGame";

interface CardItem {
  id: number;
  symbol: string;
  name: string;
  isMatched: boolean;
}

const CARDS_DATA = [
  { symbol: "🍎", name: "Яблоко" },
  { symbol: "🌻", name: "Подсолнух" },
  { symbol: "🍵", name: "Чай" },
  { symbol: "🍎", name: "Яблоко" },
  { symbol: "🌻", name: "Подсолнух" },
  { symbol: "🍵", name: "Чай" },
];

export const GameView: React.FC = () => {
  const { setActiveScreen, savedGameResumeState, triggerImmediateReminder, speak, playClick, userProfile, guardianLinkId } = useMedication();

  const [gameMode, setGameMode] = useState<"menu" | "pairs" | "word_memory">("menu");

  // Pairs game state
  const [cards, setCards] = useState<CardItem[]>(() =>
    CARDS_DATA.map((item, index) => ({
      id: index,
      symbol: item.symbol,
      name: item.name,
      isMatched: false,
    }))
  );
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [matchesFound, setMatchesFound] = useState<number>(0);

  const resetPairsGame = () => {
    speak("Начинаем новую игру. Карточки перемешаны.");
    const shuffled = [...CARDS_DATA].sort(() => Math.random() - 0.5);
    setCards(
      shuffled.map((item, index) => ({
        id: index,
        symbol: item.symbol,
        name: item.name,
        isMatched: false,
      }))
    );
    setFlippedIndexes([]);
    setMatchesFound(0);
  };

  const handleBackToHome = () => {
    speak("Возврат на главный экран");
    setActiveScreen("home");
  };

  const handleSelectPairs = () => {
    playClick();
    speak("Игра Пары. Найдите одинаковые картинки.");
    setGameMode("pairs");
  };

  const handleSelectWordMemory = () => {
    playClick();
    speak("Игра Запомни слова. Послушайте три слова.");
    setGameMode("word_memory");
  };

  const handleCardClick = (index: number) => {
    if (flippedIndexes.length === 2) return;
    if (cards[index].isMatched) return;
    if (flippedIndexes.includes(index)) return;

    speak(cards[index].name);

    const newFlipped = [...flippedIndexes, index];
    setFlippedIndexes(newFlipped);

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped;
      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // Matched!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c))
          );
          setFlippedIndexes([]);
          setMatchesFound((m) => {
            const nextM = m + 1;
            if (nextM === 3) {
              audioService.playChime("confirm");
              speak("Поздравляем! Все пары найдены. Прекрасная память!");
              notifyGuardian({
                guardianLinkId: guardianLinkId || undefined,
                userId: userProfile?.id || undefined,
                type: "game_completed",
                seniorName: userProfile?.name,
              }).catch((err) => console.warn("[GuardianNotification] game_completed failed:", err));
            } else {
              speak("Пара найдена! Отлично!");
            }
            return nextM;
          });
        }, 500);
      } else {
        // Not matched - flip back
        setTimeout(() => {
          setFlippedIndexes([]);
        }, 900);
      }
    }
  };

  const handleTestInterrupt = () => {
    speak("Проверка прерывания игры будильником лекарства");
    triggerImmediateReminder();
  };

  // 1. IF WORD MEMORY GAME SELECTED
  if (gameMode === "word_memory") {
    return <WordMemoryGame onBackToMenu={() => setGameMode("menu")} />;
  }

  // 2. IF MENU VIEW
  if (gameMode === "menu") {
    return (
      <div className="screen-container" role="region" aria-label="Выбор развивающей игры">
        <div className="screen-header-row">
          <button
            type="button"
            className="btn-back"
            onClick={handleBackToHome}
            aria-label="Вернуться на главный экран"
          >
            <ArrowLeft size={24} />
            <span>НАЗАД</span>
          </button>

          <h1 className="screen-title">Тренировка памяти</h1>

          <div style={{ width: 44 }} aria-hidden="true" />
        </div>

        {savedGameResumeState && (
          <div className="game-resume-notice" role="status">
            🔔 Игра была приостановлена для приёма лекарств. Вы можете продолжить в любой момент!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", marginTop: 12 }}>
          {/* 1. Игра Пары */}
          <button
            type="button"
            className="btn-game-action"
            style={{
              minHeight: 140,
              background: "linear-gradient(135deg, #1C1530 0%, #110D20 100%)",
              borderColor: "#3B2E5C",
              boxShadow: "0 8px 30px rgba(139, 92, 246, 0.15)",
            }}
            onClick={handleSelectPairs}
            aria-label="Игра Пары. Найдите одинаковые картинки"
          >
            <div
              className="btn-game-icon-wrap"
              style={{ background: "#2D224D", color: "#C4B5FD" }}
              aria-hidden="true"
            >
              <LayoutGrid size={44} />
            </div>
            <div className="btn-game-content">
              <span className="btn-game-title" style={{ fontSize: 26, color: "#FFFFFF" }}>
                ИГРА «ПАРЫ»
              </span>
              <span className="btn-game-sub" style={{ fontSize: 18, color: "#C4B5FD" }}>
                Найдите одинаковые картинки
              </span>
            </div>
          </button>

          {/* 2. Игра Запомни слова */}
          <button
            type="button"
            className="btn-game-action"
            style={{
              minHeight: 140,
              background: "linear-gradient(135deg, #0E2413 0%, #06150A 100%)",
              borderColor: "#22C55E",
              boxShadow: "0 8px 30px rgba(34, 197, 94, 0.15)",
            }}
            onClick={handleSelectWordMemory}
            aria-label="Игра Запомни слова. Голосовая тренировка памяти"
          >
            <div
              className="btn-game-icon-wrap"
              style={{ background: "#16401E", color: "#64FF00" }}
              aria-hidden="true"
            >
              <Brain size={44} />
            </div>
            <div className="btn-game-content">
              <span className="btn-game-title" style={{ fontSize: 26, color: "#FFFFFF" }}>
                «ЗАПОМНИ СЛОВА»
              </span>
              <span className="btn-game-sub" style={{ fontSize: 18, color: "#86EFAC" }}>
                Послушайте 3 слова и ответьте Да / Нет
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // 3. IF PAIRS GAME VIEW
  return (
    <div className="screen-container" role="region" aria-label="Экран игры в Пары">
      <div className="screen-header-row">
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            playClick();
            setGameMode("menu");
          }}
          aria-label="Вернуться к выбору игр"
        >
          <ArrowLeft size={24} />
          <span>К ИГРАМ</span>
        </button>

        <h1 className="screen-title">Игра: Пары</h1>

        <button
          type="button"
          className="icon-button"
          onClick={resetPairsGame}
          aria-label="Начать заново"
          title="Начать заново"
        >
          <RotateCcw size={22} />
        </button>
      </div>

      <div className="game-header-card">
        <span className="game-score-display">
          Найдено пар: <strong>{matchesFound} из 3</strong>
        </span>

        {/* Demo Button to test interruption specifically as required by AGENTS.md #6 & #16 */}
        <button
          type="button"
          className="btn-demo-pill"
          style={{ background: "#DC2626", borderColor: "#EF4444" }}
          onClick={handleTestInterrupt}
          title="Проверить прерывание игры напоминанием"
        >
          <Bell size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Тест прерывания
        </button>
      </div>

      <div className="game-board" role="grid" aria-label="Игровое поле">
        {cards.map((card, idx) => {
          const isFlipped = flippedIndexes.includes(idx) || card.isMatched;

          return (
            <button
              type="button"
              key={card.id}
              className={`game-card-tile ${card.isMatched ? "matched" : ""} ${isFlipped ? "flipped" : ""}`}
              onClick={() => handleCardClick(idx)}
              aria-label={`Карточка ${idx + 1}: ${isFlipped ? card.name : "закрыта"}`}
              disabled={card.isMatched}
            >
              {isFlipped ? card.symbol : "❓"}
            </button>
          );
        })}
      </div>

      {matchesFound === 3 && (
        <div style={{ textAlign: "center", padding: "18px", background: "#0E2413", border: "2px solid #22C55E", borderRadius: "20px", marginTop: "12px" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#64FF00", margin: 0 }}>Отлично! Все пары найдены 🎉</h2>
          <p style={{ fontSize: 18, color: "#86EFAC", marginTop: 6 }}>Прекрасная тренировка внимания и памяти.</p>
        </div>
      )}
    </div>
  );
};
