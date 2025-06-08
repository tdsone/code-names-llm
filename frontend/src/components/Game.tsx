import { useMemo } from "react";
import type { Card, Game as GameType } from "../../../shared/types";
import { Button } from "./ui/button";

interface GameProps {
  game: GameType;
  onCardClick: (cardIndex: number) => void;
  revealAll?: boolean;
}

export function Game({ game, onCardClick, revealAll }: GameProps) {
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
    return game.currentTeam === "red" ? "Red Team" : "Blue Team";
  };

  const getPhaseDisplay = () => {
    switch (game.phase) {
      case "waiting":
        return "Waiting to start...";
      case "giving-clue":
        return "Spymaster giving clue";
      case "guessing":
        return "Team guessing";
      case "finished":
        return `Game finished! ${game.winner} team wins!`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Game Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Code Names
          </h1>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Current Turn:{" "}
              <span
                className={`${
                  game.currentTeam === "red" ? "text-red-600" : "text-blue-600"
                }`}
              >
                {getCurrentTeamDisplay()}
              </span>
            </p>
            <p className="text-md text-gray-600 dark:text-gray-400">
              {getPhaseDisplay()}
            </p>
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {shuffledIndices.map((realIndex) => {
            const card = game.cards[realIndex];
            const isRevealed = card.revealed || !!revealAll;
            return (
              <Button
                key={realIndex}
                onClick={() => onCardClick(realIndex)}
                className={`
                  h-24 text-lg font-semibold border-2 transition-all duration-200
                  ${getCardStyle(card, isRevealed)}
                  ${
                    !card.revealed
                      ? "hover:scale-105 cursor-pointer"
                      : "cursor-default"
                  }
                `}
                disabled={card.revealed || game.phase === "finished"}
                variant="ghost"
              >
                {card.word}
              </Button>
            );
          })}
        </div>

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
