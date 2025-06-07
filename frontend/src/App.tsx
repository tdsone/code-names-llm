import "./App.css";
import { Button } from "./components/ui/button";
import { Game } from "./components/Game";
import type { Game as GameType } from "../../shared/types";
import { useState } from "react";

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);

  const handleStartNewGame = () => {
    // Mock game data for testing
    const mockGame: GameType = {
      id: "test-game-1",
      currentTeam: "red",
      phase: "guessing",
      cards: [
        { word: "APPLE", type: "red" },
        { word: "OCEAN", type: "blue" },
        { word: "MOUNTAIN", type: "neutral" },
        { word: "SNAKE", type: "assassin" },
        { word: "BOOK", type: "red" },
        { word: "STAR", type: "blue" },
        { word: "CHAIR", type: "neutral" },
        { word: "FIRE", type: "red" },
        { word: "CLOUD", type: "blue" },
        { word: "PHONE", type: "neutral" },
        { word: "TREE", type: "red" },
        { word: "WATER", type: "blue" },
        { word: "DOOR", type: "neutral" },
        { word: "LIGHT", type: "red" },
        { word: "GRASS", type: "blue" },
        { word: "PAPER", type: "neutral" },
        { word: "WIND", type: "red" },
        { word: "STONE", type: "blue" },
        { word: "SOUND", type: "neutral" },
        { word: "DREAM", type: "red" },
        { word: "NIGHT", type: "blue" },
        { word: "DAY", type: "neutral" },
        { word: "MOON", type: "red" },
        { word: "SUN", type: "blue" },
        { word: "RAIN", type: "neutral" },
      ],
      createdAt: new Date(),
    };
    setCurrentGame(mockGame);
  };

  const handleCardClick = (cardIndex: number) => {
    if (!currentGame) return;

    const updatedGame = { ...currentGame };
    updatedGame.cards[cardIndex].revealed = true;
    setCurrentGame(updatedGame);
  };

  if (currentGame) {
    return <Game game={currentGame} onCardClick={handleCardClick} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
            Code Names
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md">
            Team up with AI in the classic word association game
          </p>
        </div>

        <Button
          onClick={handleStartNewGame}
          size="lg"
          className="text-lg px-8 py-6 h-auto"
        >
          Start New Game
        </Button>
      </div>
    </div>
  );
}

export default App;
