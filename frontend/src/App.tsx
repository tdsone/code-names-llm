import "./App.css";
import { Button } from "./components/ui/button";
import { Game } from "./components/Game";
import GameInput from "./components/GameInput";
import type { Game as GameType } from "../../shared/types";
import { useState, useEffect } from "react";
import { isAISpymasterTurn } from "../utils/isAISpymaster";
import search from './assets/search.svg';
import Clu3 from './assets/Clu3.svg'
import { Rules } from "./components/Rules";

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-gradient-to-b from-[#F05F4566] to-[#6294D866]">
      <img src={search} alt="Loading" className="animate-spin h-12 w-12 text-indigo-600" />
      <p className="mt-4 text-lg text-gray-700 dark:text-gray-200">Mixing up a fresh game board…</p>
    </div>
  );
}

function App() {
  // Simple routing: render Rules page if URL is /rules
  if (window.location.pathname === "/rules") {
    return <Rules />;
  }

  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGameInput, setShowGameInput] = useState(false);

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
  
  
  const handleStartNewGame = () => {
    setShowGameInput(true);
  };

  const handlePlayersSubmit = async (gameSetup: any) => {
    setShowGameInput(false);
    setLoading(true);
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameSetup),
      });
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
      <div className="flex flex-col items-center mt-0">
        <Game
          game={currentGame}
          onCardClick={handleCardClick}
          revealAll={revealAll}
          isHumanSpymasterTurn={!!(
            currentGame &&
            human?.role === "spymaster" &&
            currentGame.phase === "waiting" &&
            human?.team === currentGame.currentTeam
          )}
          humanRole={role}
          showHumanInfo={!!human}
          onSubmitClue={async ({ word, number }) => {
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-gradient-to-b from-[#F05F4566] to-[#6294D866]">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <img src={Clu3} alt="clu3 logo" className="mx-auto w-48 h-auto" />
          <p className="text-xl text-[#F05F45] dark:text-gray-300 max-w-md">
            Human intuition meets machine intelligence in the new-era edition of Codenames
          </p>
        </div>

        <Button
          onClick={handleStartNewGame}
          size="lg"
          className="text-lg px-8 py-6 h-auto bg-[#6294D8] hover:bg-[#4F7FC0] text-white"
        >
          Start New Game
        </Button>
      </div>

      {showGameInput && (
        <GameInput
          onPlayersSubmit={handlePlayersSubmit}
          onClose={() => setShowGameInput(false)}
        />
      )}
    </div>
  );
}

export default App;