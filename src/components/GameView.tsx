import React, { useState } from "react";
import { ArrowLeft, RotateCcw, Bell } from "lucide-react";
import { useMedication } from "../context/useMedication";
import { audioService } from "../services/audio";
import { notifyGuardian } from "../services/guardianNotifications";

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
  const { setActiveScreen, savedGameResumeState, triggerImmediateReminder, speak, userProfile, guardianLinkId } = useMedication();

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

  const resetGame = () => {
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

  const handleBack = () => {
    speak("Возврат на главный экран");
    setActiveScreen("home");
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

  return (
    <div className="screen-container" role="region" aria-label="Экран игры">
      <div className="screen-header-row">
        <button
          type="button"
          className="btn-back"
          onClick={handleBack}
          aria-label="Вернуться на главный экран"
        >
          <ArrowLeft size={24} />
          <span>НАЗАД</span>
        </button>

        <h1 className="screen-title">Игра: Пары</h1>

        <button
          type="button"
          className="icon-button"
          onClick={resetGame}
          aria-label="Начать заново"
          title="Начать заново"
        >
          <RotateCcw size={22} />
        </button>
      </div>

      {savedGameResumeState && (
        <div className="game-resume-notice" role="status">
          🔔 Игра была приостановлена для приёма лекарств. Состояние сохранено, вы можете продолжить!
        </div>
      )}

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
        <div style={{ textAlign: "center", padding: "16px", background: "#0E2413", border: "1px solid #164E24", borderRadius: "18px", marginTop: "10px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#64FF00" }}>Отлично! Все пары найдены 🎉</h2>
          <p style={{ fontSize: 16, color: "#A3E635", marginTop: 4 }}>Прекрасная тренировка внимания.</p>
        </div>
      )}
    </div>
  );
};
