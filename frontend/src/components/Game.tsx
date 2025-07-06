import { useMemo, useState, useEffect, Fragment } from "react";
import type { Card, Game as GameType } from "../../../shared/types";
import { Button } from "./ui/button";
import { ClueForm } from "./ClueForm";
import { Rules } from "./Rules";
import { About } from "./About"


import search from '../assets/search.svg'
import Clu3Logo from '../assets/Clu3.svg';

import { Dialog, Transition } from "@headlessui/react";
import RevealClues from "./RevealClues";

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
  onCardClick?: (cardIndex: number) => void;
  revealAll?: boolean;
  isHumanSpymasterTurn?: boolean;
  humanRole?: string;
  showHumanInfo?: boolean;
  onSubmitClue?: ({ word, number }: { word: string; number: number }) => void;
  onGameUpdate?: (g: GameType) => void;
}

export function Game({
  game: initialGame,
  revealAll,
  isHumanSpymasterTurn,
  humanRole,
  showHumanInfo,
  onSubmitClue,
  onGameUpdate,
}: GameProps) {
  const [guessResult, setGuessResult] = useState<"right" | "wrong" | "assassin" | null>(null);
  const [game, setGame] = useState<GameType>(initialGame);
  // Temporarily hides the clue after a wrong guess
  const [hideClue, setHideClue] = useState(false);
  const [turnPassed, setTurnPassed] = useState(false);
  const [previousCards, setPreviousCards] = useState<Card[]>(game.cards);
  // ----- Post‑game feedback banner -----
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  // Track the previous team that made a move
  const [previousTeam, setPreviousTeam] = useState<GameType["currentTeam"]>(game.currentTeam);
  // Identify the current operative early, because several hooks below depend on it
  const currentOperative = game.teams[game.currentTeam].players.find(
    (p) => p.role === "operative"
  );
  /**
   * Show team colours only if **this viewer** is playing the spymaster role.
   * If the viewer is an operative (human), keep cards neutral until revealed.
   * Fall back to the old operative‑AI heuristic if humanRole is undefined.
   */
  const shouldShowBorderColors = humanRole
    ? humanRole.toLowerCase() === "spymaster"
    : (currentOperative?.agent ?? "").trim().toLowerCase() === "ai";
  // True while we're waiting for the AI spymaster to deliver a clue
  const [awaitingClue, setAwaitingClue] = useState<boolean>(
    !game.clue || !game.clue.word?.trim()
  );

  // Force spinner to show after wrong guess if next spymaster is AI
  const [forceSpinner, setForceSpinner] = useState(false);

  // ---- AI operative helpers ----------------------------------
  // True while the AI operative is still choosing a card
  const [awaitingGuess, setAwaitingGuess] = useState(false);
  // Ensures the spinner shows for a perceptible duration, even if the AI guesses instantly
  const [spinnerActive, setSpinnerActive] = useState(false);

  useEffect(() => {
    setGame(initialGame);
  }, [initialGame]);
  // Keep spinner visible for a minimum of 600 ms once the AI operative starts thinking
  useEffect(() => {
    if (awaitingGuess) {
      // AI just started thinking
      setSpinnerActive(true);
      return;
    }
    // AI finished thinking — wait 600 ms before hiding spinner so users notice it
    if (spinnerActive) {
      const t = setTimeout(() => setSpinnerActive(false), 600);
      return () => clearTimeout(t);
    }
  }, [awaitingGuess]);
  // Stores the word the AI operative just revealed (for banner text)
  const [lastGuessWord, setLastGuessWord] = useState<string | null>(null);
  // Keeps track of which cards were revealed by the AI operative
  const [aiRevealedCards, setAiRevealedCards] = useState<boolean[]>(() =>
    game.cards.map(() => false)
  );

  /**
   * Wrapper around the upstream onSubmitClue handler.
   * Triggers the AI‑thinking spinner as soon as the human spymaster
   * submits a clue, so users immediately see feedback.
   */
  const handleSubmitClue = ({ word, number }: { word: string; number: number }) => {
    // Forward the clue to the parent handler first
    if (onSubmitClue) {
      onSubmitClue({ word, number });
    }
    // If the current operative is an AI, start the "thinking" spinner right away
    const operative = game.teams[game.currentTeam].players.find((p) => p.role === "operative");
    if ((operative?.agent ?? "").trim().toLowerCase() === "ai") {
      setAwaitingGuess(true);
    }
  };
  // ---- AI operative helpers ----------------------------------
  const [showRulesModal, setShowRulesModal] = useState(false);
  // Controls visibility of the About modal
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Track which revealed card index we have already processed this turn
  const [lastRevealedIndex, setLastRevealedIndex] = useState<number | null>(null);

  // When a wrong guess happens, show the banner for 1 s, then
  // 1) hide it and 2) show the "turn passed" banner.
  useEffect(() => {
    if (guessResult === "wrong") {
      setHideClue(true); // hide clue while waiting for new one
      const timer = setTimeout(() => {
        setGuessResult(null);      // hide "Wrong Guess!" banner
        setTurnPassed(true);       // now show "Turn passed" banner
        // If next spymaster is AI, force the spinner to show
        const nextTeam = previousTeam === "red" ? "blue" : "red";
        const nextSpymaster = game.teams[nextTeam].players.find((p) => p.role === "spymaster");
        if (nextSpymaster?.agent === "ai") {
          setForceSpinner(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [guessResult]);

  // Auto-dismiss the "assassin" banner after 5 seconds
  useEffect(() => {
    if (guessResult === "assassin") {
      const timer = setTimeout(() => {
        setGuessResult(null);
      }, 5000);
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
    // 👇 For AI‑operative turns we sometimes receive the reveal after the
    // backend has already flipped the phase to "waiting". Treat that case
    // the same as "guessing" so banners still appear.
    const aiRevealDuringWaiting =
      game.phase === "waiting" &&
      (currentOperative?.agent ?? "").trim().toLowerCase() === "ai";

    // Skip processing only if it's neither the guessing phase nor the
    // special AI‑waiting scenario.
    if (game.phase !== "guessing" && !aiRevealDuringWaiting) {
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
      // If the current operative is AI, capture its guess and stop the spinner
      if ((currentOperative?.agent ?? "").trim().toLowerCase() === "ai") {
        setLastGuessWord(game.cards[newRevealedIndex].word);
        setAiRevealedCards((prev) => {
          const clone = [...prev];
          clone[newRevealedIndex] = true;
          return clone;
        });
        setAwaitingGuess(false);
      }
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
  }, [game.cards, game.phase, previousTeam, lastRevealedIndex, previousCards, guessResult, turnPassed, currentOperative]);

  // Track the previous team when the turn switches
  useEffect(() => {
    setPreviousTeam(game.currentTeam);
  }, [game.currentTeam]);

  // Toggle awaitingClue whenever the clue becomes empty vs. non‑empty
  useEffect(() => {
    if (game.phase === "finished") {
      setAwaitingClue(false);
      return;
    }

    const hasRealClue = !!game.clue && !!game.clue.word?.trim();
    setAwaitingClue(!hasRealClue);
    if (hasRealClue) {
      setForceSpinner(false);
      setHideClue(false); // show clue again once fresh clue arrives
    }
  }, [game.clue?.word, game.clue?.number, game.phase]);

  // Kick‑off AI‑operative spinner the moment a clue appears while phase is still "waiting"
  useEffect(() => {
    const isAIOperative =
      (currentOperative?.agent ?? "").trim().toLowerCase() === "ai";

    if (
      game.phase === "waiting" &&
      isAIOperative &&
      !!game.clue?.word?.trim()
    ) {
      setAwaitingGuess(true);      // start the thinking spinner
    }
  }, [game.phase, game.clue?.word, currentOperative]);

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
    // Dependency array intentionally left empty so the order
    // is computed once when the component mounts.
  }, []);

  /**
   * Apply team colours **only** when the operative is AI (i.e. humans are spymasters).
   * Otherwise, unrevealed cards stay neutral so human guessers can't see colours.
   */
  const getCardStyle = (card: Card, isRevealed: boolean) => {
    const opacityClass = isRevealed ? "opacity-40" : "!opacity-100";

    // If humans are guessing (operative is human), hide colours on unrevealed cards
    if (!shouldShowBorderColors && !isRevealed) {
      return `bg-gray-100 text-gray-900 border-gray-300 ${opacityClass}`;
    }

    // Otherwise show the full team colours
    switch (card.type) {
      case "red":
        return `bg-[#F05F45] text-white border-[#F05F45] ${opacityClass}`;
      case "blue":
        return `bg-[#6294D8] text-white border-[#6294D8] ${opacityClass}`;
      case "neutral":
        return `bg-gray-400 text-white border-gray-500 ${opacityClass}`;
      case "assassin":
        return `bg-black text-white border-gray-800 ${opacityClass}`;
      default:
        return `bg-gray-100 text-gray-900 border-gray-300 ${opacityClass}`;
    }
  };

  const getCurrentTeamDisplay = () => {
    return game.currentTeam === "red" ? "Red" : "Blue";
  };


  // Spinner logic for AI operative thinking
  useEffect(() => {
    const isAIOperative =
      (currentOperative?.agent ?? "").trim().toLowerCase() === "ai";

    if (game.phase === "guessing" && isAIOperative) {
      // Has any new card been revealed since this guessing phase started?
      const anyNewReveal = game.cards.some(
        (c, i) => c.revealed && !previousCards[i]?.revealed
      );
      setAwaitingGuess(!anyNewReveal);
    } else {
      setAwaitingGuess(false);
    }
  }, [game.phase, game.cards, previousCards, currentOperative]);



  const [revealedCards, setRevealedCards] = useState<boolean[]>(() =>
    game.cards.map((c) => c.revealed ?? false)
  );

  // Keep local reveal tracking in sync with server pushes
  useEffect(() => {
    setRevealedCards(game.cards.map((c) => c.revealed ?? false));
  }, [game.cards]);

  // ----- Modal for revealing AI clues -----
  const [isClueModalOpen, setIsClueModalOpen] = useState(false);
  const assassinRevealed = game.cards.some(
    (c) => c.type === "assassin" && c.revealed
  );
  const isGameOver = game.phase === "finished" || assassinRevealed;
  // Adjust this if your backend exposes a different property
  const aiClueWords: string[] = (game as any).aiClueWords ?? [];

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

  // Determine if the spymaster is currently thinking, based on the phase message
  const phaseMessage = getPhaseDisplay();
  const currentPlayers = game.teams[game.currentTeam].players;
  const spymaster = currentPlayers.find((p) => p.role === "spymaster");
  // Show spinner while either (a) an AI spymaster is preparing a clue
  // or (b) an AI operative is deciding on a guess
  const isAISpymaster  = spymaster?.agent?.trim().toLowerCase() === "ai";
  const isAIOperative  = currentOperative?.agent?.trim().toLowerCase() === "ai";

  const showSpinner =
    (isAISpymaster && (forceSpinner || awaitingClue)) ||
    (isAIOperative && spinnerActive);


  const handleCardClick = async (cardIndex: number) => {
  // Ignore clicks unless guessing and no AI spinner
  if (game.phase !== "guessing" || showSpinner) return;

  // Local feedback (unchanged) ───────────────────────────────
  const card = game.cards[cardIndex];
  if (!revealedCards[cardIndex]) {
    const isCorrect = card.type === game.currentTeam;
    if (card.type === "assassin") setGuessResult("assassin");
    else setGuessResult(isCorrect ? "right" : "wrong");

    setLastRevealedIndex(cardIndex);
    setRevealedCards(prev => {
      const copy = [...prev];
      copy[cardIndex] = true;
      return copy;
    });
  }

  // 🔑  SEND the guess with the *current* team every time
  try {
    const res  = await fetch(`/api/game/${game.id}/cards/${cardIndex}`, {
      method : "PUT",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ team: game.currentTeam }),   // always fresh
    });
    const data = await res.json();
    if (res.ok && data.success) {
      // Push updated game from server
      onGameUpdate ? onGameUpdate(data.game) : setGame(data.game);
    } else {
      console.error("Guess failed:", data.message ?? res.statusText);
    }
  } catch (err) {
    console.error("Network error:", err);
  }

};

const handleEndTurn = async () => {
  // Only the operative can end the turn while it's still guessing and no AI spinner is active
  if (game.phase !== "guessing" || showSpinner) return;

  try {
    const res = await fetch(`/api/game/${game.id}/pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: game.currentTeam }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message ?? res.statusText);
      return;
    }

    // Prefer the parent‑supplied setter if available; otherwise fall back to local state.
    if (onGameUpdate) {
      onGameUpdate(data.game);
    } else {
      setGame(data.game);
    }
  } catch (err) {
    console.error("End turn failed:", err);
  }
};

  

  // Resets the app to its initial landing screen
  const handleStartNewGame = () => {
    window.location.reload(); // simplest reset for now
  };

  /**
   * Persist the user's 1‑5 rating for AI clues/guesses, then
   * trigger the backend to save the finished game to Supabase.
   */
  const submitRating = async (rating: number) => {
    if (feedbackSubmitted) return; // prevent double‑submits

    // Decide which category to store based on human role
    const category =
      humanRole?.toLowerCase() === "operative" ? "clue" : "guess";

    try {
      // 1️⃣ Save the rating to the in‑memory game object on the server
      await fetch(`/api/game/${game.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category }),
      });

      // 2️⃣ Ask the server to persist the full game to Supabase
      await fetch(`/api/game/${game.id}/save`, { method: "POST" });

      setFeedbackSubmitted(true); // hide banner
    } catch (err) {
      console.error("Rating / save failed:", err);
      // You can optionally surface a toast or keep the banner for retry
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F05F4533] to-[#6294D833] dark:from-gray-900 dark:to-gray-800
           px-2 sm:px-4 pt-0 sm:pt-4 pb-4 sm:mt-4">
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
            {lastGuessWord && (
              <>
                AI guessed "<span className="underline">{lastGuessWord}</span>" —{" "}
              </>
            )}
            {guessResult === "right"
              ? "Correct!"
              : guessResult === "assassin"
              ? "Assassin Card – Game Over"
              : "Wrong!"}
          </div>
        )}
        {isGameOver && !guessResult && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded bg-black text-white text-xl font-bold shadow-md z-50 transition-opacity duration-500">
            Game Over!{" "}
            {("winner" in game && game.winner)
              ? `${game.winner.charAt(0).toUpperCase()}${game.winner.slice(1)} team wins!`
              : ""}
          </div>
        )}
        {isGameOver && !feedbackSubmitted && (
          <div className="absolute top-28 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base sm:text-lg shadow-lg z-50 w-11/12 sm:w-auto">
            <p className="mb-3 font-semibold text-center">
              {humanRole?.toLowerCase() === "operative"
                ? "How did you like the AI clues?"
                : "How did you like the AI guesses?"}
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => submitRating(n)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        {turnPassed && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-yellow-500 text-white text-lg font-semibold shadow-lg z-50">
            Turn passed to the other team
          </div>
        )}
        {/* Game Header */}
        <header className="w-full flex flex-nowrap items-center py-4 px-4 sm:px-6 bg-white dark:bg-gray-900 shadow-md mb-6 rounded-lg mt-2">
          <div className="flex items-center space-x-4 mt-2">
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
            {getCurrentTeamDisplay()} {phaseMessage}
            {showSpinner && <LoadingSpinner />}
          </span>
          {!hideClue && game.clue && game.phase === "guessing" && (
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
              {getCurrentTeamDisplay()} {phaseMessage}
              {showSpinner && <LoadingSpinner />}
            </span>
            {!hideClue && game.clue && game.phase === "guessing" && (
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
          <div className="relative lg:w-4/5 w-full grid grid-cols-5 gap-4 mb-8">
            {showSpinner && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 flex flex-col items-center justify-center z-50 pointer-events-none">
                <LoadingSpinner />
                <span className="mt-4 text-gray-800 dark:text-gray-200 font-semibold">
                  thinking…
                </span>
              </div>
            )}
            {shuffledIndices.map((realIndex) => {
              const card = game.cards[realIndex];
              const isRevealed = revealedCards[realIndex] || !!revealAll;
              return (
                <Button
                  key={realIndex}
                  onClick={() => handleCardClick(realIndex)}
                  className={`
                    relative h-24 md:text-lg font-semibold border-2 transition-all duration-200
                    ${getCardStyle(card, !!card.revealed)}
                    ${!card.revealed ? "hover:scale-105 hover:bg-gray-200 cursor-pointer" : "cursor-default"}
                    ${isRevealed && aiRevealedCards[realIndex] ? " ring-4 ring-yellow-300" : ""}
                  `}
                  disabled={card.revealed || game.phase !== "guessing" || showSpinner}
                >
                  <span>{card.word}</span>
                  {isRevealed && aiRevealedCards[realIndex] && (
                    <span className="absolute top-0 left-0 m-1 px-1.5 rounded bg-yellow-400 text-[10px] font-bold text-gray-900">
                      AI
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          {game.phase === "guessing" &&
            !showSpinner &&
            (currentOperative?.agent ?? "").trim().toLowerCase() === "human" &&
            game.guessesRemaining === 1 && (
              <div className="flex justify-center mb-6">
                <Button
                  onClick={handleEndTurn}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
                >
                  End Turn
                </Button>
              </div>
          )}
        </div>
        {/* Clue submission UI, directly after the game cards */}
        {(showHumanInfo || isHumanSpymasterTurn) && (
          <div className="mb-8 flex flex-col items-center">
            {showHumanInfo && humanRole && (
              <div className="text-lg text-gray-800 dark:text-gray-100 font-medium mb-4">
                You are the <span className="font-bold">{humanRole}</span> — send AI a clue.
              </div>
            )}
            {isHumanSpymasterTurn && onSubmitClue && awaitingClue && (
              <ClueForm onSubmit={handleSubmitClue} />
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

        {/* Reveal AI clues button + modal (visible only after game ends) */}
        {isGameOver && (
          <>
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => setIsClueModalOpen(true)}
                className="rounded bg-[#F05F45] px-4 py-2 text-white hover:bg-[#F05F45] focus:outline-none focus:ring-2 focus:ring-[#F05F45]"
              >
                Reveal AI clues
              </button>
            </div>

            <Transition appear show={isClueModalOpen} as={Fragment}>
              <Dialog
                as="div"
                className="relative z-50"
                onClose={() => setIsClueModalOpen(false)}
              >
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-200"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="fixed inset-0 bg-black/40" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-4">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-200"
                      enterFrom="scale-95 opacity-0"
                      enterTo="scale-100 opacity-100"
                      leave="ease-in duration-150"
                      leaveFrom="scale-100 opacity-100"
                      leaveTo="scale-95 opacity-0"
                    >
                      <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                        <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                          AI Clued Words
                        </Dialog.Title>

                        <RevealClues clues={aiClueWords} isGameOver={true} />

                        <div className="mt-6 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsClueModalOpen(false)}
                            className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            Close
                          </button>
                        </div>
                      </Dialog.Panel>
                    </Transition.Child>
                  </div>
                </div>
              </Dialog>
            </Transition>
          </>
        )}
      </div>
    </div>
  );
}
