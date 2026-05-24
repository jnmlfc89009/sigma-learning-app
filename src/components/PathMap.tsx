/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, CheckCircle2, Lock, Star, ChevronRight, Award, Flame, Gem, Compass, BarChart2, Briefcase, Zap, ShieldAlert, Sparkles, Calculator, TrendingUp } from 'lucide-react';
import { UserProfile, LearningLevel } from '../types';
import SponsorAdBanner from './SponsorAdBanner';

interface PathMapProps {
  user: UserProfile;
  levels: LearningLevel[];
  onStartLesson: (track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath' | 'calculus' | 'microeconomics', levelNumber: number, chapterIndex: number) => void;
  onSetTrack: (track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath' | 'calculus' | 'microeconomics') => void;
  onSelectTrackChoice: (track: 'personalFinance' | 'accounting' | 'statistics' | 'calculus' | 'microeconomics') => Promise<string | null>;
  onUnlockLevel: (track: string, levelNumber: number) => Promise<string | null>;
  onNavigateToStore: () => void;
}

export default function PathMap({
  user,
  levels,
  onStartLesson,
  onSetTrack,
  onSelectTrackChoice,
  onUnlockLevel,
  onNavigateToStore
}: PathMapProps) {
  const [activeTrack, setActiveTrack] = useState<'personalFinance' | 'accounting' | 'statistics' | 'appliedMath' | 'calculus' | 'microeconomics'>('accounting');
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter levels for the currently active track
  const trackLevels = levels
    .filter(l => l.track === activeTrack)
    .sort((a, b) => a.levelNumber - b.levelNumber);

  // Compute active level details
  const userTrackProgress = user.progress[activeTrack] || { level: 1, progressPercent: 0, completedLevels: {} };
  const currentActiveLevel = userTrackProgress.level; // 1 to 12

  const trackLabels = {
    // Left Side: Core trial-capable tracks (Level 1-3 Free)
    accounting: {
      name: "Financial Accounting",
      tag: "DOUBLE-ENTRY DOMAIN",
      colorClass: "bg-teal-500",
      accentBorder: "border-teal-600",
      textColor: "text-teal-700",
      badgeColor: "bg-teal-100",
      icon: Compass
    },
    calculus: {
      name: "Calculus",
      tag: "MIT 18.01/18.02 CURRICULUM",
      colorClass: "bg-fuchsia-500",
      accentBorder: "border-fuchsia-600",
      textColor: "text-fuchsia-700",
      badgeColor: "bg-fuchsia-100",
      icon: Calculator
    },
    appliedMath: {
      name: "Daily Applied Math",
      tag: "MAGNATE COGNITIVE VAULT",
      colorClass: "bg-indigo-500",
      accentBorder: "border-indigo-600",
      textColor: "text-indigo-700",
      badgeColor: "bg-indigo-100",
      icon: Award
    },
    // Right Side: Exclusively Elite Magnate Tier tracks
    personalFinance: {
      name: "Personal Finance",
      tag: "SCHOLAR-ATHLETE TRACK",
      colorClass: "bg-emerald-500",
      accentBorder: "border-emerald-600",
      textColor: "text-emerald-700",
      badgeColor: "bg-emerald-100",
      icon: Briefcase
    },
    statistics: {
      name: "Statistics",
      tag: "THE PATH TO PRECISION",
      colorClass: "bg-sky-500",
      accentBorder: "border-sky-600",
      textColor: "text-sky-700",
      badgeColor: "bg-sky-100",
      icon: BarChart2
    },
    microeconomics: {
      name: "Microeconomics",
      tag: "MIT 14.01 CURRICULUM",
      colorClass: "bg-violet-500",
      accentBorder: "border-violet-600",
      textColor: "text-violet-700",
      badgeColor: "bg-violet-100",
      icon: TrendingUp
    }
  };

  const handleTrackChange = (track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath' | 'calculus' | 'microeconomics') => {
    setActiveTrack(track);
    onSetTrack(track);
    setExpandedChapter(null);
    setActionError(null);
  };

  // Determine if a level is locked based on strict tiered requirements
  const getLevelLockStatus = (track: string, levelNum: number) => {
    // Magnate tier has instant, unrestricted access to absolutely all levels and tracks
    if (user.tier === 'magnate') {
      return { locked: false, reason: "" };
    }

    // Statistics, Personal Finance, and Microeconomics are now exclusively Magnate levels/tracks
    if (track === 'statistics' || track === 'personalFinance' || track === 'microeconomics') {
      const trackName = trackLabels[track as keyof typeof trackLabels]?.name || track;
      return {
        locked: true,
        reason: "magnate_only",
        message: `${trackName} coursework is reserved exclusively for academic Magnate tier subscribers. Please upgrade to unlock immediate, unlimited access.`
      };
    }

    // Free Scholar can learn other courses, but strictly capped at Level 3
    if (user.tier === 'scholar') {
      if (levelNum > 3) {
        return {
          locked: true,
          reason: "scholar_level_limit",
          message: "Free Scholar accounts are capped at Level 3. Upgrade to Analyst (earn and study complete tracks) or Magnate for limitless learning!"
        };
      }
    }

    // Analyst checks
    if (user.tier === 'analyst') {
      // 1. If this is their chosen fully unlocked course
      if (user.unlockedTrack === track) {
        return { locked: false, reason: "" };
      }

      // 2. Levels 1 to 3 are always free for any course
      if (levelNum <= 3) {
        return { locked: false, reason: "" };
      }

      // 3. Check if user unlocked this specific supporting level with gems
      const unlockedList = user.unlockedLevels?.[track] || [];
      if (unlockedList.includes(levelNum)) {
        return { locked: false, reason: "" };
      }

      // 4. If they have NOT chosen their fully unlocked complete course yet, offer it!
      if (!user.unlockedTrack) {
        return {
          locked: true,
          reason: "analyst_no_track_selected",
          message: "As an Analyst, select one full track to study level 1-12 absolutely free! Other tracks require 100 💎 per level beyond level 3."
        };
      }

      // 5. Otherwise, locked but can use 100 gems
      return {
        locked: true,
        reason: "analyst_needs_gem_unlock",
        message: `This supporting track level is locked. As an Analyst, unlock Level ${levelNum} forever for 100 💎, or upgrade to Magnate for automatic access.`
      };
    }

    return { locked: false, reason: "" };
  };

  const handleChooseTrack = async (track: 'personalFinance' | 'accounting' | 'statistics' | 'calculus' | 'microeconomics') => {
    setLoadingAction(true);
    setActionError(null);
    const err = await onSelectTrackChoice(track);
    setLoadingAction(false);
    if (err) {
      setActionError(err);
    }
  };

  const handleSpendGems = async (track: string, levelNum: number) => {
    setLoadingAction(true);
    setActionError(null);
    const err = await onUnlockLevel(track, levelNum);
    setLoadingAction(false);
    if (err) {
      setActionError(err);
    } else {
      setExpandedChapter(levelNum); // Re-trigger expansion showing unlocked state
    }
  };

  // Percent completion calculation
  const totalLevels = 12;
  const completedCount = Object.keys(userTrackProgress.completedLevels || {}).length;
  const computedPercent = Math.min(Math.round((completedCount / totalLevels) * 100), 100);

  // Active level label
  const activeLevelDetails = trackLevels.find(l => l.levelNumber === currentActiveLevel) || trackLevels[0];

  return (
    <div id="path-map-container" className="space-y-8 animate-pop">
      {/* 1. Track switcher and general summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Object.entries(trackLabels).map(([key, info]) => {
          const tKey = key as 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath' | 'calculus' | 'microeconomics';
          const isActive = activeTrack === tKey;
          const trackProg = user.progress[tKey] || { level: 1, progressPercent: 0, completedLevels: {} };
          const trackCompleted = Object.keys(trackProg.completedLevels || {}).length;
          const percentage = Math.min(Math.round((trackCompleted / 12) * 100), 100);
          const Icon = info.icon;

          // Check if track is Magnate-exclusive
          const isMagnateTrackLock = (tKey === 'personalFinance' || tKey === 'statistics' || tKey === 'microeconomics') && user.tier !== 'magnate';
          const isAnalystChoice = user.unlockedTrack === tKey;

          return (
            <button
              key={key}
              onClick={() => handleTrackChange(tKey)}
              className={`text-left p-5 rounded-2xl transition-all duration-150 flex flex-col justify-between relative h-full ${
                isActive
                  ? "bg-white border-b-4 border-slate-900 shadow-md ring-2 ring-indigo-500"
                  : "bg-white border border-slate-200 border-b-4 hover:border-b-2 hover:translate-y-[2px]"
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2.5 rounded-xl shrink-0 ${info.badgeColor} ${info.textColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="truncate flex-grow">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{info.tag}</span>
                    {isMagnateTrackLock && (
                      <span className="text-[8px] bg-indigo-500 text-white font-mono px-1 py-0.2 rounded font-extrabold uppercase">
                        MAGNATE
                      </span>
                    )}
                    {isAnalystChoice && (
                      <span className="text-[8px] bg-emerald-500 text-white font-mono px-1 py-0.2 rounded font-extrabold uppercase">
                        CHOSEN 🔓
                      </span>
                    )}
                  </div>
                  <span className="font-display font-bold text-sm text-slate-900 block mt-0.5 whitespace-normal leading-tight">
                    {info.name}
                  </span>
                </div>
              </div>

              <div className="mt-5 w-full space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Level {trackProg.level}/12</span>
                  <span>{percentage}% Done</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${info.colorClass} h-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {user.tier === 'scholar' && (
        <SponsorAdBanner 
          onNavigateToStore={onNavigateToStore} 
          placement="path-map" 
        />
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-xs font-sans flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Current Focus Banner */}
      {activeLevelDetails && (
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg border-b-4 border-slate-950">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-400 via-slate-900 to-slate-900"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <span className="bg-white/10 text-indigo-300 font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full font-bold border border-white/10">
                ACTIVE FOCUS: LEVEL {currentActiveLevel}
              </span>
              <h2 className="font-display font-extrabold text-2xl tracking-tight text-white mt-1">
                {activeLevelDetails.title}
              </h2>
              <p className="text-slate-350 font-sans text-sm max-w-xl leading-relaxed">
                {activeLevelDetails.description}
              </p>
            </div>
            
            <div className="md:col-span-4 flex justify-end w-full">
              {getLevelLockStatus(activeTrack, currentActiveLevel).locked ? (
                <button
                  onClick={() => setExpandedChapter(currentActiveLevel)}
                  className="w-full md:w-auto px-6 py-4 rounded-xl font-bold bg-indigo-600 text-white uppercase tracking-wider text-xs border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Unlock active level
                </button>
              ) : (
                <button
                  onClick={() => {
                    setExpandedChapter(currentActiveLevel);
                    // Smoothly scroll down to expanded node
                    setTimeout(() => {
                      document.getElementById(`node-card-${currentActiveLevel}`)?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full md:w-auto px-6 py-4 rounded-xl font-bold bg-brand-secondary text-white uppercase tracking-wider text-xs border-b-4 border-teal-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Resume Curriculum
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Duolingo Path Roadmap */}
      <div className="max-w-2xl mx-auto flex flex-col items-center py-6">
        <div className="w-1 bg-slate-200 relative rounded">
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-b from-teal-500 to-slate-200 w-full" style={{ height: `${computedPercent}%` }}></div>
        </div>

        <div className="w-full space-y-6 -mt-1 relative">
          {trackLevels.map((lvl) => {
            const completedInfo = userTrackProgress.completedLevels?.[lvl.levelNumber];
            const isCompleted = completedInfo !== undefined;
            const isCurrent = lvl.levelNumber === currentActiveLevel;
            
            const lockStatus = getLevelLockStatus(lvl.track, lvl.levelNumber);
            const isLocked = lockStatus.locked;
            
            const starCount = completedInfo?.stars || 0;
            const isExpanded = expandedChapter === lvl.levelNumber;

            // Draw zig-zag offsets for Duolingo effect
            const offsetStyle = 
              lvl.levelNumber % 3 === 1 ? "md:translate-x-12" :
              lvl.levelNumber % 3 === 2 ? "md:-translate-x-12" : "";

            return (
              <div
                key={lvl.levelNumber}
                id={`node-card-${lvl.levelNumber}`}
                className={`transition-all duration-350 flex flex-col items-center ${offsetStyle}`}
              >
                {/* Path Node Container */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    onClick={() => {
                      setExpandedChapter(isExpanded ? null : lvl.levelNumber);
                      setActionError(null);
                    }}
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-b-4 transition-all duration-150 shadow relative ${
                      isCompleted
                        ? "bg-brand-secondary border-teal-800 text-white hover:bg-brand-secondary/95"
                        : isCurrent
                        ? "bg-slate-900 border-slate-950 text-white hover:bg-slate-950 scale-110 ring-4 ring-teal-200"
                        : isLocked
                        ? "bg-slate-100 border-slate-300 text-slate-300 ring-2 ring-dashed ring-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-100" />
                    ) : isLocked ? (
                      <Lock className="w-6 h-6 text-slate-400" />
                    ) : (
                      <span className="font-display font-extrabold text-2xl">{lvl.levelNumber}</span>
                    )}

                    {/* Star overlays */}
                    {!isLocked && (
                      <div className="absolute -bottom-3 flex justify-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded-full text-[9px] text-yellow-400 border border-slate-800">
                        <Star className={`w-3 h-3 ${starCount >= 1 ? "fill-current" : ""}`} />
                        <Star className={`w-3 h-3 ${starCount >= 2 ? "fill-current" : ""}`} />
                        <Star className={`w-3 h-3 ${starCount >= 3 ? "fill-current" : ""}`} />
                      </div>
                    )}
                  </button>

                  <div className="text-center mt-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">LEVEL {lvl.levelNumber}</span>
                    <span className="font-display font-bold text-sm text-slate-800 block mt-0.5 max-w-[180px] mx-auto truncate">
                      {lvl.title}
                    </span>
                  </div>
                </div>

                {/* Expanded level drop-down options drawer (matches screenshot 6) */}
                {isExpanded && (
                  <div className="w-full max-w-md bg-white border border-slate-200 border-b-4 rounded-2xl p-5 mt-4 space-y-4 animate-pop shadow-lg text-left relative overflow-hidden">
                    {/* IF LOCKED -> RENDER BEAUTIFUL SUBSCRIPTION GATING */}
                    {isLocked ? (
                      <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-display font-extrabold text-sm text-indigo-950 block">Premium Feature Locked</span>
                            <p className="text-xs text-indigo-800/80 leading-relaxed mt-1">
                              {lockStatus.message}
                            </p>
                          </div>
                        </div>

                        {lockStatus.reason === 'magnate_only' && (
                          <div className="space-y-2">
                            <button
                              onClick={onNavigateToStore}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow border-b-4 border-indigo-900 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Award className="w-4 h-4 text-yellow-300" />
                              Join Magnate Elite Core
                            </button>
                            <span className="text-[10px] text-center block text-slate-400 font-mono">Requires Academic Magnate Plan</span>
                          </div>
                        )}

                        {lockStatus.reason === 'scholar_level_limit' && (
                          <div className="space-y-2">
                            <button
                              onClick={onNavigateToStore}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow border-b-4 border-teal-950 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                            >
                              <Zap className="w-4 h-4 text-emerald-300 fill-current" />
                              Upgrade Subscription Plan
                            </button>
                            <span className="text-[10px] text-center block text-slate-400 font-mono">Unlock advanced Double-entry sheets and Statistics</span>
                          </div>
                        )}

                        {lockStatus.reason === 'analyst_no_track_selected' && (
                          <div className="space-y-3">
                            <div className="p-3 bg-teal-50 text-teal-900 rounded-lg text-xs leading-relaxed border border-teal-100 font-sans">
                              Unlock this track as your Analyst free complete track. Once set, you can learn all levels 1-12 without spend-walls.
                            </div>
                            <button
                              disabled={loadingAction}
                              onClick={() => handleChooseTrack(lvl.track as any)}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider border-b-4 border-teal-900 flex items-center justify-center gap-2"
                            >
                              {loadingAction ? "Unlocking course..." : `🔓 Pick & Unlock ${trackLabels[lvl.track].name}`}
                            </button>
                          </div>
                        )}

                        {lockStatus.reason === 'analyst_needs_gem_unlock' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2">
                                <Gem className="w-5 h-5 text-indigo-500 fill-indigo-200" />
                                <div>
                                  <span className="text-xs font-mono font-bold text-slate-500 block">YOUR BALANCE</span>
                                  <span className="text-sm font-bold text-slate-900 block">{user.gems} Gems 💎</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block font-mono">COST TO STUDY</span>
                                <span className="text-sm font-bold text-indigo-700 font-mono">100 Gems 💎</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                disabled={loadingAction || user.gems < 100}
                                onClick={() => handleSpendGems(lvl.track, lvl.levelNumber)}
                                className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border-b-4 text-center block ${
                                  user.gems >= 100
                                    ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-900 text-white cursor-pointer"
                                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                }`}
                              >
                                {loadingAction ? "Processing..." : "Spend 100 💎 to Unlock"}
                              </button>
                              
                              <button
                                onClick={onNavigateToStore}
                                className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-150 text-slate-600 text-xs font-bold font-mono tracking-wide"
                                title="Upgrade for unlimited access"
                              >
                                UPGRADE
                              </button>
                            </div>
                            {user.gems < 100 && (
                              <span className="text-[10px] text-red-600 block text-center font-semibold leading-normal">
                                ⚠️ Insufficient gems. Earn more by playing practice sessions on your unlocked track!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // RENDER EXPANDED CHAPTER PREPARATION
                      <>
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <span className="font-display font-extrabold text-base text-slate-950">{lvl.title}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase">
                            {isCompleted ? "Completed" : "Active focus"}
                          </span>
                        </div>

                        <div className="space-y-2.5 font-sans">
                          {lvl.chapters && lvl.chapters.map((ch, idx) => (
                            <div key={ch.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                              <div>
                                <span className="text-[10px] font-bold text-brand-secondary block uppercase tracking-wider">
                                  MIT OCW Syllabus Chapter ({ch.quizQuestions?.length || 2} Interactive Problems)
                                </span>
                                <span className="font-display font-bold text-sm text-slate-900 block mt-0.5">{ch.title}</span>
                                <p className="text-slate-500 text-xs mt-1 leading-normal">{ch.description}</p>
                              </div>
                              
                              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span>Academic MIT syllabus notes loaded</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span>Interactive Sandbox Integration Formula</span>
                                </div>
                              </div>

                              <button
                                onClick={() => onStartLesson(activeTrack, lvl.levelNumber, idx)}
                                className="w-full mt-2 bg-brand-secondary text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border-b-4 border-teal-900 active:border-b-0 active:translate-y-0.5 transition-all text-center block cursor-pointer"
                              >
                                {isCompleted ? "Practice Session" : "Start Session"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
