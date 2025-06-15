import { useMemo, useState, useEffect } from "react";
import type { Card, Game as GameType } from "../../../shared/types";
import { Button } from "./ui/button";
import { ClueForm } from "./ClueForm";
import { Rules } from "./Rules";
import { About } from "./About"


import search from '../assets/search.svg'
import Clu3Logo from '../assets/Clu3.svg';

export function LoadingSpinner() {
  return (
    <img
      src={search}
      alt="Loading"
      className="animate-spin h-5 w-5 inline-block ml-2"
    />
  );
}


interface GameProps {
  game: GameType;
  onCardClick: (cardIndex: number) => void;
  revealAll?: boolean;
  isHumanSpymasterTurn?: boolean;
  humanRole?: string;
  showHumanInfo?: boolean;
  onSubmitClue?: ({ word, number }: { word: string; number: number }) => void;
}

export function Game({
  game,
  onCardClick,
  revealAll,
  isHumanSpymasterTurn,
  humanRole,
  showHumanInfo,
  onSubmitClue,
}: GameProps) {
  const [guessResult, setGuessResult] = useState<"right" | "wrong" | "assassin" | null>(null);
  const [turnPassed, setTurnPassed] = useState(false);
  const [previousCards, setPreviousCards] = useState<Card[]>(game.cards);
  // Track the previous team that made a move
  const [previousTeam, setPreviousTeam] = useState<GameType["currentTeam"]>(game.currentTeam);

  const [showRulesModal, setShowRulesModal] = useState(false);
  // Controls visibility of the About modal
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Track which revealed card index we have already processed this turn
  const [lastRevealedIndex, setLastRevealedIndex] = useState<number | null>(null);

  // When a wrong guess happens, show the banner for 1 s, then
  // 1) hide it and 2) show the "turn passed" banner.
  useEffect(() => {
    if (guessResult === "wrong") {
      const timer = setTimeout(() => {
        setGuessResult(null);      // hide "Wrong Guess!" banner
        setTurnPassed(true);       // now show "Turn passed" banner
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [guessResult]);

  useEffect(() => {
    if (turnPassed) {
      const timer = setTimeout(() => {
        setTurnPassed(false);
        setGuessResult(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turnPassed]);

  useEffect(() => {
    // Only run banner logic while the operative is guessing
    if (game.phase !== "guessing") {
      // Keep previousCards in sync so that the next turn starts clean
      setPreviousCards(game.cards);
      return;
    }
    if (guessResult || turnPassed) {
    setPreviousCards(game.cards);
    return;
  }


    const newRevealedIndex = game.cards.findIndex(
      (card, i) => card.revealed && !previousCards[i]?.revealed
    );

    // Prevent double‑handling the same card (e.g. when another update for the same turn arrives)
    if (newRevealedIndex !== -1 && newRevealedIndex !== lastRevealedIndex) {
      setLastRevealedIndex(newRevealedIndex);
      const newCard = game.cards[newRevealedIndex];
      const isAssassin = newCard.type === "assassin";
      if (isAssassin) {
        setGuessResult("assassin");
      } else {
        const isCorrect = newCard.type === previousTeam;
        setGuessResult(isCorrect ? "right" : "wrong");
      }
    }

    setPreviousCards(game.cards);
  }, [game.cards, game.phase, previousTeam, lastRevealedIndex, previousCards, guessResult, turnPassed]);

  // Update previousTeam to the team before the current one
  useEffect(() => {
    setPreviousTeam(game.currentTeam);
  }, [game.currentTeam]);

  // Clear the reveal tracker when the turn switches to the other team
  useEffect(() => {
    setLastRevealedIndex(null);
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
      return "bg-white border-gray-300 text-gray-900";
    }

    switch (card.type) {
      case "red":
        return "bg-[#F05F45] text-white border-[#F05F45]";
      case "blue":
        return "bg-[#6294D8] text-white border-[#6294D8]";
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

  // Show coloured borders only if the operative is AI
  const currentOperative = game.teams[game.currentTeam].players.find(
    (p) => p.role === "operative"
  );
  const shouldShowBorderColors = currentOperative?.agent === "ai";

  // Determine if we should show the loading spinner while AI is generating a clue
  const currentPlayers = game.teams[game.currentTeam].players;
  const spymaster = currentPlayers.find((p) => p.role === "spymaster");
  const showSpinner =
    (game.phase === "giving-clue" && spymaster?.agent === "ai") ||
    (game.phase === "waiting" && !game.clue && spymaster?.agent === "ai");

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
      if (card.type === "assassin") {
        setGuessResult("assassin");
        // Remember that we've already handled this reveal locally
        setLastRevealedIndex(cardIndex);
      } else {
        const isCorrect = card.type === game.currentTeam;
        setGuessResult(isCorrect ? "right" : "wrong");
        // Remember that we've already handled this reveal locally
        setLastRevealedIndex(cardIndex);
      }

      // Optimistically reveal the card
      setRevealedCards((prev) => {
        const updated = [...prev];
        updated[cardIndex] = true;
        return updated;
      });
    }

    onCardClick(cardIndex);
  };

  // Resets the app to its initial landing screen
  const handleStartNewGame = () => {
    window.location.reload(); // simplest reset for now
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F05F4533] to-[#6294D833] dark:from-gray-900 dark:to-gray-800 p-4">
      {showRulesModal && (
        <div
          className="fixed inset-0 bg-transparent flex items-start justify-center z-50 overflow-y-auto"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full relative my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Close rules modal"
            >
              ×
            </button>
            <Rules />
          </div>
        </div>
      )}
      {showAboutModal && (
        <div
          className="fixed inset-0 bg-transparent flex items-start justify-center z-50 overflow-y-auto"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full relative my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Close about modal"
            >
              ×
            </button>
            <About />
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {guessResult && (
          <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded text-white text-xl font-bold shadow-md z-50 transition-opacity duration-500 ${guessResult === "right"
            ? "bg-green-600"
            : guessResult === "assassin"
              ? "bg-black"
              : "bg-red-600"}`}>
            {guessResult === "right"
              ? "Right Guess!"
              : guessResult === "assassin"
                ? "Assassin Card – Game Over"
                : "Wrong Guess!"}
          </div>
        )}
        {turnPassed && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-yellow-500 text-white text-lg font-semibold shadow-lg z-50">
            Turn passed to the other team
          </div>
        )}
        {/* Game Header */}
        <header className="w-full flex flex-nowrap items-center py-4 px-4 sm:px-6 bg-white dark:bg-gray-900 shadow-md mb-6 rounded-lg">
          <div className="flex items-center space-x-4">
            <img src={Clu3Logo} alt="Clu3 Logo" className="lg:h-10 w-auto h-4 flex-shrink-0 mr-4" />
          </div>
          <div className="flex gap-2 sm:gap-4 ml-auto">
            <Button className="mx-2" variant="ghost" onClick={() => setShowRulesModal(true)}>
              Rules
            </Button>
            <Button
              className="mx-2"
              variant="ghost"
              onClick={() => setShowAboutModal(true)}
            >
              About
            </Button>
            <Button
              className="px-3 sm:px-4 py-1 bg-[#6294D8] hover:bg-[#4f7bc2] text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#6294D8] focus:ring-offset-2 font-semibold text-sm sm:text-base"
              onClick={handleStartNewGame}
            >
              <span className="sm:hidden">New&nbsp;Game</span>
              <span className="hidden sm:inline">Start&nbsp;New&nbsp;Game</span>
            </Button>
          </div>
        </header>

        {/* Large screen Turn Info above board */}
        <div className="hidden lg:flex justify-center items-center gap-6 w-full text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          <span>
            {getCurrentTeamDisplay()} {getPhaseDisplay()}
            {showSpinner && <LoadingSpinner />}
          </span>
          {game.clue && game.phase === "guessing" && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg shadow-sm border
              ${game.currentTeam === "red"
                ? "bg-[#F05F45]/10 dark:bg-[#F05F45]/30 border-[#F05F45]"
                : "bg-[#6294D8]/10 dark:bg-[#6294D8]/30 border-[#6294D8]"}`}>
              <span className={`text-xl font-semibold ${
                game.currentTeam === "red"
                  ? "text-[#F05F45] dark:text-[#F05F45]"
                  : "text-[#6294D8] dark:text-[#6294D8]"
              }`}>
                {game.clue.word}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-white font-semibold text-lg ${
                game.currentTeam === "red" ? "bg-[#F05F45]" : "bg-[#6294D8]"
              }`}>
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
            <div className={`flex-1 lg:w-full px-4 py-2 rounded-lg mb-4 lg:mb-6 ${game.currentTeam === "red" ? "bg-[#F05F45] dark:bg-[#F05F45]" : "bg-[#F05F45]/10 dark:bg-[#F05F45]/30"}`}>
              <div className={`${game.currentTeam === "red" ? "text-white" : "text-[#F05F45] dark:text-[#F05F45]"} font-semibold mb-1`}>Red</div>
              {game.teams.red.players.map((player) => (
                <div key={player.id} className={`text-sm mb-1 ${game.currentTeam === "red" ? "text-white font-semibold" : "text-[#F05F45] dark:text-[#F05F45]"}`}>
                  {player.role.charAt(0).toUpperCase() + player.role.slice(1)}: {player.agent === "ai" ? "AI" : `🫵 ${player.name}`}
                </div>
              ))}
              <div className={`text-sm ${game.currentTeam === "red" ? "text-white font-semibold" : "text-[#F05F45] dark:text-[#F05F45]"}`}>
                {game.cards.filter((card) => card.type === "red" && !card.revealed).length} remaining
              </div>
            </div>

            {/* Blue Team */}
            <div className={`flex-1 lg:w-full px-4 py-2 rounded-lg mb-4 lg:mb-6 ${game.currentTeam === "blue" ? "bg-[#6294D8] dark:bg-[#6294D8]" : "bg-[#6294D8]/10 dark:bg-[#6294D8]/30"}`}>
              <div className={`${game.currentTeam === "blue" ? "text-white font-bold" : "text-[#6294D8] dark:text-[#6294D8]"} font-semibold mb-1`}>Blue</div>
              {game.teams.blue.players.map((player) => (
                <div key={player.id} className={`text-sm mb-1 ${game.currentTeam === "blue" ? "text-white font-semibold" : "text-[#6294D8] dark:text-[#6294D8]"}`}>
                  {player.role.charAt(0).toUpperCase() + player.role.slice(1)}: {player.agent === "ai" ? "AI" : `🫵 ${player.name}`}
                </div>
              ))}
              <div className={`text-sm ${game.currentTeam === "blue" ? "text-white font-semibold" : "text-[#6294D8] dark:text-[#6294D8]"}`}>
                {game.cards.filter((card) => card.type === "blue" && !card.revealed).length} remaining
              </div>
            </div>
          </div>

          {/* Center: Turn Info and Clue (only for small screens) */}
          <div className="flex justify-center items-center gap-6 lg:hidden w-full text-lg font-semibold text-gray-700 dark:text-gray-300 text-sm">
            <span>
              {getCurrentTeamDisplay()} {getPhaseDisplay()}
              {showSpinner && <LoadingSpinner />}
            </span>
            {game.clue && game.phase === "guessing" && (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg shadow-sm border
                ${game.currentTeam === "red"
                  ? "bg-[#F05F45]/10 dark:bg-[#F05F45]/30 border-[#F05F45]"
                  : "bg-[#6294D8]/10 dark:bg-[#6294D8]/30 border-[#6294D8]"}`}>
                <span className={`text-xl font-semibold ${
                  game.currentTeam === "red"
                    ? "text-[#F05F45] dark:text-[#F05F45]"
                    : "text-[#6294D8] dark:text-[#6294D8]"
                }`}>
                  {game.clue.word}
                </span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-white font-semibold text-lg ${
                  game.currentTeam === "red" ? "bg-[#F05F45]" : "bg-[#6294D8]"
                }`}>
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
                    h-24 md:text-lg font-semibold border-2 transition-all duration-200
                    ${getCardStyle(card, isRevealed)} ${!isRevealed && shouldShowBorderColors && card.type === "red" ? "border-[#F05F45]" : ""} ${!isRevealed && shouldShowBorderColors && card.type === "blue" ? "border-[#6294D8]" : ""}
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
        {/* Clue submission UI, directly after the game cards */}
        {(showHumanInfo || isHumanSpymasterTurn) && (
          <div className="mb-8 flex flex-col items-center">
            {showHumanInfo && humanRole && (
              <div className="text-lg text-gray-800 dark:text-gray-100 font-medium mb-4">
                You are the <span className="font-bold">{humanRole}</span> — send AI a clue.
              </div>
            )}
            {isHumanSpymasterTurn && onSubmitClue && (
              <ClueForm onSubmit={onSubmitClue} />
            )}
          </div>
        )}

        {/* Game Stats */}
        <div className="flex justify-center space-x-8 text-center">
          <div className="bg-[#F05F45]/10 dark:bg-[#F05F45]/30 px-4 py-2 rounded-lg">
            <div className="text-[#F05F45] dark:text-[#F05F45] font-semibold">
              Red Team
            </div>
            <div className="text-sm text-[#F05F45] dark:text-[#F05F45]">
              {
                game.cards.filter(
                  (card) => card.type === "red" && !card.revealed
                ).length
              }{" "}
              remaining
            </div>
          </div>
          <div className="bg-[#6294D8]/10 dark:bg-[#6294D8]/30 px-4 py-2 rounded-lg">
            <div className="text-[#6294D8] dark:text-[#6294D8] font-semibold">
              Blue Team
            </div>
            <div className="text-sm text-[#6294D8] dark:text-[#6294D8]">
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
