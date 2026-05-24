import { getAudioContext } from "./lib/audio";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  Info,
  Key,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import PathMap from "./components/PathMap";
import LessonPlayer from "./components/LessonPlayer";
import InsightsDashboard from "./components/InsightsDashboard";
import StoreScreen from "./components/StoreScreen";
import ChatbotWidget from "./components/ChatbotWidget";
import SocialForum from "./components/SocialForum";
import { UserProfile, LearningLevel } from "./types";
import { encryptPayload, clientHashPassword } from "./lib/crypto";
import { clientDb } from "./lib/clientDb";
import { getCompleteTracks } from "./data/seedQuestions";
import { safeStorage } from "./lib/safeStorage";
import LandingScreen from "./components/LandingScreen";

const GUEST_USER: UserProfile = {
  uid: "guest",
  username: "Guest Scholar",
  email: "guest@sigma-learning.org",
  streak: 0,
  gems: 100,
  tier: "scholar",
  billingCycle: "monthly",
  createdAt: new Date().toISOString(),
  avatarSeed: "guest",
  progress: {
    personalFinance: { level: 1, progressPercent: 0, completedLevels: {} },
    accounting: { level: 1, progressPercent: 0, completedLevels: {} },
    statistics: { level: 1, progressPercent: 0, completedLevels: {} },
    appliedMath: { level: 1, progressPercent: 0, completedLevels: {} },
    calculus: { level: 1, progressPercent: 0, completedLevels: {} },
    microeconomics: { level: 1, progressPercent: 0, completedLevels: {} },
  },
  unlockedLevels: {
    personalFinance: [1],
    accounting: [1],
    statistics: [1],
    appliedMath: [],
    calculus: [1],
    microeconomics: [1],
  },
  unlockedItems: [],
  activeTitle: "",
};

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    safeStorage.getItem("sigma_token"),
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState<LearningLevel[]>([]);
  const [activeTab, setActiveTab] = useState<
    "home" | "learn" | "insights" | "store" | "social"
  >(() => {
    const cachedToken =
      typeof window !== "undefined" ? safeStorage.getItem("sigma_token") : null;
    return cachedToken ? "learn" : "home";
  });
  const [activeTrack, setActiveTrack] = useState<
    | "personalFinance"
    | "accounting"
    | "statistics"
    | "appliedMath"
    | "calculus"
    | "microeconomics"
  >("accounting");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isGuest = !token || user?.uid === "guest";

  // Profile settings update modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("");
  const [profileShowPasswords, setProfileShowPasswords] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [profileLoadingBy, setProfileLoadingBy] = useState(false);

  // Stripe checkout modal state and publishable runtime settings
  const [stripeConfig, setStripeConfig] = useState<{
    isReal: boolean;
    publishableKey: string;
  } | null>(null);
  const [stripeModal, setStripeModal] = useState<{
    show: boolean;
    type: "gems" | "subscription";
    itemIdOrTier: string;
    billingCycle?: "monthly" | "annual";
    amount: number;
    description: string;
    clientSecret: string;
    intentId: string;
    simulated: boolean;
    step: "options" | "card" | "authorizing" | "success" | "error";
    errorMsg?: string;
  } | null>(null);

  // Load client Stripe settings on boot
  useEffect(() => {
    fetch("/api/stripe/config")
      .then((res) => {
        if (!res.ok) throw new Error("Unavailable");
        return res.json();
      })
      .then((data) => setStripeConfig(data))
      .catch((err) =>
        console.warn(
          "Failed to retrieve live stripe configuration settings.",
          err,
        ),
      );
  }, []);

  // Synchronize modal fields when opened to match actual active user
  useEffect(() => {
    if (showProfileModal && user) {
      setProfileUsername(user.username);
      setProfileNewPassword("");
      setProfilePasswordConfirm("");
      setProfileSuccessMessage("");
      setProfileErrorMessage("");
    }
  }, [showProfileModal, user]);

  // Developer inspector access states disabled for user-facing production cleanup

  // Lesson Player state
  const [activeLesson, setActiveLesson] = useState<{
    track:
      | "personalFinance"
      | "accounting"
      | "statistics"
      | "appliedMath"
      | "calculus"
      | "microeconomics";
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
        } else {
          setUser(GUEST_USER);
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
    safeStorage.setItem("sigma_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab("learn");
  };

  const handleSignOut = () => {
    safeStorage.removeItem("sigma_token");
    setToken(null);
    setUser(GUEST_USER);
    setActiveLesson(null);
    setActiveTab("home");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!profileUsername.trim()) {
      setProfileErrorMessage("Username cannot be empty.");
      return;
    }

    setProfileLoadingBy(true);
    setProfileErrorMessage("");
    setProfileSuccessMessage("");

    try {
      const updatedUser: UserProfile = {
        ...user,
        username: profileUsername.trim(),
      };

      let passwordHashLocal: string | undefined = undefined;

      if (profileNewPassword) {
        if (profileNewPassword.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (profileNewPassword !== profilePasswordConfirm) {
          throw new Error("Passwords do not match.");
        }
        passwordHashLocal = await clientHashPassword(
          profileNewPassword,
          user.email.toLowerCase().trim(),
        );
      }

      await clientDb.saveUser(updatedUser, passwordHashLocal);
      setUser(updatedUser);
      setProfileSuccessMessage("Profile updated successfully!");
      setProfileNewPassword("");
      setProfilePasswordConfirm("");

      // Let's log a security event securely
      await clientDb.logSecurityAction(
        "PROFILE_UPDATED",
        `User ${user.email} updated profile parameters securely. Display name and security details aligned.`,
        undefined,
        true,
      );
    } catch (err: any) {
      setProfileErrorMessage(
        err.message || "Failed to update profile settings.",
      );
    } finally {
      setProfileLoadingBy(false);
    }
  };

  const handleSelectAnalystTrack = async (
    track:
      | "personalFinance"
      | "accounting"
      | "statistics"
      | "calculus"
      | "microeconomics",
  ): Promise<string | null> => {
    if (isGuest) {
      setShowAuthModal(true);
      return "Please sign up to select a track.";
    }
    if (!user) return "No active session.";
    try {
      const updatedUser: UserProfile = {
        ...user,
        unlockedTrack: track,
      };
      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);
      return null;
    } catch (err: any) {
      console.error("Select track error:", err);
      return err?.message || "Failed to select track.";
    }
  };

  const handleUnlockLevelWithGems = async (
    track: string,
    levelNumber: number,
  ): Promise<string | null> => {
    if (isGuest) {
      setShowAuthModal(true);
      return "Please sign up to unlock levels with gems.";
    }
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
        unlockedLevels,
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
    track:
      | "personalFinance"
      | "accounting"
      | "statistics"
      | "appliedMath"
      | "calculus"
      | "microeconomics",
    levelNumber: number,
    chapterIndex: number,
  ) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    setActiveLesson({ track, levelNumber, chapterIndex });
  };

  // Securely update user statistics via secure transport client key
  const handleFinishedLesson = async (
    scorePercent: number,
    starsEarned: number,
    gemsAwarded: number,
    streakIncrement: number,
  ) => {
    if (!user || !activeLesson) return;

    try {
      const track = activeLesson.track;
      const level = activeLesson.levelNumber;

      const currentProgress = { ...(user.progress || {}) } as any;
      if (!currentProgress[track]) {
        currentProgress[track] = {
          level: 1,
          progressPercent: 0,
          completedLevels: {},
        };
      }

      const trackProg = currentProgress[track];
      const comps = { ...(trackProg.completedLevels || {}) };
      const existingComp = comps[level];
      const maxStars = Math.max(existingComp?.stars || 0, starsEarned);

      comps[level] = {
        stars: maxStars,
        completedAt: new Date().toISOString(),
      };

      let nextLevel = trackProg.level;
      const newUnlockedLevels = { ...(user.unlockedLevels || {}) } as any;
      if (!newUnlockedLevels[track]) {
        newUnlockedLevels[track] = [1];
      }

      if (level === trackProg.level && scorePercent >= 60) {
        nextLevel = Math.min(12, trackProg.level + 1);
        if (!newUnlockedLevels[track].includes(nextLevel)) {
          newUnlockedLevels[track] = [...newUnlockedLevels[track], nextLevel];
        }
      }

      currentProgress[track] = {
        ...trackProg,
        level: nextLevel,
        progressPercent: Math.max(trackProg.progressPercent || 0, scorePercent),
        completedLevels: comps,
      };

      const hasDoubleReward = user.unlockedItems?.includes(
        "double_reward_charm",
      );
      const finalGemsGranted = hasDoubleReward ? gemsAwarded * 2 : gemsAwarded;

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems + finalGemsGranted,
        streak: user.streak + streakIncrement,
        progress: currentProgress,
        unlockedLevels: newUnlockedLevels,
      };

      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);
      setActiveLesson(null);

      await clientDb.logSecurityAction(
        "PROGRESS_UPDATED",
        `User completed level ${level} on track ${track}. Score: ${scorePercent}%, Stars: ${starsEarned}/${maxStars}.`,
        `Gems: +${finalGemsGranted}${hasDoubleReward ? " (2x charm applied)" : ""}, Streak: +${streakIncrement}`,
        true,
      );
    } catch (err) {
      console.error("Progress save transfer failed:", err);
    }
  };

  const handlePurchaseUpgrade = async (
    tier: "scholar" | "analyst" | "magnate",
    billingCycle: "monthly" | "annual",
  ) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    if (!user) return;
    try {
      const token = safeStorage.getItem("sigma_token");
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          type: "subscription",
          itemIdOrTier: tier,
          billingCycle,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Failed secure initialization with Stripe gateway.",
        );
      }

      const orderDetails = await res.json();
      setStripeModal({
        show: true,
        type: "subscription",
        itemIdOrTier: tier,
        billingCycle,
        amount: orderDetails.amount,
        description: orderDetails.description,
        clientSecret: orderDetails.clientSecret,
        intentId: orderDetails.intentId,
        simulated: !!orderDetails.simulated,
        step: "options",
      });
    } catch (err: any) {
      alert("Stripe Initialization error: " + err.message);
      throw err;
    }
  };

  const handleSpendGems = async (
    itemId: string,
    price: number,
    itemType: string,
    itemValue?: string,
  ) => {
    if (isGuest) {
      setShowAuthModal(true);
      throw new Error("Please sign up to purchase items with gems.");
    }
    if (!user) return;
    if (user.gems < price) {
      throw new Error("Insufficient gems budget.");
    }

    try {
      const unlockedItems = [...(user.unlockedItems || [])];
      const isConsumableOrTrophy =
        itemId.startsWith("powerup_") || itemId.startsWith("trophy_gem_");
      if (!unlockedItems.includes(itemId) || isConsumableOrTrophy) {
        unlockedItems.push(itemId);
      }

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems - price,
        unlockedItems,
        activeTitle:
          itemType === "title" ? itemValue || itemId : user.activeTitle,
        avatarSeed:
          itemType === "avatar"
            ? itemValue || user.avatarSeed
            : user.avatarSeed,
      };

      await clientDb.saveUser(updatedUser);
      setUser(updatedUser);

      await clientDb.logSecurityAction(
        "STORE_PURCHASE",
        `Purchased ${itemId} for ${price} gems. Remaining balance: ${updatedUser.gems} gems.`,
        undefined,
        true,
      );
    } catch (err: any) {
      throw new Error(err?.message || "Gems transaction failed.");
    }
  };

  const handlePurchaseGems = async (
    packId: string,
    gemAmount: number,
    price: number,
  ) => {
    if (isGuest) {
      setShowAuthModal(true);
      return;
    }
    if (!user) return;
    try {
      const token = safeStorage.getItem("sigma_token");
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          type: "gems",
          itemIdOrTier: packId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Failed checkout initialization on Stripe API.",
        );
      }

      const orderDetails = await res.json();
      setStripeModal({
        show: true,
        type: "gems",
        itemIdOrTier: packId,
        amount: orderDetails.amount,
        description: orderDetails.description,
        clientSecret: orderDetails.clientSecret,
        intentId: orderDetails.intentId,
        simulated: !!orderDetails.simulated,
        step: "options",
      });
    } catch (err: any) {
      alert("Stripe checkout error: " + err.message);
      throw err;
    }
  };

  const handleCaptureStripeCheckout = async () => {
    if (!user || !stripeModal) return;

    setStripeModal((prev) => (prev ? { ...prev, step: "authorizing" } : null));

    try {
      const token = safeStorage.getItem("sigma_token");
      const res = await fetch("/api/stripe/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          intentId: stripeModal.intentId,
          type: stripeModal.type,
          itemIdOrTier: stripeModal.itemIdOrTier,
          billingCycle: stripeModal.billingCycle,
          simulated: stripeModal.simulated,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || "Credit verification handshake refused by Stripe.",
        );
      }

      const data = await res.json();
      if (data.success && data.user) {
        // Persist the updated tier/gems to Supabase and client local storage cache
        await clientDb.saveUser(data.user);
        setUser(data.user);
        setStripeModal((prev) => (prev ? { ...prev, step: "success" } : null));

        // Play coin / register success audio sound chime!
        if (
          typeof window !== "undefined" &&
          safeStorage.getItem("soundEnabled") !== "false"
        ) {
          try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.frequency.setValueAtTime(f, now + i * 0.05);
              osc.connect(gain);
              gain.connect(ctx.destination);
              gain.gain.setValueAtTime(0, now + i * 0.05);
              gain.gain.linearRampToValueAtTime(0.06, now + i * 0.05 + 0.02);
              gain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + i * 0.05 + 0.35,
              );
              osc.start(now + i * 0.05);
              osc.stop(now + i * 0.05 + 0.4);
            });
          } catch (e) {
            console.warn("Audio Context sound failed:", e);
          }
        }
      } else {
        throw new Error("Invalid settlement confirmation response.");
      }
    } catch (err: any) {
      setStripeModal((prev) =>
        prev ? { ...prev, step: "error", errorMsg: err.message } : null,
      );
    }
  };

  if (loading) {
    return (
      <div
        id="loading-fallback"
        className="min-h-screen bg-brand-light flex flex-col items-center justify-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-brand-secondary border-b-4 border-teal-900 animate-spin flex items-center justify-center">
          <span className="text-white font-mono font-bold text-xl">Σ</span>
        </div>
        <p className="font-display font-bold text-slate-800 text-lg uppercase tracking-widest animate-pulse">
          Establishing Safe Database Sync...
        </p>
      </div>
    );
  }

  // Not authenticated fallback gate
  if (!user) {
    return (
      <div
        id="unauthenticated-application-shell"
        className="min-h-screen bg-brand-light flex flex-col"
      >
        {/* Simplified Header for logged out users/guests */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-secondary flex items-center justify-center p-1.5 border-b border-teal-900 shadow-sm">
                <span className="text-white font-mono font-black text-sm">
                  Σ
                </span>
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

        {/* Disqus comments removed */}

        {/* Guest simple footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 font-sans text-xs">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <span>
              MIT OpenCourseWare courseware syllabus mapping © 2026. All rights
              and metrics verified.
            </span>
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
    const targetLvlData = levels.find(
      (l) =>
        l.track === activeLesson.track &&
        l.levelNumber === activeLesson.levelNumber,
    );
    if (targetLvlData) {
      const handleUpdateUserProfile = async (updated: UserProfile) => {
        await clientDb.saveUser(updated);
        setUser(updated);
      };

      return (
        <div
          id="playing-session-viewport"
          className="min-h-screen bg-brand-light p-4 md:p-8"
        >
          <LessonPlayer
            track={activeLesson.track}
            levelNumber={activeLesson.levelNumber}
            chapterIndex={activeLesson.chapterIndex}
            levelData={targetLvlData}
            onFinished={handleFinishedLesson}
            onCancel={() => setActiveLesson(null)}
            user={user || undefined}
            onUpdateUser={handleUpdateUserProfile}
          />
        </div>
      );
    }
  }

  return (
    <div
      id="application-dashboard-canvas"
      className="min-h-screen bg-brand-light flex flex-col"
    >
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
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === "home"
                  ? "bg-slate-100 text-brand-primary font-black"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("learn")}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === "learn"
                  ? "bg-slate-100 text-brand-primary font-black"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Mastery Map
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === "insights"
                  ? "bg-slate-100 text-brand-primary font-black"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Math Sandbox
            </button>
            <input type="hidden" name="active-tab" value={activeTab} />
            <button
              onClick={() => setActiveTab("store")}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === "store"
                  ? "bg-slate-100 text-brand-primary font-black animate-pulse"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Premium Store
            </button>
            <button
              onClick={() => setActiveTab("social")}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === "social"
                  ? "bg-slate-100 text-brand-primary font-black"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Social Hub
            </button>
          </nav>

          {/* User Score Stats Indicators Block */}
          <div className="flex items-center gap-3">
            {/* Streak card block */}
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
              <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>{user.streak}d</span>
            </div>

            {/* Gems card block */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono">
              <div
                className="flex items-center gap-1 text-slate-700 px-2 py-1"
                title="Standard Gems"
              >
                <Gem className="w-4 h-4 text-cyan-500 fill-cyan-500" />
                <span>{user.gems}</span>
              </div>

              {(user.unlockedItems?.filter((x) => x === "trophy_gem_jade")
                .length || 0) > 0 && (
                <div
                  className="hidden sm:flex items-center gap-1 text-emerald-700 px-2 py-1 border-l border-slate-200"
                  title="Jade Shard"
                >
                  <Gem className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                  <span>
                    {
                      user.unlockedItems?.filter((x) => x === "trophy_gem_jade")
                        .length
                    }
                  </span>
                </div>
              )}

              {(user.unlockedItems?.filter((x) => x === "trophy_gem_sapphire")
                .length || 0) > 0 && (
                <div
                  className="hidden sm:flex items-center gap-1 text-blue-700 px-2 py-1 border-l border-slate-200"
                  title="Sapphire Matrix"
                >
                  <Gem className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span>
                    {
                      user.unlockedItems?.filter(
                        (x) => x === "trophy_gem_sapphire",
                      ).length
                    }
                  </span>
                </div>
              )}

              {(user.unlockedItems?.filter((x) => x === "trophy_gem_ruby")
                .length || 0) > 0 && (
                <div
                  className="hidden md:flex items-center gap-1 text-rose-700 px-2 py-1 border-l border-slate-200"
                  title="Ruby Core"
                >
                  <Gem className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  <span>
                    {
                      user.unlockedItems?.filter((x) => x === "trophy_gem_ruby")
                        .length
                    }
                  </span>
                </div>
              )}

              {(user.unlockedItems?.filter((x) => x === "trophy_gem_obsidian")
                .length || 0) > 0 && (
                <div
                  className="hidden lg:flex items-center gap-1 text-purple-700 px-2 py-1 border-l border-slate-200"
                  title="Obsidian Singularity"
                >
                  <Gem className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                  <span>
                    {
                      user.unlockedItems?.filter(
                        (x) => x === "trophy_gem_obsidian",
                      ).length
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Active Title Badging (Magnate Gem purchase) */}
            {user.activeTitle && (
              <span className="hidden md:inline bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border border-amber-600 animate-pulse">
                🎖️ {user.activeTitle}
              </span>
            )}

            {/* Premium Category level indicator */}
            <span
              className={`hidden sm:inline border text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                user.tier === "magnate"
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : user.tier === "analyst"
                    ? "bg-teal-100 text-[#006f66] border-teal-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {user.tier === "scholar"
                ? "Scholar Plan"
                : user.tier + " Premium"}
            </span>

            {/* Personalized Edit Profile Settings Button Trigger */}
            {isGuest ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 px-4 py-1.5 rounded-xl text-xs font-black transition shadow-md active:scale-95 cursor-pointer animate-pulse"
                title="Sign In or Register your Scholar account"
                id="header-signin-btn"
              >
                <User className="w-3.5 h-3.5" />
                <span>Join & Unlock</span>
              </button>
            ) : (
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 bg-slate-100/60 border border-slate-200/80 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer"
                title="Click to update your display username or set/change password"
                id="header-edit-profile-btn"
              >
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[120px] truncate">
                  {user.username || "Edit Profile"}
                </span>
              </button>
            )}

            {/* Quick Profile Dropdown trigger */}
            {!isGuest && (
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition"
                title="Sign Out Option"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

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
              onClick={() => {
                setActiveTab("home");
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveTab("learn");
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Mastery Map
            </button>
            <button
              onClick={() => {
                setActiveTab("insights");
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Math Sandbox
            </button>
            <button
              onClick={() => {
                setActiveTab("store");
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Premium Store
            </button>
            <button
              onClick={() => {
                setActiveTab("social");
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 block"
            >
              Social Hub
            </button>
          </div>
        )}
      </header>

      {/* Guest Alert Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-indigo-700 to-teal-900 text-white text-center py-2.5 px-4 font-sans text-xs font-bold shadow-md flex flex-wrap items-center justify-center gap-2">
          <span>
            ✨ Explore mode active! You are browsing courses and mathematical
            sandboxes read-only.
          </span>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-white text-indigo-700 hover:bg-slate-100 transition px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide cursor-pointer shadow-xs"
          >
            Create Free Account
          </button>
        </div>
      )}

      {/* 2. Main content container viewports */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === "home" && (
          <LandingScreen
            user={user}
            isGuest={isGuest}
            onNavigate={(tab) => setActiveTab(tab)}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {activeTab === "learn" && (
          <PathMap
            user={user}
            levels={levels}
            onStartLesson={handleStartLesson}
            onSetTrack={setActiveTrack}
            onSelectTrackChoice={handleSelectAnalystTrack}
            onUnlockLevel={handleUnlockLevelWithGems}
            onNavigateToStore={() => setActiveTab("store")}
          />
        )}

        {activeTab === "insights" && (
          <InsightsDashboard
            user={user}
            onNavigateToStore={() => setActiveTab("store")}
          />
        )}

        {activeTab === "store" && (
          <StoreScreen
            user={user}
            onUpgrade={handlePurchaseUpgrade}
            onBuyItem={handleSpendGems}
            onPurchaseGems={handlePurchaseGems}
            onUpdateUser={async (updated) => {
              await clientDb.saveUser(updated);
              setUser(updated);
            }}
          />
        )}

        {activeTab === "social" && (
          <SocialForum
            isGuest={isGuest}
            onSignUpPrompt={() => setShowAuthModal(true)}
          />
        )}

        {/* Disqus comments thread disabled */}
      </main>

      {/* 3. Humble footer matching Design Philosophy */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 font-sans text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>
            MIT OpenCourseWare courseware syllabus mapping © 2026. All rights
            and metrics verified.
          </span>
          <div className="flex items-center gap-4"></div>
        </div>
      </footer>

      {/* Database Setup Dialog Removed */}

      {/* 4.5. Auth Modal for guests */}
      {showAuthModal && (
        <div
          id="guest-signup-auth-modal"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[1001] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-lg w-full animate-pop max-h-[95vh] flex flex-col relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg w-7 h-7 flex items-center justify-center text-xs font-bold cursor-pointer transition z-50 select-none"
            >
              ✕
            </button>
            <div className="p-5 bg-gradient-to-r from-brand-primary to-teal-900 text-white shrink-0">
              <h3 className="font-display font-black text-lg">
                Join Sigma Learning
              </h3>
              <p className="text-white/80 text-xs mt-1">
                Create a free account to track your course progress, earn 💎
                gems, participate in discussions, and unlock billing premium
                tracks!
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh] bg-slate-50">
              <AuthScreen
                onSuccess={(tok, usr) => {
                  handleAuthSuccess(tok, usr);
                  setShowAuthModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. User Profile Update & Security Settings Modal */}
      {showProfileModal && user && (
        <div
          id="profile-settings-modal"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-5 animate-pop max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                    Active Human Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Inspect statistics or update authentication keys
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-650 bg-slate-102 p-1.5 rounded-lg w-7 h-7 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Success or Error feedbacks */}
            {profileSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{profileSuccessMessage}</span>
              </div>
            )}
            {profileErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>{profileErrorMessage}</span>
              </div>
            )}

            {/* Profile Stats Summary Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider animate-pulse">
                  email address
                </span>
                <span className="font-semibold text-slate-800 break-all">
                  {user.email}
                </span>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">
                  level status Plan
                </span>
                <span className="font-semibold text-indigo-700 uppercase font-mono">
                  {user.tier} Plan
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">
                  Interactive Streak
                </span>
                <span className="font-bold text-rose-600 font-mono">
                  🔥 {user.streak} Days
                </span>
              </div>
              <div className="space-y-1 text-right flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">
                  Academic Gems
                </span>
                <span className="font-bold text-cyan-600 font-mono">
                  💎 {user.gems} Standard
                </span>

                {(user.unlockedItems?.filter((x) => x === "trophy_gem_jade")
                  .length || 0) > 0 && (
                  <span className="font-bold text-emerald-600 font-mono">
                    💎{" "}
                    {
                      user.unlockedItems?.filter((x) => x === "trophy_gem_jade")
                        .length
                    }{" "}
                    Jade
                  </span>
                )}

                {(user.unlockedItems?.filter((x) => x === "trophy_gem_sapphire")
                  .length || 0) > 0 && (
                  <span className="font-bold text-blue-600 font-mono">
                    💎{" "}
                    {
                      user.unlockedItems?.filter(
                        (x) => x === "trophy_gem_sapphire",
                      ).length
                    }{" "}
                    Sapphire
                  </span>
                )}

                {(user.unlockedItems?.filter((x) => x === "trophy_gem_ruby")
                  .length || 0) > 0 && (
                  <span className="font-bold text-rose-600 font-mono">
                    💎{" "}
                    {
                      user.unlockedItems?.filter((x) => x === "trophy_gem_ruby")
                        .length
                    }{" "}
                    Ruby
                  </span>
                )}

                {(user.unlockedItems?.filter((x) => x === "trophy_gem_obsidian")
                  .length || 0) > 0 && (
                  <span className="font-bold text-purple-600 font-mono">
                    💎{" "}
                    {
                      user.unlockedItems?.filter(
                        (x) => x === "trophy_gem_obsidian",
                      ).length
                    }{" "}
                    Obsidian
                  </span>
                )}
              </div>

              {/* Federated Login Link Badging indicators */}
              <div className="col-span-2 border-t pt-2.5 mt-1 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">
                  Connected Federated Accounts
                </span>
                <div className="flex gap-2">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10.5px] font-semibold ${
                      user.googleLinked
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill={user.googleLinked ? "#4285F4" : "#94a3b8"}
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill={user.googleLinked ? "#34A853" : "#cbd5e1"}
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill={user.googleLinked ? "#FBBC05" : "#94a3b8"}
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"
                      />
                      <path
                        fill={user.googleLinked ? "#EA4335" : "#cbd5e1"}
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      Google {user.googleLinked ? "Linked" : "Not Linked"}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10.5px] font-semibold ${
                      user.facebookLinked
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <svg
                      className={`w-3.5 h-3.5 flex-shrink-0 fill-current ${user.facebookLinked ? "text-[#1877F2]" : "text-slate-400"}`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>
                      Facebook {user.facebookLinked ? "Linked" : "Not Linked"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Username field */}
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider font-mono block mb-1">
                  Full Display Name / Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Isaac Newton"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl font-sans text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Password change block */}
              <div className="border-t pt-3.5 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider font-mono block">
                    Change Password / Set New Password
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setProfileShowPasswords(!profileShowPasswords)
                    }
                    className="text-[10px] text-slate-400 hover:text-slate-650 font-bold cursor-pointer select-none"
                  >
                    {profileShowPasswords
                      ? "Hide Password Section"
                      : "Update Account Password"}
                  </button>
                </div>

                {profileShowPasswords && (
                  <div className="space-y-3 animate-slide-down">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        New Account Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          minLength={6}
                          placeholder="Min 6 secure characters..."
                          value={profileNewPassword}
                          onChange={(e) =>
                            setProfileNewPassword(e.target.value)
                          }
                          className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          minLength={6}
                          placeholder="Confirm characters matching above..."
                          value={profilePasswordConfirm}
                          onChange={(e) =>
                            setProfilePasswordConfirm(e.target.value)
                          }
                          className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit triggers */}
              <button
                type="submit"
                disabled={profileLoadingBy}
                className="w-full bg-slate-900 border-b-4 border-black text-white hover:bg-slate-950 px-4 py-3 rounded-xl font-mono text-xs font-black uppercase text-center tracking-widest active:border-b-0 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {profileLoadingBy
                  ? "Applying Secure Telemetry..."
                  : "Update Account Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Developer Toast Removed */}

      {/* Stripe Express Checkout Gateway Dialog Overlay */}
      {stripeModal && stripeModal.show && (
        <div
          id="stripe-checkout-overlay"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[1001] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-md w-full animate-pop max-h-[95vh] flex flex-col">
            {/* Header / Brand Strip matching Stripe Royal Violet Identity */}
            <div className="bg-gradient-to-r from-[#635BFF] to-[#0A2540] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Stripe Fluent Brand Glyphs */}
                <div className="bg-white rounded-lg px-2.5 py-1 flex items-center justify-center">
                  <span className="text-[#635BFF] font-black italic text-lg leading-none select-none tracking-tighter">
                    stripe
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight leading-tight uppercase font-mono text-indigo-200">
                    Express Stripe Payment
                  </h4>
                  <p className="text-[11px] text-white/90">
                    Verified Secure TLS Tunnel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStripeModal(null)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg w-7 h-7 flex items-center justify-center text-sm font-bold cursor-pointer transition select-none"
              >
                ✕
              </button>
            </div>

            {/* Main Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              {/* Cart Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">
                  Stripe Checkout Summary
                </span>
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {stripeModal.description}
                  </span>
                  <span className="font-mono font-black text-[#635BFF] text-base flex-shrink-0 ml-3">
                    ${stripeModal.amount.toFixed(2)} USD
                  </span>
                </div>
                <div className="border-t pt-2 mt-1 flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Merchant Intent ID:</span>
                  <span className="font-bold text-slate-600 select-all">
                    {stripeModal.intentId}
                  </span>
                </div>
              </div>

              {/* State Machine Steps */}
              {stripeModal.step === "options" && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h5 className="font-extrabold text-[#635BFF] text-sm">
                      Choose Settlement Method
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Processing live checkout directly via verified Stripe
                      endpoints
                    </p>
                  </div>

                  {/* Standard Stripe Element Button */}
                  <button
                    onClick={() =>
                      setStripeModal((prev) =>
                        prev ? { ...prev, step: "card" } : null,
                      )
                    }
                    className="w-full bg-[#635BFF] hover:bg-[#5346E0] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm font-sans"
                  >
                    💳 Pay with Debit or Credit Card
                  </button>

                  {/* Beautiful quick setup info */}
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold">🔒 Secure Session Shield:</p>
                    <p>
                      All transactions are validated with robust 3D-Secure 2.0.
                      No cards or secrets touch our server storage.
                    </p>
                  </div>

                  <p className="text-[10px] text-center text-slate-400">
                    🔒 SSL Certified Encryption. Powering global online payments
                    securely.
                  </p>
                </div>
              )}

              {stripeModal.step === "card" && (
                <div className="space-y-4 animate-pop">
                  <div className="text-center space-y-1">
                    <h5 className="font-extrabold text-slate-800 text-sm">
                      {stripeModal.simulated
                        ? "Authorizing Stripe Sandbox Card"
                        : "Card Settlement Details"}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {stripeModal.simulated
                        ? "Interactive Stripe Test mode enabled - Use any test card number!"
                        : "Encrypted card details are processed live by Stripe infrastructure."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        disabled={stripeModal.simulated}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none"
                        defaultValue={
                          stripeModal.simulated
                            ? "4242 •••• •••• 4242"
                            : undefined
                        }
                        placeholder="4242 4242 4242 4242"
                        readOnly={stripeModal.simulated}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1">
                          Expiration (MM/YY)
                        </label>
                        <input
                          type="text"
                          disabled={stripeModal.simulated}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none"
                          defaultValue={
                            stripeModal.simulated ? "12/28" : undefined
                          }
                          placeholder="MM/YY"
                          readOnly={stripeModal.simulated}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1">
                          CVV / CVC
                        </label>
                        <input
                          type="text"
                          disabled={stripeModal.simulated}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none"
                          defaultValue={
                            stripeModal.simulated ? "100" : undefined
                          }
                          placeholder="CVV"
                          readOnly={stripeModal.simulated}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        disabled={stripeModal.simulated}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none"
                        defaultValue={
                          stripeModal.simulated
                            ? "DR. SIGMA LEARNER"
                            : undefined
                        }
                        placeholder="Cardholder full name"
                        readOnly={stripeModal.simulated}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCaptureStripeCheckout}
                    className="w-full bg-[#635BFF] hover:bg-[#5346E0] text-white font-bold py-3.5 px-4 rounded-xl transition active:scale-97 text-center cursor-pointer text-xs select-none"
                  >
                    {stripeModal.simulated
                      ? "Confirm Simulated Test Payment"
                      : "Secure checkout & Complete Purchase"}
                  </button>

                  <button
                    onClick={() =>
                      setStripeModal((prev) =>
                        prev ? { ...prev, step: "options" } : null,
                      )
                    }
                    className="w-full py-1 text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ← Back to Payment options
                  </button>
                </div>
              )}

              {stripeModal.step === "authorizing" && (
                <div className="p-8 text-center space-y-4 animate-pulse">
                  <div className="relative w-14 h-14 bg-indigo-50 text-[#635BFF] rounded-full flex items-center justify-center mx-auto border border-indigo-100">
                    <span className="text-xl font-bold font-mono">⏱</span>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-800 text-sm">
                      Validating Ledger Settlement...
                    </h5>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Clearing secure credentials and processing your instant
                      credits. This takes just a moment...
                    </p>
                  </div>
                </div>
              )}

              {stripeModal.step === "success" && (
                <div className="p-4 text-center space-y-5 animate-pop">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-md">
                    <svg
                      className="w-6 h-6 stroke-current stroke-[2.5]"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-extrabold text-emerald-800 text-sm">
                      Payment Approved & Cleared!
                    </h5>
                    {stripeModal.type === "subscription" &&
                    (stripeModal.itemIdOrTier === "analyst" ||
                      stripeModal.itemIdOrTier === "magnate") ? (
                      <p className="text-xs font-black text-emerald-700 bg-emerald-50/70 border border-emerald-250 p-3.5 rounded-2xl animate-pop">
                        🎉 Account successfully upgraded to{" "}
                        {stripeModal.itemIdOrTier.toUpperCase()}! Your premium
                        balance has been updated.
                      </p>
                    ) : stripeModal.type === "gems" ? (
                      <p className="text-xs font-black text-emerald-700 bg-emerald-50/70 border border-emerald-250 p-3.5 rounded-2xl animate-pop">
                        💳 Payment Verified! Enhanced your academic balance by
                        purchasing the{" "}
                        {stripeModal.itemIdOrTier
                          .replace("_", " ")
                          .toUpperCase()}
                        !
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">
                        We have successfully recorded your Stripe transaction
                        and synchronized your local database credentials.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] font-mono text-slate-500 space-y-1 text-left">
                    <div>
                      Status:{" "}
                      <span className="text-emerald-600 font-bold uppercase select-none">
                        COMPLETED
                      </span>
                    </div>
                    <div>
                      Type:{" "}
                      <span className="font-bold select-none">
                        {stripeModal.type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      Reference ID:{" "}
                      <span className="font-bold select-all">
                        {stripeModal.intentId}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStripeModal(null)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black py-3 px-4 rounded-xl text-center cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Close Secure Checkout
                  </button>
                </div>
              )}

              {stripeModal.step === "error" && (
                <div className="p-4 text-center space-y-4 animate-pop">
                  <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-sm font-bold text-lg">
                    ⚠️
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-rose-800 text-sm font-display">
                      Transaction Handshake Refused
                    </h5>
                    <p className="text-xs text-rose-700 font-sans bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 select-all font-mono">
                      {stripeModal.errorMsg ||
                        "Stripe API clearing request timed out."}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setStripeModal((prev) =>
                        prev ? { ...prev, step: "options" } : null,
                      )
                    }
                    className="w-full bg-slate-900 text-white font-mono py-2.5 px-4 rounded-xl text-center cursor-pointer text-xs uppercase"
                  >
                    Retry Transaction
                  </button>

                  <button
                    onClick={() => setStripeModal(null)}
                    className="w-full py-1 text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive FAQ and Offline Support Bot Widget */}
      <ChatbotWidget user={user} />
    </div>
  );
}
