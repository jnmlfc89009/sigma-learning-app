/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Play, Sparkles, BookOpen, Volume2, Trophy, Flame, Gem } from 'lucide-react';
import { Question, LearningLevel } from '../types';

interface LessonPlayerProps {
  track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath';
  levelNumber: number;
  chapterIndex: number;
  levelData: LearningLevel;
  onFinished: (scorePercent: number, starsEarned: number, gemsAwarded: number, streakIncrement: number) => void;
  onCancel: () => void;
}

// Synthesis of chimes using standard browser Web Audio API
function playChime(correct: boolean) {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (correct) {
      // Elegant major chord (Success Chime)
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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

export default function LessonPlayer({ track, levelNumber, chapterIndex, levelData, onFinished, onCancel }: LessonPlayerProps) {
  const chapter = levelData.chapters[chapterIndex];
  
  // Player state machine
  const [mode, setMode] = useState<'reading' | 'quiz' | 'mastered'>('reading');
  const [readingStep, setReadingStep] = useState(0);
  
  // Quiz tracking
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [calculationInput, setCalculationInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Scoring
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Read steps length
  const totalReadingSteps = chapter.readingContent.length;
  const questions = chapter.quizQuestions;
  const currentQuestion: Question = questions[currentQuestionIdx];

  // Progression functions
  const handleNextReading = () => {
    if (readingStep < totalReadingSteps - 1) {
      setReadingStep(readingStep + 1);
    } else {
      // Move to quiz
      setMode('quiz');
      setCurrentQuestionIdx(0);
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
    
    if (currentQuestion.type === 'calculation') {
      // Flexible matching for calculation inputs
      const cleanedInput = calculationInput.trim().toLowerCase().replace(/[$,\s]/g, '');
      const cleanedCorrect = currentQuestion.correctAnswer.toLowerCase().replace(/[$,\s]/g, '');
      
      // Also match if input is selecting multiple choice option
      if (selectedOption) {
        const cleanedOption = selectedOption.toLowerCase().replace(/[$,\s]/g, '');
        isAnsCorrect = (cleanedOption === cleanedCorrect || selectedOption === currentQuestion.correctAnswer);
      } else {
        isAnsCorrect = (cleanedInput === cleanedCorrect || calculationInput.trim() === currentQuestion.correctAnswer);
      }
    } else {
      isAnsCorrect = (selectedOption === currentQuestion.correctAnswer);
    }

    setIsCorrect(isAnsCorrect);
    setIsAnswered(true);
    playChime(isAnsCorrect);

    if (isAnsCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setCalculationInput('');
    setIsAnswered(false);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Completed last question!
      setMode('mastered');
    }
  };

  const handleFinishLesson = () => {
    const finalPercent = Math.round((correctAnswersCount / questions.length) * 100);
    let stars = 1;
    if (finalPercent >= 85) stars = 3;
    else if (finalPercent >= 50) stars = 2;

    const gemsEarned = 50 + (stars * 10);
    onFinished(finalPercent, stars, gemsEarned, 1);
  };

  // Compute progress bar width
  const progressRatio = mode === 'reading' 
    ? ((readingStep + 1) / totalReadingSteps) * 40
    : 40 + ((currentQuestionIdx + 1) / questions.length) * 60;

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
          onClick={() => playChime(true)}
          className="p-2 bg-teal-50 border border-teal-200 text-brand-secondary rounded-xl hover:bg-teal-100 transition"
          title="Verifying audio"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {mode === 'reading' && (
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

      {mode === 'quiz' && currentQuestion && (
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
            {currentQuestion.type === 'calculation' && (
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
                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(option)}
                      className={`text-left p-4 rounded-xl border-b-4 transition-all duration-100 flex items-start gap-3 ${
                        isAnswered
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
                      <span className="font-medium text-sm md:text-base leading-tight mt-0.5">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
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
                <p className="mt-2 text-xs md:text-sm leading-relaxed">{currentQuestion.explanation}</p>
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

      {mode === 'mastered' && (
        <div className="bg-surface text-on-surface antialiased overflow-x-hidden p-6 md:p-8 w-full max-w-md mx-auto flex flex-col items-center justify-center animate-pop">
          {/* Replicating screenshot 9 exactly */}
          <div className="w-full bg-white border border-slate-200 rounded-[24px] p-6 flex flex-col items-center text-center shadow">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-primary mb-2">Module Mastered!</h1>
            <p className="font-sans text-sm text-slate-500 mb-8">
              You've successfully completed the academic content of {levelData.title}.
            </p>

            {/* Large Circular Progress */}
            <div className="relative w-44 h-44 mb-8">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Track */}
                <circle className="stroke-slate-100 fill-none" cx="50" cy="50" r="45" strokeWidth="8"></circle>
                {/* Fill (Animated) */}
                <circle
                  className="stroke-brand-secondary fill-none"
                  cx="50"
                  cy="50"
                  r="45"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * (correctAnswersCount / questions.length))}
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
              Final Correct Ratio: <strong className="text-brand-secondary text-base">{correctAnswersCount} / {questions.length}</strong>
            </div>

            {/* Rewards Row */}
            <div className="w-full grid grid-cols-2 gap-4">
              {/* Streak Tactic Card */}
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center border-b-4 border-slate-200">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-5 h-5 text-rose-500 fill-rose-500 animate-bounce" />
                  <span className="font-display font-extrabold text-xl text-brand-primary">+1</span>
                </div>
                <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider font-bold">Day Streak</span>
              </div>
              {/* Gems Tactic Card */}
              <div className="bg-teal-50 rounded-xl p-4 flex flex-col items-center justify-center border-b-4 border-teal-200">
                <div className="flex items-center gap-1 mb-1">
                  <Gem className="w-5 h-5 text-[#006f66] fill-[#006f66]" />
                  <span className="font-display font-extrabold text-xl text-teal-800">+{50 + (correctAnswersCount * 5)}</span>
                </div>
                <span className="font-sans text-[10px] text-teal-700 uppercase tracking-wider font-bold">Gems Earned</span>
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
