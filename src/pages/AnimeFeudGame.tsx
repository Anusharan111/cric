import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FEUD_QUESTIONS, FeudQuestion, FeudAnswer } from "../data/animeFeudQuestions";
import { GameMode, buildTeams, Team, Player, TurnState, getInitialTurnState, advanceTurn, getActivePlayerId } from "../game/turnManager";
import { checkGuess } from "../game/feudEngine";
import { calculatePoints, updateScore, ScoreState } from "../game/scoring";
import { sfx } from "../utils/audio";

import PlayerSetup from "../components/feud/PlayerSetup";
import QuestionBoard from "../components/feud/QuestionBoard";
import StrikeSystem from "../components/feud/StrikeSystem";
import ScoreBoard from "../components/feud/ScoreBoard";
import GuessInput from "../components/feud/GuessInput";
import FinalWinner from "../components/feud/FinalWinner";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface AnimeFeudGameProps {
  onExit: () => void;
}

export default function AnimeFeudGame({ onExit }: AnimeFeudGameProps) {
  // Main phases: setup, playing, steal, round_end, winner
  const [phase, setPhase] = useState<"setup" | "playing" | "steal" | "round_end" | "winner">("setup");

  // Setup options
  const [mode, setMode] = useState<GameMode>("duel");
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roundsCount, setRoundsCount] = useState(5);
  const [categories, setCategories] = useState<string[]>(["All"]);

  // Game state
  const [questionsPool, setQuestionsPool] = useState<FeudQuestion[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [scores, setScores] = useState<ScoreState>({});
  const [strikes, setStrikes] = useState(0);
  
  // Turn control
  const [turnState, setTurnState] = useState<TurnState>({ currentTeamIdx: 0, teamPlayerIndices: {} });
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [roundPointsAccumulated, setRoundPointsAccumulated] = useState(0);
  const [originalControlTeamIdx, setOriginalControlTeamIdx] = useState(0);

  // Status message info
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Initialize a new game based on setup
  const handleStartGame = (config: {
    playerNames: string[];
    mode: GameMode;
    selectedCategories: string[];
    rounds: number;
  }) => {
    const { players: builtPlayers, teams: builtTeams } = buildTeams(config.playerNames, config.mode);
    setPlayers(builtPlayers);
    setTeams(builtTeams);
    setMode(config.mode);
    setRoundsCount(config.rounds);
    setCategories(config.selectedCategories);

    // Filter questions by categories
    let pool = [...FEUD_QUESTIONS];
    if (!config.selectedCategories.includes("All")) {
      pool = pool.filter((q) => config.selectedCategories.includes(q.category));
    }

    // Shuffle and pick N questions
    pool.sort(() => Math.random() - 0.5);
    const chosenQuestions = pool.slice(0, config.rounds);

    // If we have fewer questions than rounds, repeat or limit
    setQuestionsPool(chosenQuestions);
    setCurrentRoundIdx(0);

    // Initialize scores
    const initialScores: ScoreState = {};
    builtTeams.forEach((t) => {
      initialScores[t.id] = 0;
    });
    setScores(initialScores);

    // Initialize round
    startRound(0, chosenQuestions, builtTeams);
  };

  const startRound = (roundIdx: number, pool: FeudQuestion[], gameTeams: Team[]) => {
    setPhase("playing");
    setCurrentRoundIdx(roundIdx);
    setRevealedAnswers([]);
    setStrikes(0);
    setConsecutiveCorrect(0);
    setRoundPointsAccumulated(0);
    setFeedbackMsg(null);

    // Alternate initial round control between teams
    const startingTeamIdx = roundIdx % gameTeams.length;
    setOriginalControlTeamIdx(startingTeamIdx);

    const initialTurn = getInitialTurnState(gameTeams);
    initialTurn.currentTeamIdx = startingTeamIdx;
    setTurnState(initialTurn);
  };

  const currentQuestion: FeudQuestion | undefined = questionsPool[currentRoundIdx];
  const activeTeam = teams[turnState.currentTeamIdx];
  const activePlayerId = getActivePlayerId(teams, turnState);
  const activePlayer = players.find((p) => p.id === activePlayerId);

  const showFeedback = (text: string, type: "success" | "error" | "info") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Guess submission handler
  const handleSubmitGuess = (guess: string) => {
    if (!currentQuestion) return;

    const matchedIdx = checkGuess(guess, currentQuestion.answers, revealedAnswers);

    if (matchedIdx !== -1) {
      // CORRECT GUESS
      sfx.playCorrect();
      const matchedAnswer = currentQuestion.answers[matchedIdx];
      const nextRevealed = [...revealedAnswers, matchedIdx];
      setRevealedAnswers(nextRevealed);

      // Handle combo and points
      const nextConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(nextConsecutive);

      const ptCalc = calculatePoints(matchedAnswer.points, nextConsecutive);
      const pointsToAdd = ptCalc.total;

      showFeedback(
        `Correct! "${matchedAnswer.text}" revealed for ${matchedAnswer.points} points! ${
          ptCalc.bonus > 0 ? " (+10 Combo Bonus!)" : ""
        }`,
        "success"
      );

      if (mode === "party") {
        // Party Mode FFA: Points go directly to player/team immediately
        setScores((prev) => updateScore(prev, activeTeam.id, pointsToAdd));
      } else {
        // Duel & Team modes: points go into the round bank
        setRoundPointsAccumulated((prev) => prev + pointsToAdd);
      }

      // Check if all answers are revealed
      if (nextRevealed.length === currentQuestion.answers.length) {
        endRoundWithWinner();
        return;
      }

      // Turn management:
      if (mode === "party") {
        // Party mode: strictly rotate turn after correct guess
        setTurnState((prev) => advanceTurn(teams, prev));
        // Reset combo unless it's the same player's consecutive turns (FFA rotates so combo resets)
        setConsecutiveCorrect(0);
      } else {
        // Duel/Team mode: The team keeps control! Just rotate to the next player on the same team.
        // We do this by keeping the currentTeamIdx but incrementing the player index inside teamPlayerIndices.
        setTurnState((prev) => {
          const nextIndices = { ...prev.teamPlayerIndices };
          const curIdx = nextIndices[activeTeam.id] || 0;
          nextIndices[activeTeam.id] = (curIdx + 1) % activeTeam.playerIds.length;
          return {
            ...prev,
            teamPlayerIndices: nextIndices,
          };
        });
      }
    } else {
      // INCORRECT GUESS
      sfx.playWrong();
      setConsecutiveCorrect(0);

      if (mode === "party") {
        // FFA Party mode: no strikes or steals, just advance turn to next player
        showFeedback(`"${guess}" is not on the board!`, "error");
        setTurnState((prev) => advanceTurn(teams, prev));

        // If everyone keeps missing, end round after some threshold, or just let them guess.
        // Let's add a strike pool of 3 per round for FFA. Once 3 strikes total happen, round ends.
        const nextStrikes = strikes + 1;
        setStrikes(nextStrikes);
        if (nextStrikes >= 3) {
          endRoundWithWinner();
        }
      } else {
        // Duel & Team modes: Strike system applies
        const nextStrikes = strikes + 1;
        setStrikes(nextStrikes);
        showFeedback(`Wrong! Strike ${nextStrikes} for ${activeTeam.name}!`, "error");

        if (nextStrikes >= 3) {
          // ENTER STEAL PHASE
          setPhase("steal");
          // Opposing team gets the turn
          const opponentTeamIdx = (turnState.currentTeamIdx + 1) % teams.length;
          setTurnState((prev) => ({
            ...prev,
            currentTeamIdx: opponentTeamIdx,
          }));
        } else {
          // Keep control, rotate player within team
          setTurnState((prev) => {
            const nextIndices = { ...prev.teamPlayerIndices };
            const curIdx = nextIndices[activeTeam.id] || 0;
            nextIndices[activeTeam.id] = (curIdx + 1) % activeTeam.playerIds.length;
            return {
              ...prev,
              teamPlayerIndices: nextIndices,
            };
          });
        }
      }
    }
  };

  // Submit Steal guess
  const handleSubmitSteal = (guess: string) => {
    if (!currentQuestion) return;

    const matchedIdx = checkGuess(guess, currentQuestion.answers, revealedAnswers);
    const originalTeam = teams[originalControlTeamIdx];
    const stealingTeam = activeTeam; // activeTeam was switched to opponent

    if (matchedIdx !== -1) {
      // STEAL SUCCESS!
      sfx.playCorrect();
      const matchedAnswer = currentQuestion.answers[matchedIdx];
      const nextRevealed = [...revealedAnswers, matchedIdx];
      setRevealedAnswers(nextRevealed);

      const totalStolenPoints = roundPointsAccumulated + matchedAnswer.points;
      setScores((prev) => updateScore(prev, stealingTeam.id, totalStolenPoints));

      showFeedback(
        `STEAL SUCCESSFUL! ${stealingTeam.name} guessed "${matchedAnswer.text}" and stole all ${totalStolenPoints} points!`,
        "success"
      );
    } else {
      // STEAL FAIL - original team gets points
      sfx.playWrong();
      setScores((prev) => updateScore(prev, originalTeam.id, roundPointsAccumulated));
      showFeedback(
        `Steal failed! ${originalTeam.name} retains the round bank of ${roundPointsAccumulated} points.`,
        "error"
      );
    }

    // Move to round end phase
    setPhase("round_end");
    // Reveal all remaining answers on the board
    const allIndices = currentQuestion.answers.map((_, idx) => idx);
    setRevealedAnswers(allIndices);
  };

  // Auto round-end logic (when all answers guessed or max strikes reached)
  const endRoundWithWinner = () => {
    setPhase("round_end");
    // Award accumulated round bank points to the controlling team (if any remaining)
    if (mode !== "party" && roundPointsAccumulated > 0) {
      setScores((prev) => updateScore(prev, activeTeam.id, roundPointsAccumulated));
    }
    // Reveal all remaining answers on the board
    if (currentQuestion) {
      const allIndices = currentQuestion.answers.map((_, idx) => idx);
      setRevealedAnswers(allIndices);
    }
  };

  const handleNextRound = () => {
    const nextIdx = currentRoundIdx + 1;
    if (nextIdx < roundsCount && nextIdx < questionsPool.length) {
      startRound(nextIdx, questionsPool, teams);
    } else {
      sfx.playVictory();
      setPhase("winner");
    }
  };

  const handleRestart = () => {
    setPhase("setup");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-8 px-4 text-white">
      {phase === "setup" && (
        <PlayerSetup onStartGame={handleStartGame} onBack={onExit} />
      )}

      {(phase === "playing" || phase === "steal" || phase === "round_end") && currentQuestion && (
        <div className="w-full max-w-4xl space-y-6">
          {/* Header Progress Bar */}
          <div className="flex justify-between items-center bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400">
              Round <strong className="text-white">{currentRoundIdx + 1}</strong> of{" "}
              <strong className="text-white">{roundsCount}</strong>
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: roundsCount }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentRoundIdx
                      ? "bg-violet-500 shadow-md shadow-violet-500/50"
                      : idx < currentRoundIdx
                      ? "bg-emerald-500"
                      : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Quit Game
            </button>
          </div>

          {/* Feedback Display Banner */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-xl border text-center text-sm font-extrabold flex items-center justify-center gap-2 ${
                  feedbackMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                    : feedbackMsg.type === "error"
                    ? "bg-red-950/60 border-red-500/30 text-red-300"
                    : "bg-slate-900/60 border-slate-700/30 text-slate-300"
                }`}
              >
                {feedbackMsg.type === "success" && <ShieldCheck className="w-4 h-4" />}
                {feedbackMsg.type === "error" && <AlertCircle className="w-4 h-4 animate-shake" />}
                <span>{feedbackMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scoreboard */}
          <ScoreBoard
            teams={teams}
            players={players}
            scores={scores}
            activeTeamId={activeTeam?.id}
            mode={mode}
            consecutiveCorrect={consecutiveCorrect}
          />

          {/* Strikes & Round Bank Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {mode !== "party" && (
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-violet-500/10 min-h-[78px] text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Round Point Bank
                </span>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-md animate-pulse">
                  {roundPointsAccumulated}
                </span>
              </div>
            )}
            <StrikeSystem strikes={strikes} />
          </div>

          {/* Board */}
          <QuestionBoard
            questionText={currentQuestion.question}
            category={currentQuestion.category}
            answers={currentQuestion.answers}
            revealedIndices={revealedAnswers}
          />

          {/* Inputs Section */}
          <div className="pt-2">
            {phase === "playing" && (
              <GuessInput
                onSubmitGuess={handleSubmitGuess}
                activePlayerName={activePlayer?.name || activeTeam?.name}
                disabled={false}
                isStealPhase={false}
              />
            )}

            {phase === "steal" && (
              <GuessInput
                onSubmitGuess={handleSubmitSteal}
                activePlayerName={activePlayer?.name || activeTeam?.name}
                disabled={false}
                isStealPhase={true}
              />
            )}

            {phase === "round_end" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md mx-auto p-4 rounded-xl bg-slate-950/80 border border-violet-500/20 text-center space-y-4"
              >
                <div className="text-sm font-bold text-violet-300">
                  Round finished! All points tallied.
                </div>
                <button
                  onClick={handleNextRound}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-650 to-fuchsia-650 hover:from-violet-550 hover:to-fuchsia-550 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-950/20 transition"
                >
                  <span>
                    {currentRoundIdx + 1 === roundsCount ? "View Final Standings" : "Next Round"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {phase === "winner" && (
        <FinalWinner
          teams={teams}
          scores={scores}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
