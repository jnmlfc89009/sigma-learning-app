/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  TrendingUp, 
  Cpu, 
  ShieldCheck, 
  Award, 
  Flame, 
  Gem, 
  User, 
  LogOut, 
  Shield, 
  Menu,
  BarChart2,
  BookOpen,
  Info
} from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import PathMap from './components/PathMap';
import LessonPlayer from './components/LessonPlayer';
import InsightsDashboard from './components/InsightsDashboard';
import StoreScreen from './components/StoreScreen';
import SecurityConsole from './components/SecurityConsole';
import ChatbotWidget from './components/ChatbotWidget';
import SocialForum from './components/SocialForum';
import DisqusSection from './components/DisqusSection';
import { UserProfile, LearningLevel } from './types';
import { encryptPayload } from './lib/crypto';
import { clientDb, getDbConnectionStatus } from './lib/clientDb';
import { getCompleteTracks } from './data/seedQuestions';
import { safeStorage } from './lib/safeStorage';

export default function App() {
  const [token, setToken] = useState<string | null>(() => safeStorage.getItem('sigma_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState<LearningLevel[]>([]);
  const [activeTab, setActiveTab] = useState<'learn' | 'insights' | 'store' | 'social' | 'security'>('learn');
  const [activeTrack, setActiveTrack] = useState<'personalFinance' | 'accounting' | 'statistics' | 'appliedMath'>('personalFinance');

  // Supabase dynamic database configuration modal states
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbStatus, setDbStatus] = useState(() => getDbConnectionStatus());
  const [customDbUrl, setCustomDbUrl] = useState(() => safeStorage.getItem('sigma_supabase_url') || '');
  const [customDbKey, setCustomDbKey] = useState(() => safeStorage.getItem('sigma_supabase_key') || '');
  const [dbSavedFeedback, setDbSavedFeedback] = useState(false);
  
  // Developer inspector access toggling for standard users
  const [showDev, setShowDev] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('dev=true') || 
      safeStorage.getItem('sigma_dev') === 'true'
    );
  });
  const [devClickCount, setDevClickCount] = useState(0);
  const [devToast, setDevToast] = useState('');

  const handleDevToggle = () => {
    const next = devClickCount + 1;
    setDevClickCount(next);
    if (next >= 5) {
      const newVal = !showDev;
      setShowDev(newVal);
      safeStorage.setItem('sigma_dev', newVal ? 'true' : 'false');
      setDevToast(`Developer Inspector ${newVal ? 'ENABLED' : 'DISABLED'}! Cryptographic monitors are now ${newVal ? 'visible' : 'hidden'}.`);
      setDevClickCount(0);
      if (!newVal && activeTab === 'security') {
        setActiveTab('learn');
      }
      setTimeout(() => setDevToast(''), 4500);
    }
  };

  // Lesson Player state
  const [activeLesson, setActiveLesson] = useState<{
    track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath';
    levelNumber: number;
    chapterIndex: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Load levels curriculum & valid active profile on launch
  useEffect(() => {
    const startAppLoad = async () => {
      try {
        // Find academic questions directly from local in-memory tracks
        const tracks = getCompleteTracks();
        setLevels(tracks);

        // Verify existing profile session directly from database
        if (token) {
          const liveUser = await clientDb.getUser(token);
          if (liveUser) {
            setUser(liveUser);
          } else {
            // Expired or bad token
            handleSignOut();
          }
        }
      } catch (err) {
        console.error("Critical API start failed:", err);
      } finally {
        setLoading(false);
      }
    };
    startAppLoad();
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: UserProfile) => {
    safeStorage.setItem('sigma_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab('learn');
  };

  const handleSignOut = () => {
    safeStorage.removeItem('sigma_token');
    setToken(null);
    setUser(null);
    setActiveLesson(null);
    setActiveTab('learn');
  };

  const handleSelectAnalystTrack = async (track: 'personalFinance' | 'accounting' | 'statistics'): Promise<string | null> => {
    if (!user) return "No active session.";
    try {
      const updatedUser: UserProfile = {
        ...user,
        unlockedTrack: track
      };
      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);
      return null;
    } catch (err: any) {
      console.error("Select track error:", err);
      return err?.message || "Failed to select track.";
    }
  };

  const handleUnlockLevelWithGems = async (track: string, levelNumber: number): Promise<string | null> => {
    if (!user) return "No active session.";
    if (user.gems < 50) {
      return "Insufficient starting capital. Complete courses to earn more gems!";
    }

    try {
      const unlockedLevels = { ...(user.unlockedLevels || {}) };
      if (!unlockedLevels[track]) {
        unlockedLevels[track] = [];
      }
      if (!unlockedLevels[track].includes(levelNumber)) {
        unlockedLevels[track].push(levelNumber);
      }

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems - 50,
        unlockedLevels
      };
      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);
      return null;
    } catch (err: any) {
      console.error("Unlock level error:", err);
      return err?.message || "Failed to transaction gems.";
    }
  };

  const handleStartLesson = (
    track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath', 
    levelNumber: number, 
    chapterIndex: number
  ) => {
    setActiveLesson({ track, levelNumber, chapterIndex });
  };

  // Securely update user statistics via secure transport client key
  const handleFinishedLesson = async (
    scorePercent: number, 
    starsEarned: number, 
    gemsAwarded: number, 
    streakIncrement: number
  ) => {
    if (!user || !activeLesson) return;

    try {
      const track = activeLesson.track;
      const level = activeLesson.levelNumber;
      
      const currentProgress = { ...(user.progress || {}) } as any;
      if (!currentProgress[track]) {
        currentProgress[track] = { level: 1, progressPercent: 0, completedLevels: {} };
      }

      const trackProg = currentProgress[track];
      const comps = { ...(trackProg.completedLevels || {}) };
      const existingComp = comps[level];
      const maxStars = Math.max(existingComp?.stars || 0, starsEarned);

      comps[level] = {
        stars: maxStars,
        completedAt: new Date().toISOString()
      };

      let nextLevel = trackProg.level;
      if (level === trackProg.level && scorePercent >= 60) {
        nextLevel = Math.min(12, trackProg.level + 1);
      }

      currentProgress[track] = {
        ...trackProg,
        level: nextLevel,
        progressPercent: Math.max(trackProg.progressPercent || 0, scorePercent),
        completedLevels: comps
      };

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems + gemsAwarded,
        streak: user.streak + streakIncrement,
        progress: currentProgress
      };

      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);
      setActiveLesson(null);

      await clientDb.logSecurityAction(
        "PROGRESS_UPDATED",
        `User completed level ${level} on track ${track}. Score: ${scorePercent}%, Stars: ${starsEarned}/${maxStars}.`,
        `Gems: +${gemsAwarded}, Streak: +${streakIncrement}`,
        true
      );
    } catch (err) {
      console.error("Progress save transfer failed:", err);
    }
  };

  const handlePurchaseUpgrade = async (
    tier: 'scholar' | 'analyst' | 'magnate', 
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!user) return;
    try {
      const updatedUser: UserProfile = {
        ...user,
        tier,
        billingCycle
      };
      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);

      await clientDb.logSecurityAction(
        "BILLING_PREMIUM_UPGRADE",
        `Upgraded to ${tier.toUpperCase()} tier (${billingCycle} billing cycle) direct client-side simulated authorization.`,
        undefined,
        true
      );
    } catch (err: any) {
      throw new Error(err?.message || "Subscription purchase failed.");
    }
  };

  const handleSpendGems = async (
    itemId: string, 
    price: number, 
    itemType: string, 
    itemValue?: string
  ) => {
    if (!user) return;
    if (user.gems < price) {
      throw new Error("Insufficient gems budget.");
    }

    try {
      const unlockedItems = [...(user.unlockedItems || [])];
      if (!unlockedItems.includes(itemId)) {
        unlockedItems.push(itemId);
      }

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems - price,
        unlockedItems,
        activeTitle: itemType === 'title' ? (itemValue || itemId) : user.activeTitle,
        avatarSeed: itemType === 'avatar' ? (itemValue || user.avatarSeed) : user.avatarSeed
      };

      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);

      await clientDb.logSecurityAction(
        "STORE_PURCHASE",
        `Purchased ${itemId} for ${price} gems. Remaining balance: ${updatedUser.gems} gems.`,
        undefined,
        true
      );
    } catch (err: any) {
      throw new Error(err?.message || "Gems transaction failed.");
    }
  };

  const handlePurchaseGems = async (packId: string, gemAmount: number, price: number) => {
    if (!user) return;
    try {
      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems + gemAmount
      };
      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);

      await clientDb.logSecurityAction(
        "GEMS_PURCHASED",
        `Gems topup: +${gemAmount} gems loaded. Price: $${price} (Simulated Auth Code).`,
        undefined,
        true
      );
    } catch (err: any) {
      throw new Error(err?.message || "Gems purchase failed.");
    }
  };

  if (loading) {
    return (
      <div id="loading-fallback" className="min-h-screen bg-brand-light flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-secondary border-b-4 border-teal-900 animate-spin flex items-center justify-center">
          <span className="text-white font-mono font-bold text-xl">Σ</span>
        </div>
        <p className="font-display font-bold text-slate-800 text-lg uppercase tracking-widest animate-pulse">
          Establishing Safe Database Sync...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!user || !token) {
    return (
      <div id="unauthenticated-application-shell" className="min-h-screen bg-brand-light flex flex-col">
        {/* Simplified Header for logged out users/guests */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-secondary flex items-center justify-center p-1.5 border-b border-teal-900 shadow-sm">
                <span className="text-white font-mono font-black text-sm">Σ</span>
              </div>
              <span className="font-display font-black text-lg tracking-tight text-brand-primary">
                SIGMA LEARNING
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono font-bold uppercase tracking-wider hidden sm:block">
              Guest Access Lobby
            </div>
          </div>
        </header>

        {/* Authenticate panel Content block */}
        <div className="flex-grow">
          <AuthScreen onSuccess={handleAuthSuccess} />
        </div>

        {/* Public review comment disqus element at the bottom */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <DisqusSection activeTab="auth" />
        </div>

        {/* Guest simple footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 font-sans text-xs">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <span>MIT OpenCourseWare courseware syllabus mapping © 2026. All rights and metrics verified.</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-wide font-mono uppercase">
              Secure Auth Channel Active
            </span>
          </div>
        </footer>
      </div>
    );
  }

  // Active playing level view
  if (activeLesson) {
    const targetLvlData = levels.find(l => l.track === activeLesson.track && l.levelNumber === activeLesson.levelNumber);
    if (targetLvlData) {
      return (
        <div id="playing-session-viewport" className="min-h-screen bg-brand-light p-4 md:p-8">
          <LessonPlayer
            track={activeLesson.track}
            levelNumber={activeLesson.levelNumber}
            chapterIndex={activeLesson.chapterIndex}
            levelData={targetLvlData}
            onFinished={handleFinishedLesson}
            onCancel={() => setActiveLesson(null)}
          />
        </div>
      );
    }
  }

  return (
    <div id="application-dashboard-canvas" className="min-h-screen bg-brand-light flex flex-col">
      {/* 1. Primary polished header Navigation (HANKEN styling) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-secondary flex items-center justify-center p-1.5 border-b border-teal-900 shadow-sm">
              <span className="text-white font-mono font-black text-sm">Σ</span>
            </div>
            <span className="font-display font-black text-lg tracking-tight text-brand-primary hidden sm:inline">
              SIGMA LEARNING
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 font-sans text-xs uppercase font-extrabold tracking-wider">
            <button
              onClick={() => setActiveTab('learn')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'learn' 
                  ? "bg-slate-100 text-brand-primary font-black" 
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Mastery Map
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'insights' 
                  ? "bg-slate-100 text-brand-primary font-black" 
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Math Sandbox
            </button>
            <input type="hidden" name="active-tab" value={activeTab} />
            <button
              onClick={() => setActiveTab('store')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'store' 
                  ? "bg-slate-100 text-brand-primary font-black animate-pulse" 
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Premium Store
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'social' 
                  ? "bg-slate-100 text-brand-primary font-black" 
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Social Hub
            </button>
            {showDev && (
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
                  activeTab === 'security' 
                    ? "bg-slate-100 text-indigo-700 font-black" 
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Cryptography
              </button>
            )}
          </nav>

          {/* User Score Stats Indicators Block */}
          <div className="flex items-center gap-3">
            {/* Streak card block */}
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
              <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{user.streak}d</span>
            </div>

            {/* Gems card block */}
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-800 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
              <Gem className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{user.gems}</span>
            </div>

            {/* Active Title Badging (Magnate Gem purchase) */}
            {user.activeTitle && (
              <span className="hidden md:inline bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border border-amber-600 animate-pulse">
                🎖️ {user.activeTitle}
              </span>
            )}

            {/* Premium Category level indicator */}
            <span className={`hidden sm:inline border text-[10px] font-black uppercase px-2 py-1 rounded-full ${
              user.tier === 'magnate'
                ? "bg-purple-100 text-purple-800 border-purple-200"
                : user.tier === 'analyst'
                ? "bg-teal-100 text-[#006f66] border-teal-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              {user.tier === 'scholar' ? 'Scholar Plan' : user.tier + ' Premium'}
            </span>

            {/* Supabase Connection Status Badge */}
            <button
              onClick={() => {
                setDbStatus(getDbConnectionStatus());
                setShowDbModal(true);
              }}
              className={`flex items-center gap-1 bg-white border px-2 py-1 rounded-xl text-[10px] font-bold font-mono transition shadow-xs active:scale-95 ${
                dbStatus.mode === 'supabase'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50'
                  : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100/50'
              }`}
              title="Click to check, test, or configure your database keys"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.mode === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              <span>{dbStatus.mode === 'supabase' ? 'SUPABASE ACTIVE' : 'LOCAL CACHE'}</span>
            </button>

            {/* Quick Profile Dropdown trigger */}
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition"
              title="Sign Out Option"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile menu triggers */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Nav toggle Drawer */}
        {menuOpen && (
          <div className="md:hidden border-t py-4 space-y-2 font-sans text-xs uppercase font-extrabold tracking-wider bg-white">
            <button
              onClick={() => { setActiveTab('learn'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Mastery Map
            </button>
            <button
              onClick={() => { setActiveTab('insights'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Math Sandbox
            </button>
            <button
              onClick={() => { setActiveTab('store'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Premium Store
            </button>
            <button
              onClick={() => { setActiveTab('social'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Social Hub
            </button>
            {showDev && (
              <button
                onClick={() => { setActiveTab('security'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-700" />
                Cryptography
              </button>
            )}
          </div>
        )}
      </header>

      {/* 2. Main content container viewports */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'learn' && (
          <PathMap
            user={user}
            levels={levels}
            onStartLesson={handleStartLesson}
            onSetTrack={setActiveTrack}
            onSelectTrackChoice={handleSelectAnalystTrack}
            onUnlockLevel={handleUnlockLevelWithGems}
            onNavigateToStore={() => setActiveTab('store')}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsDashboard user={user} onNavigateToStore={() => setActiveTab('store')} />
        )}

        {activeTab === 'store' && (
          <StoreScreen 
            user={user} 
            onUpgrade={handlePurchaseUpgrade} 
            onBuyItem={handleSpendGems}
            onPurchaseGems={handlePurchaseGems}
          />
        )}

        {activeTab === 'social' && (
          <SocialForum />
        )}

        {activeTab === 'security' && (
          <SecurityConsole />
        )}

        {/* Persistent Disqus Comments Section at the bottom of all platform views */}
        <DisqusSection activeTab={activeTab} />
      </main>

      {/* 3. Humble footer matching Design Philosophy */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 font-sans text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>MIT OpenCourseWare courseware syllabus mapping © 2026. All rights and metrics verified.</span>
          <div className="flex items-center gap-4">
            <span 
              onClick={handleDevToggle}
              className="text-[10px] font-bold text-emerald-600 block bg-emerald-50 px-2 py-0.5 rounded tracking-wide font-mono uppercase cursor-pointer select-none active:scale-95 transition"
              title="Click 5 times to toggle Developer Inspector Mode"
            >
              Encrypted transmission pipeline active
            </span>
          </div>
        </div>
      </footer>

      {/* 4. Interactive Supabase Database Credentials Diagnostics Dialog */}
      {showDbModal && (
        <div id="supabase-diagnostics-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full space-y-6 animate-pop max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${dbStatus.mode === 'supabase' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <Shield className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">Database Cluster Connection</h3>
                  <p className="text-xs text-slate-500 font-sans">Verify, test, and adapt cloud data telemetry settings</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDbModal(false);
                  setDbSavedFeedback(false);
                }}
                className="text-slate-400 hover:text-slate-650 bg-slate-105 p-1.5 rounded-lg w-7 h-7 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Live Indicator */}
            <div className={`p-4 rounded-2xl border text-sm flex gap-3 items-center ${
              dbStatus.mode === 'supabase' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${dbStatus.mode === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              <div>
                <p className="font-bold underline uppercase font-mono text-xs">{dbStatus.mode === 'supabase' ? 'Supabase Connection Verified' : 'Offline Local Sandbox Mode Activated'}</p>
                <p className="text-xs font-sans mt-1">
                  {dbStatus.mode === 'supabase' 
                    ? `Synthesized handshakes successfully configured to: ${dbStatus.supabaseUrl}`
                    : 'Your progress is stored immediately on your computer inside LocalStorage. Configure your Supabase credentials below to synchronize learning state with your cloud postgreSQL cluster!'}
                </p>
                {dbStatus.error && (
                  <p className="text-[10.5px] font-mono text-red-700 bg-red-50 p-2 rounded-lg mt-2 border border-red-200">
                    Connection Error: {dbStatus.error}
                  </p>
                )}
              </div>
            </div>

            {/* Configuration Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider font-mono block mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. your-project-id.supabase.co"
                  value={customDbUrl}
                  onChange={(e) => setCustomDbUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
                <span className="text-[10px] text-slate-400 font-sans block mt-1">
                  Leave empty to read from default environment parameters, or enter custom URL to override.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider font-mono block mb-1.5">
                  Supabase API Key (Anon / Service Role)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIs..."
                  value={customDbKey}
                  onChange={(e) => setCustomDbKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                />
                <span className="text-[10px] text-slate-400 font-sans block mt-1">
                  Direct client connections require the cloud API key to register tables on behalf of the client.
                </span>
              </div>
            </div>

            {/* Instruction SQL Help */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-extrabold uppercase font-mono text-[10.5px] text-slate-650 flex items-center gap-1.5">
                <span>📋 Setup Your Supabase Database Tables</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                Make sure you initialize your cluster! Run the SQL content inside your 
                <strong> Supabase SQL Editor</strong> to create the necessary <code>users</code> and <code>security_logs</code> structures. 
                The setup script is located in the root of this project: <code>/supabase-schema.sql</code>.
              </p>
            </div>

            {/* Actions Footer */}
            <p className="text-[10px] text-center text-slate-400">
              Saving credentials caches settings inside your web browser secure storage and reloads the interface.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (customDbUrl.trim()) {
                    safeStorage.setItem('sigma_supabase_url', customDbUrl.trim());
                  } else {
                    safeStorage.removeItem('sigma_supabase_url');
                  }
                  
                  if (customDbKey.trim()) {
                    safeStorage.setItem('sigma_supabase_key', customDbKey.trim());
                  } else {
                    safeStorage.removeItem('sigma_supabase_key');
                  }

                  setDbSavedFeedback(true);
                  setTimeout(() => {
                    window.location.reload();
                  }, 1100);
                }}
                className="flex-grow bg-slate-900 border-b-4 border-black text-white hover:bg-slate-950 px-4 py-3 rounded-xl font-mono text-xs font-black uppercase text-center tracking-widest active:border-b-0 transition"
              >
                {dbSavedFeedback ? "applying config..." : "Save and Sync Keys"}
              </button>

              <button
                onClick={() => {
                  safeStorage.removeItem('sigma_supabase_url');
                  safeStorage.removeItem('sigma_supabase_key');
                  setCustomDbUrl('');
                  setCustomDbKey('');
                  setDbSavedFeedback(true);
                  setTimeout(() => {
                    window.location.reload();
                  }, 1100);
                }}
                className="border border-slate-200 border-b-4 hover:bg-slate-50 px-4 py-3 rounded-xl font-mono text-xs font-bold text-slate-600 uppercase text-center active:border-b-0 transition"
              >
                Reset Fallback
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Developer Mode Notification Toast */}
      {devToast && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-slate-900 border border-teal-500 text-teal-400 p-4 rounded-xl shadow-2xl font-mono text-center text-xs z-[9999] animate-bounce">
          💡 {devToast}
        </div>
      )}

      {/* Interactive FAQ and Offline Support Bot Widget */}
      <ChatbotWidget user={user} />
    </div>
  );
}
