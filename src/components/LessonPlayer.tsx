import { getAudioContext } from "../lib/audio";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Play,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Trophy,
  Flame,
  Gem,
  Shield,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Question, LearningLevel, UserProfile } from "../types";

interface LessonPlayerProps {
  track:
    | "personalFinance"
    | "accounting"
    | "statistics"
    | "appliedMath"
    | "calculus"
    | "microeconomics";
  levelNumber: number;
  chapterIndex: number;
  levelData: LearningLevel;
  onFinished: (
    scorePercent: number,
    starsEarned: number,
    gemsAwarded: number,
    streakIncrement: number,
  ) => void;
  onCancel: () => void;
  user?: UserProfile;
  onUpdateUser?: (updated: UserProfile) => Promise<void>;
}

// Synthesis of chimes using standard browser Web Audio API
function playChime(correct: boolean) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("soundEnabled") === "false") return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (correct) {
      // Elegant major chord (Success Chime)
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = f;
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
      });
    } else {
      // Low dual-frequency flat tone (Error Buzzer)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 140;
      osc2.frequency.value = 143; // slight detuning

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    }
  } catch (err) {
    console.error("Audio Context playback ignored.", err);
  }
}

// Generates a structural formula template from a specific math explanation
function createConceptTemplate(explanation: string) {
  if (!explanation) return "";
  return explanation
    .replace(
      /(The correct answer is|It is|Option [A-D] is|Option [A-D] costs|Option [A-D]).*?((because)|(\.)|(\n))/gi,
      "Key principle: ",
    )
    .replace(/\$\d+(?:,\d+)*(?:\.\d+)?/g, "[VALUE]")
    .replace(/\b\d+(?:\.\d+)?\b/g, "[X]");
}

export default function LessonPlayer({
  track,
  levelNumber,
  chapterIndex,
  levelData,
  onFinished,
  onCancel,
  user,
  onUpdateUser,
}: LessonPlayerProps) {
  const chapter = levelData.chapters[chapterIndex];

  // Player state machine
  const [mode, setMode] = useState<
    "reading" | "practice" | "quiz" | "mastered"
  >("reading");
  const [isSoundEnabled, setIsSoundEnabled] = useState(
    () => localStorage.getItem("soundEnabled") !== "false",
  );
  const [practiceStep, setPracticeStep] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [readingStep, setReadingStep] = useState(0);

  // Quiz tracking
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [calculationInput, setCalculationInput] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Scoring
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Powerups simulation state variables
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [hasUsedChrono, setHasUsedChrono] = useState(false);
  const [powerupFeedback, setPowerupFeedback] = useState("");
  const [powerupError, setPowerupError] = useState("");

  // Read steps length
  const totalReadingSteps = chapter.readingContent.length;
  const questions = chapter.quizQuestions;
  const currentQuestion: Question = questions[currentQuestionIdx];

  // Helper count inventory stocks
  const countInventoryStock = (itemId: string): number => {
    if (!user || !user.unlockedItems) return 0;
    return user.unlockedItems.filter((id) => id === itemId).length;
  };

  const handleUsePowerup = async (type: "50-50" | "shield" | "chrono") => {
    setPowerupFeedback("");
    setPowerupError("");

    if (!user) {
      setPowerupError("Please authenticate to access quiz power-up boosts!");
      return;
    }

    const itemId =
      type === "50-50"
        ? "powerup_50_50"
        : type === "shield"
          ? "powerup_extra_life"
          : "powerup_extra_time";
    const gemCost = type === "50-50" ? 30 : type === "shield" ? 60 : 40;
    const inventoryCount = countInventoryStock(itemId);
    const hasInStock = inventoryCount > 0;

    if (!hasInStock && user.gems < gemCost) {
      setPowerupError(
        `⚠️ Insufficient funds. Requires ${gemCost} 💎 gems (you have ${user.gems} 💎) or 1 pre-owned item stock.`,
      );
      return;
    }

    // Play a lovely sci-fi wave sound
    if (isSoundEnabled && typeof window !== "undefined") {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(900, now + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        o.start(now);
        o.stop(now + 0.3);
      } catch {}
    }

    // Prepare updated user profile
    let updatedUnlockedItems = [...(user.unlockedItems || [])];
    let finalGems = user.gems;

    if (hasInStock) {
      // Consume 1 from inventory
      const index = updatedUnlockedItems.indexOf(itemId);
      if (index > -1) {
        updatedUnlockedItems.splice(index, 1);
      }
    } else {
      // Charge gems on-the-spot
      finalGems -= gemCost;
    }

    const updatedUser: UserProfile = {
      ...user,
      gems: finalGems,
      unlockedItems: updatedUnlockedItems,
    };

    try {
      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
    } catch (err: any) {
      setPowerupError("Failed to deduct token from server database. Standby.");
      return;
    }

    // Apply exact gameplay mechanics
    if (type === "50-50") {
      if (!currentQuestion.options || currentQuestion.options.length < 3) {
        setPowerupError("This question does not support 50/50 splitting.");
        return;
      }
      const options = currentQuestion.options || [];
      const correct = currentQuestion.correctAnswer;
      const wrongOptions = options.filter((opt) => opt !== correct);

      const toDisable: string[] = [];
      while (toDisable.length < 2 && wrongOptions.length > 0) {
        const randIdx = Math.floor(Math.random() * wrongOptions.length);
        const picked = wrongOptions.splice(randIdx, 1)[0];
        toDisable.push(picked);
      }
      setDisabledOptions(toDisable);
      setPowerupFeedback(
        "✨ 50/50 Formula Applied! Eliminated two incorrect multiple choice options.",
      );
    } else if (type === "shield") {
      setIsShieldActive(true);
      setPowerupFeedback(
        "🛡️ Aegis Second Life Shield Engaged! Your next incorrect answer penalty is negated.",
      );
    } else if (type === "chrono") {
      setHasUsedChrono(true);
      setPowerupFeedback(
        "⏳ Temporal Sandglass turned! Added maximum focus buffer to analytical labs.",
      );
    }
  };

  // Progression functions
  const handleNextReading = () => {
    if (readingStep < totalReadingSteps - 1) {
      setReadingStep(readingStep + 1);
    } else {
      // Move to practice
      setMode("practice");
      setPracticeStep(0);
      setIsCardFlipped(false);
    }
  };

  const handleNextPractice = () => {
    if (practiceStep < questions.length - 1) {
      setPracticeStep(practiceStep + 1);
      setIsCardFlipped(false);
    } else {
      setMode("quiz");
      setCurrentQuestionIdx(0);
    }
  };

  const handlePrevPractice = () => {
    if (practiceStep > 0) {
      setPracticeStep(practiceStep - 1);
      setIsCardFlipped(false);
    } else {
      setMode("reading");
      setReadingStep(totalReadingSteps - 1);
    }
  };

  const handlePrevReading = () => {
    if (readingStep > 0) {
      setReadingStep(readingStep - 1);
    } else {
      onCancel();
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = () => {
    if (isAnswered) return;

    let isAnsCorrect = false;

    if (currentQuestion.type === "calculation") {
      // Flexible matching for calculation inputs
      const cleanedInput = calculationInput
        .trim()
        .toLowerCase()
        .replace(/[$,\s]/g, "");
      const cleanedCorrect = currentQuestion.correctAnswer
        .toLowerCase()
        .replace(/[$,\s]/g, "");

      // Also match if input is selecting multiple choice option
      if (selectedOption) {
        const cleanedOption = selectedOption
          .toLowerCase()
          .replace(/[$,\s]/g, "");
        isAnsCorrect =
          cleanedOption === cleanedCorrect ||
          selectedOption === currentQuestion.correctAnswer;
      } else {
        isAnsCorrect =
          cleanedInput === cleanedCorrect ||
          calculationInput.trim() === currentQuestion.correctAnswer;
      }
    } else {
      isAnsCorrect = selectedOption === currentQuestion.correctAnswer;
    }

    // Aegis shield deflection check
    if (!isAnsCorrect && isShieldActive) {
      setIsShieldActive(false);
      setPowerupFeedback(
        "🛡️ Aegis Deflection Active! Shield absorbed the incorrect answer penalty. You have 1 extra life retry!",
      );

      // Synthesize protective buzz
      if (isSoundEnabled && typeof window !== "undefined") {
        try {
          const ctx = getAudioContext();
          if (!ctx) return;
          const now = ctx.currentTime;
          [350, 450, 550].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(f, now + i * 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.4);
          });
        } catch {}
      }

      // Also if option was wrong and disabledOptions doesn't have it, disable it so they don't select it anymore
      if (selectedOption) {
        setDisabledOptions((prev) => [...prev, selectedOption]);
      }
      setSelectedOption(null);
      setCalculationInput("");
      return;
    }

    setIsCorrect(isAnsCorrect);
    setIsAnswered(true);
    playChime(isAnsCorrect);

    if (isAnsCorrect) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setCalculationInput("");
    setIsAnswered(false);

    // Clear temporary powerup effects for the next question
    setDisabledOptions([]);
    setIsShieldActive(false);
    setPowerupFeedback("");
    setPowerupError("");

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Completed last question!
      setMode("mastered");
    }
  };

  const handleFinishLesson = () => {
    const finalPercent = Math.round(
      (correctAnswersCount / questions.length) * 100,
    );
    let stars = 1;
    if (finalPercent >= 85) stars = 3;
    else if (finalPercent >= 50) stars = 2;

    const gemsEarned = 50 + stars * 10;
    onFinished(finalPercent, stars, gemsEarned, 1);
  };

  // Compute progress bar width
  const progressRatio =
    mode === "reading"
      ? ((readingStep + 1) / totalReadingSteps) * 20
      : mode === "practice"
        ? 20 + ((practiceStep + 1) / questions.length) * 30
        : 50 + ((currentQuestionIdx + 1) / questions.length) * 50;

  return (
    <div id="lesson-player-wrapper" className="max-w-2xl mx-auto py-4">
      {/* Upper Navigation Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onCancel}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        {/* Progress tracks */}
        <div className="flex-grow bg-slate-200 rounded-full h-4 overflow-hidden relative border border-slate-300">
          <div
            className="bg-brand-secondary h-full transition-all duration-300 relative progress-bar-shine"
            style={{ width: `${progressRatio}%` }}
          >
            <div className="absolute top-0 bottom-0 left-0 right-0 bg-white/20 progress-bar-shine"></div>
          </div>
        </div>

        <button
          onClick={() => {
            const newState = !isSoundEnabled;
            setIsSoundEnabled(newState);
            localStorage.setItem("soundEnabled", newState ? "true" : "false");

            // Immediate auditory feedback for the toggle itself
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (newState) {
              // Ascending "ON" chime
              osc.frequency.setValueAtTime(440, now);
              osc.frequency.setValueAtTime(659.25, now + 0.1);
              gain.gain.setValueAtTime(0, now);
              gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
              osc.start(now);
              osc.stop(now + 0.35);
            } else {
              // Descending "OFF" blip
              osc.frequency.setValueAtTime(659.25, now);
              osc.frequency.setValueAtTime(440, now + 0.1);
              gain.gain.setValueAtTime(0, now);
              gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
              osc.start(now);
              osc.stop(now + 0.25);
            }
          }}
          className={`p-2 border rounded-xl transition ${isSoundEnabled ? "bg-teal-50 border-teal-200 text-brand-secondary hover:bg-teal-100" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"}`}
          title={isSoundEnabled ? "Mute Sound" : "Unmute Sound"}
        >
          {isSoundEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </div>

      {mode === "reading" && (
        <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm animate-pop">
          <div className="flex items-center gap-2 text-brand-secondary">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">
              MIT ACADEMIC NOTES • BITE {readingStep + 1} OF {totalReadingSteps}
            </span>
          </div>

          <h3 className="font-display font-black text-2xl text-slate-900 leading-tight">
            Historical Foundations of the Topic
          </h3>

          <div className="text-slate-700 leading-relaxed space-y-4 font-sans text-base md:text-lg border-l-4 border-brand-secondary/30 pl-4 py-1.5">
            <p>{chapter.readingContent[readingStep]}</p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={handlePrevReading}
              className="flex-1 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextReading}
              className="flex-1 bg-brand-secondary text-white py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs border-b-4 border-teal-900 active:border-b-0 active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mode === "practice" && (
        <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 shadow-sm animate-pop flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between text-brand-secondary mb-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold uppercase tracking-widest font-mono text-amber-600">
                PRACTICE CARD • {practiceStep + 1} OF {questions.length}
              </span>
            </div>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold border truncate max-w-[150px] text-slate-500 text-right">
              {questions[practiceStep]?.mitOcwReference}
            </span>
          </div>

          <div
            className="flex-grow flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-amber-300 transition-all bg-slate-50"
            onClick={() => setIsCardFlipped(!isCardFlipped)}
          >
            {!isCardFlipped ? (
              <div className="space-y-4 animate-pop p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  CONCEPT PREVIEW
                </span>
                <h3 className="font-display font-medium text-xl md:text-2xl text-slate-800 leading-snug">
                  What is the core principle behind{" "}
                  <strong className="text-amber-600">
                    {questions[practiceStep]?.mitOcwReference}
                  </strong>
                  ?
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">
                  Tap card to reveal concept breakdown
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-pop w-full p-2">
                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-left">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">
                    STRUCTURAL FORMULA / RULE
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {createConceptTemplate(
                      questions[practiceStep]?.explanation,
                    )}
                  </p>
                </div>
                <div className="bg-white border text-left border-amber-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-2">
                    PRACTICAL APPLICATION
                  </span>
                  <p className="text-sm text-slate-800 leading-relaxed italic">
                    When interpreting scenarios such as{" "}
                    <strong className="font-mono text-xs not-italic">
                      "{questions[practiceStep]?.mitOcwReference}"
                    </strong>
                    , always map out the required variables carefully before
                    determining the unknown value. Ensure you apply the specific
                    formula described above in the upcoming quiz.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6 mt-auto border-t border-slate-200">
            <button
              onClick={handlePrevPractice}
              className="flex-1 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-xs uppercase tracking-wider transition"
            >
              Previous
            </button>
            <button
              onClick={handleNextPractice}
              className="flex-1 bg-amber-500 text-white py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs border-b-4 border-amber-700 active:border-b-0 active:translate-y-[2px] transition-all text-center flex items-center justify-center gap-2"
            >
              {practiceStep < questions.length - 1 ? "Next Card" : "Start Quiz"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mode === "quiz" && currentQuestion && (
        <div className="space-y-6 animate-pop">
          {/* Main Quiz Window */}
          <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
              <span className="font-mono uppercase text-brand-secondary tracking-wider">
                Question {currentQuestionIdx + 1} of {questions.length}
              </span>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold border truncate max-w-[200px]">
                {currentQuestion.mitOcwReference}
              </span>
            </div>

            <h4 className="font-display font-extrabold text-xl md:text-2xl text-slate-900 leading-snug">
              {currentQuestion.questionText}
            </h4>

            {/* Calculations special numerical field integration */}
            {currentQuestion.type === "calculation" && (
              <div className="space-y-3">
                <input
                  type="text"
                  disabled={isAnswered}
                  placeholder="Enter numeric response or select corresponding choice..."
                  value={calculationInput}
                  onChange={(e) => setCalculationInput(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none font-mono text-base"
                />
              </div>
            )}

            {/* Multiple Choice Options */}
            {currentQuestion.options && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isDisabledOption = disabledOptions.includes(option);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered || isDisabledOption}
                      onClick={() => handleOptionSelect(option)}
                      className={`text-left p-4 rounded-xl border-b-4 transition-all duration-100 flex items-start gap-3 ${
                        isDisabledOption
                          ? "bg-slate-100/50 border-slate-200 text-slate-350 opacity-40 hover:none cursor-not-allowed line-through"
                          : isAnswered
                            ? isSelected
                              ? isCorrect
                                ? "bg-emerald-50 border-emerald-500 border-b-2 text-emerald-900 ring-2 ring-emerald-500"
                                : "bg-rose-50 border-rose-500 border-b-2 text-rose-900 ring-2 ring-rose-500"
                              : "bg-slate-50 border-slate-200 hover:none text-slate-400"
                            : isSelected
                              ? "bg-blue-50 border-blue-600 text-blue-900 translate-y-[2px]"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:translate-y-[2px]"
                      }`}
                    >
                      <span className="font-bold flex-shrink-0 bg-slate-100 text-slate-600 rounded-lg w-7 h-7 flex items-center justify-center border border-slate-200 text-xs">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium text-sm md:text-base leading-tight mt-0.5">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Strategic Power-Ups Interactive Deck */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black font-display uppercase text-slate-600 tracking-wider">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>Strategic Quiz Power-Ups</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                  <Gem className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{user?.gems || 0} 💎</span>
                </div>
              </div>

              {powerupFeedback && (
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-2 animate-pop">
                  <span className="text-base">🚀</span>{" "}
                  <span>{powerupFeedback}</span>
                </div>
              )}

              {powerupError && (
                <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center gap-2 animate-pop">
                  <span className="text-base">⚠️</span>{" "}
                  <span>{powerupError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={
                    isAnswered ||
                    disabledOptions.length > 0 ||
                    !currentQuestion.options
                  }
                  onClick={() => handleUsePowerup("50-50")}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    disabledOptions.length > 0
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-55"
                      : "bg-white border-slate-250 hover:border-amber-400 hover:shadow"
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase font-mono tracking-tight">
                    50/50 Split
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">
                    Qty: {countInventoryStock("powerup_50_50")} owned
                  </span>
                  <span className="text-[9px] text-amber-600 font-black font-mono bg-amber-50/50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-0.5 mt-1">
                    <Gem className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />{" "}
                    30
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAnswered || isShieldActive}
                  onClick={() => handleUsePowerup("shield")}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    isShieldActive
                      ? "bg-indigo-50 border-indigo-200 text-indigo-800 ring-2 ring-indigo-300 font-bold"
                      : "bg-white border-slate-250 hover:border-indigo-400 hover:shadow"
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase font-mono tracking-tight">
                    Shield Life
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">
                    Qty: {countInventoryStock("powerup_extra_life")} owned
                  </span>
                  <span className="text-[9px] text-indigo-600 font-black font-mono bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5 mt-1">
                    <Gem className="w-2.5 h-2.5 fill-indigo-500 text-indigo-500" />{" "}
                    60
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAnswered || hasUsedChrono}
                  onClick={() => handleUsePowerup("chrono")}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    hasUsedChrono
                      ? "bg-emerald-50 border-emerald-250 text-emerald-800 ring-2 ring-emerald-300 font-bold"
                      : "bg-white border-slate-250 hover:border-emerald-400 hover:shadow"
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase font-mono tracking-tight">
                    Time Warp
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">
                    Qty: {countInventoryStock("powerup_extra_time")} owned
                  </span>
                  <span className="text-[9px] text-emerald-700 font-black font-mono bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 mt-1">
                    <Gem className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />{" "}
                    40
                  </span>
                </button>
              </div>
            </div>

            {/* Feedback Response Box */}
            {isAnswered && (
              <div
                className={`p-5 rounded-2xl border-l-4 font-sans text-sm md:text-base ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                    : "bg-rose-50 border-rose-500 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold font-display text-sm md:text-base">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Excellent Calculation Success!
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      Formular Equation Review Advice:
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs md:text-sm leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Answer Control triggers */}
            <div className="pt-4 border-t border-slate-200">
              {!isAnswered ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption && !calculationInput}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-xs border-b-4 transition-all duration-150 flex items-center justify-center gap-2 ${
                    !selectedOption && !calculationInput
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-brand-secondary text-white border-teal-900 hover:bg-brand-secondary/95 active:border-b-0 active:translate-y-1"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Check Transaction Balance
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="w-full bg-slate-900 text-white hover:bg-slate-950 py-4 rounded-xl font-bold uppercase tracking-wider text-xs border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all"
                >
                  Continue to Next Problem
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === "mastered" && (
        <div className="bg-surface text-on-surface antialiased overflow-x-hidden p-6 md:p-8 w-full max-w-md mx-auto flex flex-col items-center justify-center animate-pop">
          {/* Replicating screenshot 9 exactly */}
          <div className="w-full bg-white border border-slate-200 rounded-[24px] p-6 flex flex-col items-center text-center shadow">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-primary mb-2">
              Module Mastered!
            </h1>
            <p className="font-sans text-sm text-slate-500 mb-8">
              You've successfully completed the academic content of{" "}
              {levelData.title}.
            </p>

            {/* Large Circular Progress */}
            <div className="relative w-44 h-44 mb-8">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                {/* Track */}
                <circle
                  className="stroke-slate-100 fill-none"
                  cx="50"
                  cy="50"
                  r="45"
                  strokeWidth="8"
                ></circle>
                {/* Fill (Animated) */}
                <circle
                  className="stroke-brand-secondary fill-none"
                  cx="50"
                  cy="50"
                  r="45"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={
                    283 - 283 * (correctAnswersCount / questions.length)
                  }
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                ></circle>
              </svg>
              {/* Inner Trophy Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-22 h-22 bg-teal-100 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                  <Trophy className="w-10 h-10 text-brand-secondary" />
                </div>
              </div>
            </div>

            {/* Score statistics */}
            <div className="text-sm font-semibold text-slate-500 mb-6">
              Final Correct Ratio:{" "}
              <strong className="text-brand-secondary text-base">
                {correctAnswersCount} / {questions.length}
              </strong>
            </div>

            {/* Rewards Row */}
            <div className="w-full grid grid-cols-2 gap-4">
              {/* Streak Tactic Card */}
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center border-b-4 border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-5 h-5 text-rose-500 fill-rose-500 animate-bounce" />
                  <span className="font-display font-extrabold text-xl text-brand-primary">
                    +1
                  </span>
                </div>
                <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Day Streak
                </span>
              </div>
              {/* Gems Tactic Card */}
              <div className="bg-teal-50 rounded-xl p-4 flex flex-col items-center justify-center border-b-4 border-teal-200">
                <div className="flex items-center gap-1 mb-1">
                  <Gem className="w-5 h-5 text-[#006f66] fill-[#006f66]" />
                  <span className="font-display font-extrabold text-xl text-teal-800">
                    +{50 + correctAnswersCount * 5}
                  </span>
                </div>
                <span className="font-sans text-[10px] text-teal-700 uppercase tracking-wider font-bold">
                  Gems Earned
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Area */}
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              onClick={handleFinishLesson}
              className="w-full bg-brand-secondary text-white py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs border-b-4 border-teal-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 shadow"
            >
              Continue to Next Lesson
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-transparent text-slate-600 py-3 font-semibold text-xs uppercase hover:underline"
            >
              Review Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
