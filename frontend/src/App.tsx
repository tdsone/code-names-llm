import "./App.css";
import { Button } from "./components/ui/button";
import { Game } from "./components/Game";
import type { Game as GameType } from "../../shared/types";
import { useState, useEffect } from "react";
import { isAISpymasterTurn } from "../utils/isAISpymaster";
import { ClueForm } from "./components/ClueForm";
import search from './assets/search.svg';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <img src={search} alt="Loading" className="animate-spin h-12 w-12 text-indigo-600" />
      <p className="mt-4 text-lg text-gray-700 dark:text-gray-200">Looking for the exciting set of words...</p>
    </div>
  );
}

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(false);
const human = currentGame
  ? [
      ...currentGame.teams.red.players.map((p) => ({ ...p, team: "red" as const })),
      ...currentGame.teams.blue.players.map((p) => ({ ...p, team: "blue" as const })),
    ].find(
      (p) =>
        p.agent === "human" &&
        p.role === "spymaster" &&
        p.team === currentGame.currentTeam
    )
  : null;

  const role = human?.role === "spymaster" ? "Spymaster" : "Operative";
  const revealAll = human?.role === "spymaster";
  const isHumanSpymasterTurn =
  currentGame &&
  human?.role === "spymaster" &&
  currentGame.phase === "waiting" &&
  human?.team === currentGame.currentTeam
  
  const handleStartNewGame = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/game");
      const data = await response.json();
      setCurrentGame(data.game);
    } catch (error) {
      console.error("Failed to start new game:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (cardIndex: number) => {
    if (!currentGame) return;

    // only allow clicking if we're in the guessing phase and guesses remain
    if (
      currentGame.phase !== "guessing" ||
      (currentGame.guessesRemaining !== undefined &&
        currentGame.guessesRemaining <= 0)
    ) {
      return;
    }

    // reveal by asking the backend
    try {
      const res = await fetch(
        `/api/game/${currentGame.id}/cards/${cardIndex}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team: currentGame.currentTeam }),
        }
      );
      const { game } = await res.json();
      setCurrentGame(game); // new game state includes updated cards + possible turn switch
    } catch (err) {
      console.error("Failed to flip card:", err);
    }
  };

  // ➋ When the game lands in "waiting" *and* the active spymaster is AI,
  //    ask the backend to generate the clue, then refresh local state.
  useEffect(() => {
    if (!currentGame) return;

    if (isAISpymasterTurn(currentGame)) {
      (async () => {
        const res = await fetch(`/api/game/${currentGame.id}/ai-clue`, {
          method: "POST",
        });
        const { game } = await res.json();
        setCurrentGame(game); // <- now contains game.clue, phase:"guessing"
      })().catch(console.error);
    }
  }, [currentGame]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (currentGame) {
    return (
      <div className="flex flex-col items-center mt-6">
        {human && (
          <div className="mb-3 text-lg text-gray-800 dark:text-gray-100 font-medium">
            You are the <span className="font-bold">{role}</span> — the AI is
            your {role === "Spymaster" ? "Operative" : "Spymaster"}.
          </div>
        )}
        {isHumanSpymasterTurn && (
          <ClueForm
            onSubmit={async ({ word, number }) => {
              try {
                const res = await fetch(`/api/game/${currentGame.id}/clue`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ word, number }),
                });
                const { game } = await res.json();
                setCurrentGame(game);
              } catch (err) {
                console.error("Clue submission failed", err);
              }
            }}
          />
        )}
        <Game game={currentGame} onCardClick={handleCardClick} revealAll={revealAll} />
      </div>
    );
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
 