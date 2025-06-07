import "./App.css";
import { Button } from "./components/ui/button";
import { Game } from "./components/Game";
import type { Game as GameType } from "../../shared/types";
import { useState } from "react";

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);

  const handleStartNewGame = async () => {
    try {
      
      const response = await fetch("/api/game");
      const data = await response.json();
      const game: GameType = {
        id: "test",
        cards: data.game,
        currentTeam: "red",
        phase: "guessing",
        createdAt: new Date()
      };
      setCurrentGame(game);
    } catch (error) {
      console.error("Failed to start new game:", error);
    }
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
