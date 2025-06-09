import { useMemo, useState, useEffect } from "react";
import type { Card, Game as GameType } from "../../../shared/types";
import { Button } from "./ui/button";

interface GameProps {
  game: GameType;
  onCardClick: (cardIndex: number) => void;
  revealAll?: boolean;
}

export function Game({ game, onCardClick, revealAll }: GameProps) {
  const [guessResult, setGuessResult] = useState<"right" | "wrong" | null>(null);
  const [turnPassed, setTurnPassed] = useState(false);
  const [previousCards, setPreviousCards] = useState<Card[]>(game.cards);
  // Track the previous team that made a move
  const [previousTeam, setPreviousTeam] = useState<GameType["currentTeam"]>(game.currentTeam);


  useEffect(() => {
    if (guessResult) {
      const timer = setTimeout(() => {
        if (guessResult === "wrong") {
          setTurnPassed(true);
        }
        setGuessResult(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [guessResult]);

  useEffect(() => {
    if (turnPassed) {
      const timer = setTimeout(() => setTurnPassed(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [turnPassed]);

  useEffect(() => {
    const newRevealedIndex = game.cards.findIndex(
      (card, i) => card.revealed && !previousCards[i]?.revealed
    );

    if (newRevealedIndex !== -1) {
      const newCard = game.cards[newRevealedIndex];
      const isCorrect = newCard.type === previousTeam;
      setGuessResult(isCorrect ? "right" : "wrong");

      if (!isCorrect) {
        setTimeout(() => setTurnPassed(true), 1000);
      }
    }

    setPreviousCards(game.cards);
  }, [game.cards, previousTeam]);

  // Update previousTeam to the team before the current one
  useEffect(() => {
    setPreviousTeam(game.currentTeam);
  }, [game.currentTeam]);

  const shuffledIndices = useMemo(() => {
    const indices = [...Array(game.cards.length).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [game.id]);

  const getCardStyle = (card: Card, isRevealed: boolean) => {
    if (!isRevealed) {
      return "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900";
    }

    switch (card.type) {
      case "red":
        return "bg-red-500 text-white border-red-600";
      case "blue":
        return "bg-blue-500 text-white border-blue-600";
      case "neutral":
        return "bg-gray-400 text-white border-gray-500";
      case "assassin":
        return "bg-black text-white border-gray-800";
      default:
        return "bg-gray-100 text-gray-900 border-gray-300";
    }
  };

  const getCurrentTeamDisplay = () => {
    return game.currentTeam === "red" ? "Red" : "Blue";
  };

  const [revealedCards, setRevealedCards] = useState<boolean[]>(() =>
  game.cards.map((c) => c.revealed ?? false)
);

  const getPhaseDisplay = () => {
    const currentPlayers = game.teams[game.currentTeam].players;
    const spymaster = currentPlayers.find((p) => p.role === "spymaster");
    const operative = currentPlayers.find((p) => p.role === "operative");

    if (game.phase === "waiting") {
      if (game.clue && operative?.agent === "ai") return "Operative is thinking...";
      if (!game.clue && spymaster?.agent === "ai") return "Spymaster is thinking...";
      if (!game.clue && spymaster?.agent === "human") return "Make a clue";
      return "Waiting...";
    }

    switch (game.phase) {
      case "giving-clue":
        return spymaster?.agent === "ai" ? "Spymaster is thinking..." : "Make a clue";
      case "guessing":
        return operative?.agent === "ai" ? "Operative is thinking..." : "Team guessing";
      case "finished":
        return `Game finished! ${game.winner} team wins!`;
      default:
        return "";
    }
  };

  const handleCardClick = (cardIndex: number) => {
    const card = game.cards[cardIndex];
    if (!revealedCards[cardIndex] && game.phase === "guessing") {
      const isCorrect = card.type === game.currentTeam;
      setGuessResult(isCorrect ? "right" : "wrong");

      // Optimistically reveal the card
      setRevealedCards((prev) => {
        const updated = [...prev];
        updated[cardIndex] = true;
        return updated;
      });
    }

    onCardClick(cardIndex);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {guessResult && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded text-white text-xl font-bold shadow-md z-50 transition-opacity duration-500 ${guessResult === "right" ? "bg-green-600" : "bg-red-600"}`}>
            {guessResult === "right" ? "Right Guess!" : "Wrong Guess!"}
          </div>
        )}
        {turnPassed && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-yellow-500 text-white text-lg font-semibold shadow-lg z-50">
            Turn passed to the other team
          </div>
        )}
        {/* Game Header */}
        <div className="text-left mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Telepathy two
          </h1>
        </div>

        {/* Large screen Turn Info above board */}
        <div className="hidden lg:flex justify-center items-center gap-6 w-full text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          <span>{getCurrentTeamDisplay()} {getPhaseDisplay()}</span>
          {game.clue && game.phase === "guessing" && (
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow-sm">
              <span className="text-xl font-semibold text-indigo-800 dark:text-indigo-200">
                {game.clue.word}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-300 text-white font-semibold text-lg">
                {game.clue.number}
              </span>
            </div>
          )}
        </div>

        {/* Team Roles and Scores + Game Board Layout */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6 w-full">
          {/* Left Column: Teams */}
          <div className="flex flex-row gap-x-4 lg:flex-col justify-between lg:justify-start lg:w-1/5 w-full">
            {/* Red Team */}
            <div className={`flex-1 lg:w-full px-4 py-2 rounded-lg mb-4 lg:mb-6 ${game.currentTeam === "red" ? "bg-red-500 dark:bg-red-800" : "bg-red-100 dark:bg-red-900/30"}`}>
              <div className={`${game.currentTeam === "red" ? "text-white" : "text-red-600 dark:text-red-400"} font-semibold mb-1`}>Red</div>
              {game.teams.red.players.map((player) => (
                <div key={player.id} className={`text-sm mb-1 ${game.currentTeam === "red" ? "text-white font-semibold" : "text-red-500 dark:text-red-300"}`}>
                  {player.role.charAt(0).toUpperCase() + player.role.slice(1)}: {player.agent === "ai" ? "AI" : "🫵 You"}
                </div>
              ))}
              <div className={`text-sm ${game.currentTeam === "red" ? "text-white font-semibold" : "text-red-500 dark:text-red-300"}`}>
                {game.cards.filter((card) => card.type === "red" && !card.revealed).length} remaining
              </div>
            </div>

            {/* Blue Team */}
            <div className={`flex-1 lg:w-full px-4 py-2 rounded-lg mb-4 lg:mb-6 ${game.currentTeam === "blue" ? "bg-blue-500 dark:bg-blue-800" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              <div className={`${game.currentTeam === "blue" ? "text-white font-bold" : "text-blue-600 dark:text-blue-400"} font-semibold mb-1`}>Blue</div>
              {game.teams.blue.players.map((player) => (
                <div key={player.id} className={`text-sm mb-1 ${game.currentTeam === "blue" ? "text-white font-semibold" : "text-blue-500 dark:text-blue-300"}`}>
                  {player.role.charAt(0).toUpperCase() + player.role.slice(1)}: {player.agent === "ai" ? "AI" : "🫵 You"}
                </div>
              ))}
              <div className={`text-sm ${game.currentTeam === "blue" ? "text-white font-semibold" : "text-blue-500 dark:text-blue-300"}`}>
                {game.cards.filter((card) => card.type === "blue" && !card.revealed).length} remaining
              </div>
            </div>
          </div>

          {/* Center: Turn Info and Clue (only for small screens) */}
          <div className="flex justify-center items-center gap-6 lg:hidden w-full text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            <span>{getCurrentTeamDisplay()} {getPhaseDisplay()}</span>
            {game.clue && game.phase === "guessing" && (
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow-sm">
                <span className="text-xl font-semibold text-indigo-800 dark:text-indigo-200">
                  {game.clue.word}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-300 text-white font-semibold text-lg">
                  {game.clue.number}
                </span>
              </div>
            )}
          </div>

          {/* Game Board */}
          <div className="lg:w-4/5 w-full grid grid-cols-5 gap-4 mb-8">
            {shuffledIndices.map((realIndex) => {
              const card = game.cards[realIndex];
              const isRevealed = revealedCards[realIndex] || !!revealAll;
              return (
                <Button
                  key={realIndex}
                  onClick={() => handleCardClick(realIndex)}
                  className={`
                    h-24 text-lg font-semibold border-2 transition-all duration-200
                    ${getCardStyle(card, isRevealed)}
                    ${!card.revealed ? "hover:scale-105 cursor-pointer" : "cursor-default"}
                  `}
                  disabled={card.revealed || game.phase === "finished"}
                  variant="ghost"
                >
                  {card.word}
                </Button>
              );
            })}
          </div>
        </div>

        {game.phase === "waiting" && (
          <div className="mb-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded shadow text-center">
            {getPhaseDisplay()}
          </div>
        )}

        {/* Game Stats */}
        <div className="flex justify-center space-x-8 text-center">
          <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
            <div className="text-red-600 dark:text-red-400 font-semibold">
              Red Team
            </div>
            <div className="text-sm text-red-500 dark:text-red-300">
              {
                game.cards.filter(
                  (card) => card.type === "red" && !card.revealed
                ).length
              }{" "}
              remaining
            </div>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
            <div className="text-blue-600 dark:text-blue-400 font-semibold">
              Blue Team
            </div>
            <div className="text-sm text-blue-500 dark:text-blue-300">
              {
                game.cards.filter(
                  (card) => card.type === "blue" && !card.revealed
                ).length
              }{" "}
              remaining
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
