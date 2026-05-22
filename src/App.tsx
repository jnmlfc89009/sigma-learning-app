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
import { UserProfile, LearningLevel } from './types';
import { encryptPayload } from './lib/crypto';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sigma_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState<LearningLevel[]>([]);
  const [activeTab, setActiveTab] = useState<'learn' | 'insights' | 'store' | 'security'>('learn');
  const [activeTrack, setActiveTrack] = useState<'personalFinance' | 'accounting' | 'statistics' | 'appliedMath'>('personalFinance');
  
  // Developer inspector access toggling for standard users
  const [showDev, setShowDev] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('dev=true') || 
      localStorage.getItem('sigma_dev') === 'true'
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
      localStorage.setItem('sigma_dev', newVal ? 'true' : 'false');
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
        // Find academic questions
        const levelRes = await fetch('/api/questions');
        if (levelRes.ok) {
          const lData = await levelRes.json();
          setLevels(lData);
        }

        // Verify existing profile session
        if (token) {
          const profRes = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (profRes.ok) {
            const pData = await profRes.json();
            setUser(pData);
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
    localStorage.setItem('sigma_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab('learn');
  };

  const handleSignOut = () => {
    localStorage.removeItem('sigma_token');
    setToken(null);
    setUser(null);
    setActiveLesson(null);
    setActiveTab('learn');
  };

  const handleSelectAnalystTrack = async (track: 'personalFinance' | 'accounting' | 'statistics'): Promise<string | null> => {
    if (!token) return "No token session found.";
    try {
      const res = await fetch('/api/profile/select-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ track })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        return null;
      } else {
        const err = await res.json();
        return err.error || "Failed to select track.";
      }
    } catch (err) {
      console.error("Select track error:", err);
      return "Network connection issue.";
    }
  };

  const handleUnlockLevelWithGems = async (track: string, levelNumber: number): Promise<string | null> => {
    if (!token) return "No token session found.";
    try {
      const res = await fetch('/api/profile/unlock-level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ track, levelNumber })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        return null;
      } else {
        const err = await res.json();
        return err.error || "Failed to transaction gems.";
      }
    } catch (err) {
      console.error("Unlock level error:", err);
      return "Network connection issue.";
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
    if (!token || !user || !activeLesson) return;

    try {
      // 1. Prepare raw payload JSON representing completed parameters
      const plainPayload = JSON.stringify({
        track: activeLesson.track,
        levelNumber: activeLesson.levelNumber,
        progressPercent: scorePercent,
        starsEarned,
        gemsAwarded,
        streakIncrement
      });

      // 2. Encrypt using simulated AES and register transport blocks
      const iv = Array.from({ length: 12 }, () => Math.floor(Math.random() * 256))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
        
      const secretKey = 'SIGMA_LEARNING_SUPER_SECRET_KEY_FOR_JWT_AND_AES';
      const encrypted = encryptPayload(plainPayload, secretKey);

      // 3. Make POST
      const res = await fetch('/api/profile/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          encryptedPayload: encrypted.cyphertext,
          iv: encrypted.iv
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }

      setActiveLesson(null);
    } catch (err) {
      console.error("Progress save transfer failed:", err);
    }
  };

  const handlePurchaseUpgrade = async (
    tier: 'scholar' | 'analyst' | 'magnate', 
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!token) return;
    const res = await fetch('/api/profile/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tier, billingCycle })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Subscription purchase failed.");
    }

    const updatedUser = await res.json();
    setUser(updatedUser);
  };

  const handleSpendGems = async (
    itemId: string, 
    price: number, 
    itemType: string, 
    itemValue?: string
  ) => {
    if (!token) return;
    const res = await fetch('/api/profile/buy-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ itemId, price, itemType, itemValue })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Gems transaction failed.");
    }

    const updatedUser = await res.json();
    setUser(updatedUser);
  };

  const handlePurchaseGems = async (packId: string, gemAmount: number, price: number) => {
    if (!token) return;
    const res = await fetch('/api/profile/purchase-gems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ packId, gemAmount, price })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Gems purchase failed.");
    }

    const updatedUser = await res.json();
    setUser(updatedUser);
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
    return <AuthScreen onSuccess={handleAuthSuccess} />;
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

        {activeTab === 'security' && (
          <SecurityConsole />
        )}
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
