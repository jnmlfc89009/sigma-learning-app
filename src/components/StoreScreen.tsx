import { safeStorage } from '../lib/safeStorage';
import { getAudioContext } from "../lib/audio";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Check,
  Flame,
  ShieldCheck,
  Gem,
  AlertCircle,
  RefreshCw,
  Lock,
  X,
  Award,
  Heart,
  Boxes,
  Coins,
  Gift,
  Trophy,
} from "lucide-react";
import { UserProfile } from "../types";
import SponsorAdBanner from "./SponsorAdBanner";

interface StoreScreenProps {
  user: UserProfile;
  onUpgrade: (
    tier: "scholar" | "analyst" | "magnate",
    billingCycle: "monthly" | "annual",
  ) => Promise<void>;
  onBuyItem: (
    itemId: string,
    price: number,
    itemType: string,
    itemValue?: string,
  ) => Promise<void>;
  onPurchaseGems: (
    packId: string,
    gemAmount: number,
    price: number,
  ) => Promise<void>;
  onUpdateUser?: (updated: UserProfile) => Promise<void>;
}

export default function StoreScreen({
  user,
  onUpgrade,
  onBuyItem,
  onPurchaseGems,
  onUpdateUser,
}: StoreScreenProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const [bazaarError, setBazaarError] = useState("");
  const [bazaarSuccess, setBazaarSuccess] = useState("");
  const [bazaarLoading, setBazaarLoading] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

  // Gacha machine state hooks
  const [isRollingGacha, setIsRollingGacha] = useState(false);
  const [gachaError, setGachaError] = useState("");
  const [gachaResult, setGachaResult] = useState<{
    name: string;
    description: string;
    type: "powerup" | "title" | "avatar" | "gems" | "trophy";
    badge: string;
    icon: string;
  } | null>(null);

  // Trade Up Gem Trophies Vault state hooks
  const [vaultError, setVaultError] = useState("");
  const [vaultSuccess, setVaultSuccess] = useState("");
  const [vaultLoading, setVaultLoading] = useState<string | null>(null);

  const tradeTiers = [
    {
      id: "trophy_gem_jade",
      name: "Uncommon Jade Shard",
      price: 75,
      badge: "Curiosity Gem",
      desc: "A beautifully polished raw jade shard representing initial academic interest. Displays inside your prestigious display collection.",
      color:
        "text-emerald-500 bg-emerald-50 border-emerald-200 fill-emerald-500",
      iconColor: "text-emerald-500 fill-emerald-500",
      bgColor: "bg-emerald-50/50 hover:border-emerald-300",
    },
    {
      id: "trophy_gem_sapphire",
      name: "Rare Sapphire Matrix",
      price: 180,
      badge: "Computational Gem",
      desc: "A geometric deep blue sapphire crystal chunk representing computation and rigorous logic standards. Highly prized.",
      color: "text-blue-500 bg-blue-50 border-blue-200 fill-blue-500",
      iconColor: "text-blue-500 fill-blue-500",
      bgColor: "bg-blue-50/50 hover:border-blue-300",
    },
    {
      id: "trophy_gem_ruby",
      name: "Epic Red Ruby Core",
      price: 350,
      badge: "Compounding Energy",
      desc: "A magnificent flawless hot ruby matrix humming with the kinetic force of corporate profit compounding.",
      color: "text-rose-500 bg-rose-50 border-rose-200 fill-rose-500",
      iconColor: "text-rose-500 fill-rose-500",
      bgColor: "bg-rose-50/50 hover:border-rose-300",
    },
    {
      id: "trophy_gem_obsidian",
      name: "Legendary Celestial Obsidian",
      price: 700,
      badge: "Absolute Proof",
      desc: "The ultimate hyper-dense obsidian singularity representing double-entry balance sheet symmetry and ledger dominance.",
      color: "text-purple-600 bg-purple-50 border-purple-200 fill-purple-600",
      iconColor: "text-purple-600 fill-purple-600",
      bgColor: "bg-purple-50/50 hover:border-purple-300",
    },
  ];

  const handleRollGacha = async () => {
    if (user.gems < 120) {
      setGachaError(
        "⚠️ Instigating a Gilded Mystery roll requires 120 💎. Please claim more check-point rewards or top-up.",
      );
      return;
    }

    setIsRollingGacha(true);
    setGachaError("");
    setGachaResult(null);

    // Play a delightful rolling sound (Web Audio API synth slots)
    if (
      typeof window !== "undefined" &&
      safeStorage.getItem("soundEnabled") !== "false"
    ) {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        let now = ctx.currentTime;
        // Fast pitch climb
        for (let i = 0; i < 8; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(300 + i * 120, now + i * 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.06, now + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.12);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.15);
        }
      } catch {}
    }

    // Delay 1.5s to create high anticipation rolling feel!
    setTimeout(async () => {
      const rand = Math.random() * 100;
      let rolledPrize: typeof gachaResult = null;
      let rewardItemId = "";
      let addDirectGems = 0;
      let assignAvatar = "";
      let assignTitle = "";

      if (rand < 45) {
        // Power-ups
        const powerupRand = Math.random();
        if (powerupRand < 0.55) {
          rewardItemId = "powerup_50_50";
          rolledPrize = {
            name: "50/50 Eliminator Formula",
            description:
              "Splits multiple-choice options immediately, crossing out two incorrect choices.",
            type: "powerup",
            badge: "Strategic Consumable",
            icon: "⚡",
          };
        } else if (powerupRand < 0.85) {
          rewardItemId = "powerup_extra_life";
          rolledPrize = {
            name: "Aegis Second Life Shield",
            description:
              "Absorbs one incorrect response inside the LessonPlayer so you can retry the question.",
            type: "powerup",
            badge: "Strategic Consumable",
            icon: "🛡️",
          };
        } else {
          rewardItemId = "powerup_extra_time";
          rolledPrize = {
            name: "Temporal Hourglass Chrono",
            description:
              "Turns back the clock and adds maximum focus time inside analytical tests.",
            type: "powerup",
            badge: "Strategic Consumable",
            icon: "⏳",
          };
        }
      } else if (rand < 75) {
        // Player titles flairs
        const titles = [
          "The Stochastic Oracle",
          "Arbitrage Alchemist",
          "Poisson Prophet",
          "Normal Distribution Knight",
          "Double Entry Demon",
          "Calculus Commander",
        ];
        const pickedTitle = titles[Math.floor(Math.random() * titles.length)];
        rewardItemId = `title_${pickedTitle.toLowerCase().replace(/\s+/g, "_")}`;
        assignTitle = pickedTitle;
        rolledPrize = {
          name: `Title Flair: ${pickedTitle}`,
          description:
            "A prestigious gold display moniker visible in public leaderboards and headers.",
          type: "title",
          badge: "Mono Sovereign monicker",
          icon: "🎖️",
        };
      } else if (rand < 90) {
        // Sublime Gems (20% total, split: Jade 10%, Sapphire 7%, Ruby 2%, Obsidian 1%)
        const gemRand = Math.random() * 20;
        let gemName = "";
        let gemDesc = "";
        let icon = "";

        if (gemRand < 1) {
          // 1%
          rewardItemId = "trophy_gem_obsidian";
          gemName = "Legendary Obsidian Core";
          gemDesc =
            "An extraordinarily rare void stone forged under immense atmospheric tension.";
          icon = "🌑";
        } else if (gemRand < 3) {
          // 2%
          rewardItemId = "trophy_gem_ruby";
          gemName = "Epic Red Ruby Core";
          gemDesc =
            "A magnificent flawless hot ruby matrix humming with kinetic force.";
          icon = "🔴";
        } else if (gemRand < 10) {
          // 7%
          rewardItemId = "trophy_gem_sapphire";
          gemName = "Rare Sapphire Matrix";
          gemDesc =
            "A geometric deep blue sapphire crystal chunk representing rigorous logic.";
          icon = "🔷";
        } else {
          // 10%
          rewardItemId = "trophy_gem_jade";
          gemName = "Uncommon Jade Shard";
          gemDesc =
            "A beautifully polished raw jade shard representing academic interest.";
          icon = "🟩";
        }

        rolledPrize = {
          name: gemName,
          description: gemDesc,
          type: "trophy",
          badge: "Sublime Gem Drop",
          icon: icon,
        };
      } else {
        // Gems Cashback Refunds
        const gemRoll = Math.random();
        let cashbackCount = 50;
        let cName = "Substandard Cashback Bag";
        if (gemRoll > 0.95) {
          cashbackCount = 500;
          cName = "👑 SOVEREIGN UNEXPECTED REBATE JACKPOT";
        } else if (gemRoll > 0.7) {
          cashbackCount = 150;
          cName = "Institutional Gem Allowance Grant";
        }
        addDirectGems = cashbackCount;
        rolledPrize = {
          name: `${cashbackCount} Standard Gems`,
          description: `Direct cashback refund! Claim back a net positive value of ${cashbackCount} 💎 gems instantly.`,
          type: "gems",
          badge: "Academic Cashback",
          icon: "💎",
        };
      }

      // Update database profile
      let finalUnlockedItems = [...(user.unlockedItems || [])];
      let finalGems = user.gems - 120 + addDirectGems; // subtract roll fee + add cashback
      let activeTitle = user.activeTitle;
      let avatarSeed = user.avatarSeed;

      if (rewardItemId) {
        finalUnlockedItems.push(rewardItemId);
      }
      if (assignTitle) {
        activeTitle = assignTitle;
      }
      if (assignAvatar) {
        avatarSeed = assignAvatar;
      }

      const updatedUser: UserProfile = {
        ...user,
        gems: finalGems,
        unlockedItems: finalUnlockedItems,
        activeTitle,
        avatarSeed,
      };

      try {
        if (onUpdateUser) {
          await onUpdateUser(updatedUser);
        }
        setGachaResult(rolledPrize);

        // Play victory sounds
        if (
          typeof window !== "undefined" &&
          safeStorage.getItem("soundEnabled") !== "false"
        ) {
          const ctx = getAudioContext();
          if (!ctx) return;
          const now = ctx.currentTime;
          [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(f, now + i * 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.08, now + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(
              0.0001,
              now + i * 0.06 + 0.35,
            );
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.4);
          });
        }
      } catch (err) {
        setGachaError(
          "Gems deduction verification error on cryptographic server ledger.",
        );
      } finally {
        setIsRollingGacha(false);
      }
    }, 1500);
  };

  const handleTradeGemForPowerup = async (
    gemId: string,
    powerupId: string,
    powerupName: string,
  ) => {
    setVaultError("");
    setVaultSuccess("");

    const count = user.unlockedItems?.filter((x) => x === gemId).length || 0;
    const gemName = gemId.replace("trophy_gem_", "");
    if (count < 1) {
      setVaultError(
        `⚠️ Insufficient funds. You need at least 1 ${gemName.toUpperCase()} to purchase this power-up.`,
      );
      return;
    }

    let amount = 1;
    if (gemId === "trophy_gem_sapphire") amount = 3;
    if (gemId === "trophy_gem_ruby") amount = 7;
    if (gemId === "trophy_gem_obsidian") amount = 15;

    setVaultLoading("powerup_exchange");
    try {
      let finalUnlockedItems = [...(user.unlockedItems || [])];

      const index = finalUnlockedItems.indexOf(gemId);
      if (index > -1) {
        finalUnlockedItems.splice(index, 1);
      }

      for (let i = 0; i < amount; i++) {
        finalUnlockedItems.push(powerupId);
      }

      const updatedUser: UserProfile = {
        ...user,
        unlockedItems: finalUnlockedItems,
      };

      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
      setVaultSuccess(
        `✨ Trade Executed! Consumed 1x ${gemName.toUpperCase()} and added ${amount}x ${powerupName} to your inventory!`,
      );
    } catch {
      setVaultError("Trade clearance failed. Resetting ledger cache.");
    } finally {
      setVaultLoading(null);
    }
  };

  const tradeTrophiesGems = async (tier: (typeof tradeTiers)[0]) => {
    setVaultError("");
    setVaultSuccess("");

    if (user.gems < tier.price) {
      setVaultError(
        `⚠️ Insufficient funds. Splendid Gem conversion of standard gems to ${tier.name} requires ${tier.price} 💎.`,
      );
      return;
    }

    setVaultLoading(tier.id);
    try {
      let finalUnlockedItems = [...(user.unlockedItems || [])];
      finalUnlockedItems.push(tier.id);

      const updatedUser: UserProfile = {
        ...user,
        gems: user.gems - tier.price,
        unlockedItems: finalUnlockedItems,
      };

      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
      setVaultSuccess(
        `✨ Trade Executed! Consumed ${tier.price} 💎 standard gems. You have securely locked 1x '${tier.name}' inside your active ledger!`,
      );

      // Play high bell sound
      if (
        typeof window !== "undefined" &&
        safeStorage.getItem("soundEnabled") !== "false"
      ) {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(f, now + i * 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.08, now + i * 0.07 + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.35);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.4);
        });
      }
    } catch {
      setVaultError("Trade clearance failed. Resetting ledger cache.");
    } finally {
      setVaultLoading(null);
    }
  };

  const gemPacks = [
    {
      id: "novice_satchel",
      name: "Scholar Pocket Satchel",
      gemsAmount: 150,
      price: 1.99,
      badge: "Pocket Top-Up",
      bonus: "Basic Study Fuel",
    },
    {
      id: "analyst_stash",
      name: "Analyst Treasury Stash",
      gemsAmount: 550,
      price: 4.99,
      badge: "Best Value",
      bonus: "Includes 50 bonus Gems!",
    },
    {
      id: "magnate_vault",
      name: "Magnate Sovereign Vault",
      gemsAmount: 1300,
      price: 9.99,
      badge: "High Volumes",
      bonus: "Includes 300 bonus Gems!",
    },
    {
      id: "sovereign_chest",
      name: "Endowment Capital Chest",
      gemsAmount: 3200,
      price: 19.99,
      badge: "Institutional",
      bonus: "Includes 1200 bonus Gems!",
    },
  ];

  const handlePurchaseGemsClick = async (pack: (typeof gemPacks)[0]) => {
    setPurchaseLoading(pack.id);
    setPurchaseSuccess("");
    setPurchaseError("");
    try {
      await onPurchaseGems(pack.id, pack.gemsAmount, pack.price);
    } catch (err: any) {
      setPurchaseError(err.message || "Cryptographic clearing house failure.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  const bazaarItems = [
    {
      id: "title_ledger_lord",
      name: "Title Flair: Sovereign Ledger Lord",
      description:
        "Display the legendary gold title 🎖️ 'SOVEREIGN LEDGER LORD' next to your avatar across all learning tabs.",
      price: 300,
      itemType: "title",
      itemValue: "Sovereign Ledger Lord",
      badge: "Prestige Accent",
    },
    {
      id: "title_mit_expert",
      name: "Title Flair: MIT Syllabus Scholar",
      description:
        "Adorn your profile header with the distinguished amber 🎖️ 'MIT SYLLABUS SCHOLAR' badge.",
      price: 400,
      itemType: "title",
      itemValue: "MIT Syllabus Scholar",
      badge: "Syllabus Champion",
    },
    {
      id: "double_reward_charm",
      name: "Sovereign Double-Reward Charm",
      description:
        "Unlocks a dynamic 2x Gem multiplier for all future quiz and level finishes. Speeds up progress exponentially!",
      price: 350,
      itemType: "powerup",
      itemValue: "double_reward",
      badge: "Booster Upgrade",
    },
    {
      id: "ocw_certificate",
      name: "Dynamic MIT Syllabus Certificate",
      description:
        "Generate a dynamically verifiable certificate of academic mastery featuring your live stats and validation protocols.",
      price: 500,
      itemType: "certificate",
      itemValue: "certificate",
      badge: "Printable Diploma",
    },
  ];

  const handleBuyItemClick = async (item: (typeof bazaarItems)[0]) => {
    if (user.tier === "scholar") {
      setBazaarError(
        "⚠️ Gem Bazaar privileges are strictly reserved for premium Analyst & Magnate scholar levels!",
      );
      return;
    }
    if (user.gems < item.price) {
      setBazaarError(
        `⚠️ Insufficient Gems. Unlocking '${item.name}' costs ${item.price} 💎 but you only have ${user.gems} 💎.`,
      );
      return;
    }

    setBazaarLoading(item.id);
    setBazaarError("");
    setBazaarSuccess("");

    try {
      await onBuyItem(item.id, item.price, item.itemType, item.itemValue);
      setBazaarSuccess(
        `🎉 Successfully unlocked ${item.name}! Applied changes to your live profile ledger.`,
      );

      // Play a lovely high bell sound
      if (
        typeof window !== "undefined" &&
        safeStorage.getItem("soundEnabled") !== "false"
      ) {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [880, 1318.51, 1760].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.5);
        });
      }
    } catch (err: any) {
      setBazaarError(err.message || "Failed to make transaction.");
    } finally {
      setBazaarLoading(null);
    }
  };

  const generateHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash)
      .toString(16)
      .padEnd(8, "f")
      .substring(0, 8)
      .toUpperCase();
  };

  const plans = [
    {
      id: "scholar" as const,
      name: "SCHOLAR",
      color: "from-slate-400 to-slate-600",
      price: 0,
      features: [
        "Learn core tracks up to Level 3",
        "Clamped Compound Wealth APY & Horizons",
        "Locked Booking Ledger & Normal Curve labs",
        "Ad-supported Google AdSense banner units",
        "Standard progression speeds",
      ],
      cta: "Current Tier",
      popular: false,
      gemsCredit: 0,
    },
    {
      id: "analyst" as const,
      name: "ANALYST GOLD",
      color: "from-teal-600 to-emerald-600",
      price: 9.99,
      features: [
        "Select ONE Course to study Level 1-12 in full (Lifetime access)",
        "Spend 100 💎 to unlock levels in other courses",
        "Full, unlimited access to Math Sandbox labs",
        "Instant 550 💎 premium Gems credit",
        "Ad-free curriculum environment (No AdSense)",
        "Basic Certificate of Financial Literacy",
      ],
      cta: "Upgrade to Gold",
      popular: true,
      gemsCredit: 550,
    },
    {
      id: "magnate" as const,
      name: "MAGNATE PRO",
      color: "from-brand-primary to-indigo-950",
      price: 49.99,
      features: [
        "Unlock ALL courses 1-12 completely (No gem walls)",
        "Unlocks Daily Applied Mathematics track",
        "Full, unlimited access to all Math Sandbox labs",
        "Instant 2,000 💎 premium Gems credit",
        "Ad-free curriculum environment (No AdSense)",
        "Direct WhatsApp Support & live ticket queue",
        "MIT OCW syllabus verified exam logs",
      ],
      cta: "Upgrade to Magnate",
      popular: false,
      gemsCredit: 2000,
    },
  ];

  const handleUpgradeClick = async (
    planId: "scholar" | "analyst" | "magnate",
  ) => {
    if (planId === user.tier) return;
    setLoadingTier(planId);
    try {
      await onUpgrade(planId, billingCycle);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div
      id="store-screen-container"
      className="space-y-10 animate-pop max-w-5xl mx-auto pb-12"
    >
      {/* Monetization / App Store Header */}
      <div className="text-center space-y-3">
        <span className="bg-brand-secondary/15 text-brand-secondary text-xs uppercase font-mono font-bold px-3 py-1.5 rounded-full border border-brand-secondary/20">
          Official Sigma Academy Membership Store
        </span>
        <h2 className="font-display font-black text-3xl md:text-4xl text-slate-950 tracking-tight">
          Select Your Academic Scholarship Level
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto font-sans text-sm md:text-base">
          Our one-time lifetime payment structure unlocks premium courses,
          verified Master Certifications, and includes instant Gems packages to
          bypass progress checkpoints. No recurring monthly subscriptions.
        </p>
      </div>

      {/* Grid containing Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
        {plans.map((p) => {
          const isCurrent = user.tier === p.id;
          const formattedPrice =
            p.price === 0 ? "FREE" : `$${p.price.toFixed(2)}`;
          const periodText = p.price === 0 ? "" : "one-time";

          return (
            <div
              key={p.id}
              className={`tactile-card overflow-hidden flex flex-col justify-between relative ${
                isCurrent
                  ? "border-2 border-brand-secondary/80 ring-4 ring-teal-100 scale-[1.01]"
                  : p.popular
                    ? "border-2 border-indigo-500 shadow-md transform md:-translate-y-2"
                    : ""
              }`}
            >
              {p.popular && (
                <div className="absolute top-3 right-3 bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-0.5 shadow">
                  <Sparkles className="w-3 h-3 fill-white" />
                  Most Popular
                </div>
              )}

              {/* Card Upper Core */}
              <div className="p-6 md:p-8 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {p.name}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-none">
                    {formattedPrice}
                  </span>
                  {periodText && (
                    <span className="text-xs text-slate-400 font-extrabold uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                      {periodText}
                    </span>
                  )}
                </div>

                {p.gemsCredit > 0 && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 text-xs text-yellow-800 font-semibold px-2.5 py-1.5 rounded-lg border border-yellow-200 w-fit">
                    <Gem className="w-4 h-4 text-cyan-500 fill-cyan-500" />
                    <span>Includes {p.gemsCredit} Premium Gems!</span>
                  </div>
                )}

                <p className="border-b border-slate-100 pb-4"></p>

                {/* Features Checklist */}
                <ul className="space-y-3 pt-2">
                  {p.features.map((feat, fidx) => (
                    <li
                      key={fidx}
                      className="flex items-start gap-2.5 text-xs text-slate-600 font-sans"
                    >
                      <Check className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upgrade triggers */}
              <div className="p-6 pt-0 mt-auto">
                <button
                  type="button"
                  disabled={isCurrent || loadingTier !== null}
                  onClick={() => handleUpgradeClick(p.id)}
                  className={`w-full py-4 text-xs font-bold uppercase tracking-widest rounded-xl transition duration-150 border-b-4 flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed border-b-2"
                      : p.popular
                        ? "bg-indigo-600 text-white border-indigo-900 hover:bg-indigo-700 active:border-b-0 active:translate-y-1 animate-pulse"
                        : "bg-brand-secondary text-white border-teal-950 hover:bg-brand-secondary/95 active:border-b-0 active:translate-y-1"
                  }`}
                >
                  {loadingTier === p.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    p.cta
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Gem Top-Up Depot */}
      <div
        id="gem-purchase-depot-section"
        className="space-y-6 pt-10 border-t border-slate-200 mt-10 text-left"
      >
        <div className="space-y-1">
          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
            💳 Premium Gem Depositor
          </span>
          <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">
            Purchase Academic Progression Gems
          </h3>
          <p className="text-slate-500 text-xs font-sans max-w-xl">
            Acquire extra gems instantly to bypass quiz walls, speed-unlock
            curriculum levels, buy tactical booster power-ups, or secure
            exclusive digital certificates.
          </p>
        </div>

        {purchaseSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-[11px] flex items-center gap-2.5 animate-pop text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{purchaseSuccess}</span>
          </div>
        )}

        {purchaseError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-[11px] flex items-center gap-2.5 animate-pop text-left">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{purchaseError}</span>
          </div>
        )}

        {/* Gem Packs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {gemPacks.map((pack) => {
            const isLoading = purchaseLoading === pack.id;

            return (
              <div
                key={pack.id}
                className="bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between gap-4 transition text-left relative"
              >
                {pack.badge && (
                  <span className="absolute top-3 right-3 text-[8px] font-mono font-bold bg-amber-100 text-amber-700 uppercase tracking-wider px-1.5 py-0.5 rounded">
                    {pack.badge}
                  </span>
                )}

                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm">
                    <Gem className="w-6 h-6 text-cyan-500 fill-cyan-500 animate-pulse" />
                  </div>
                  <h4 className="font-display font-black text-sm text-slate-900 uppercase tracking-tight block">
                    {pack.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-black text-lg text-slate-900">
                      +{pack.gemsAmount}
                    </span>
                    <span className="text-amber-500 font-bold text-xs uppercase">
                      💎
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] leading-tight italic">
                    {pack.bonus}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    disabled={purchaseLoading !== null}
                    onClick={() => handlePurchaseGemsClick(pack)}
                    className="w-full py-2 bg-[#006a61] hover:bg-[#00554c] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border-b-2 border-slate-950"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      `Buy for $${pack.price}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Gem Boutique Section */}
      <div
        id="gem-bazaar-section"
        className="space-y-6 pt-10 border-t border-slate-200 mt-10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
              💎 Academic Gem Boutique
            </span>
            <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Pre-Eminent Gem Exchange & Bazaar
            </h3>
            <p className="text-slate-500 text-xs font-sans max-w-xl">
              Turn your accrued academic capital into permanent achievements and
              credentials. Premium Analyst & Magnate scholars enjoy full trade
              licenses.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border-b-2 border-slate-950 shadow-sm shrink-0">
            <Gem className="w-4 h-4 text-cyan-500 fill-cyan-500 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider">
              Your Balance: {user.gems} 💎
            </span>
          </div>
        </div>

        {bazaarSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-pop text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{bazaarSuccess}</span>
          </div>
        )}

        {bazaarError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 animate-pop text-left">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{bazaarError}</span>
          </div>
        )}

        {/* Bazaar Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {bazaarItems.map((item) => {
            const hasPurchased = user.unlockedItems?.includes(item.id);
            const canAfford = user.gems >= item.price;
            const isScholar = user.tier === "scholar";

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border text-left flex flex-col justify-between gap-4 transition-all ${
                  hasPurchased && item.id !== "charity_sponsor"
                    ? "bg-slate-50 border-slate-200 shadow-inner opacity-90"
                    : isScholar
                      ? "bg-slate-100/50 border-slate-200 opacity-70"
                      : "bg-white border-slate-250 hover:shadow-md hover:border-slate-300"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 uppercase tracking-widest px-2 py-0.5 rounded-md">
                      {item.badge}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-xl">
                      <Gem className="w-3.5 h-3.5 fill-cyan-500 text-cyan-500" />
                      <span>{item.price}</span>
                    </div>
                  </div>

                  <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-tight block">
                    {item.name}
                  </h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {item.description}
                  </p>

                  {item.id === "charity_sponsor" &&
                    (user.sponsoredCount || 0) > 0 && (
                      <div className="pt-1.5">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                          💖 Supported Peers: {user.sponsoredCount} simulated
                          students
                        </span>
                      </div>
                    )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {hasPurchased && item.id === "ocw_certificate" ? (
                    <button
                      onClick={() => setShowCertificateModal(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border-b-2 border-indigo-900 shadow-sm"
                    >
                      <Award className="w-3.5 h-3.5" />
                      View Verification Document
                    </button>
                  ) : hasPurchased && item.id !== "charity_sponsor" ? (
                    <div className="w-full py-2 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-400 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ordered / Applied Flair
                    </div>
                  ) : (
                    <button
                      disabled={bazaarLoading === item.id}
                      onClick={() => handleBuyItemClick(item)}
                      className={`w-full py-2.5 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border-b-2 ${
                        isScholar
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed border-b"
                          : !canAfford
                            ? "bg-amber-50 text-amber-600 border-amber-200/50 hover:bg-amber-100"
                            : "bg-slate-900 border-slate-950 text-white hover:bg-slate-800"
                      }`}
                    >
                      {bazaarLoading === item.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isScholar ? (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Premium Required
                        </>
                      ) : (
                        `Purchase with Gems`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. ADVANCED GAMIFIED EXPERIENCE PORT */}
      {/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}
      <div
        id="sublime-themed-vault-card"
        className="bg-white border border-slate-200 rounded-[32px] p-6 space-y-6 text-left animate-pop"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1 w-fit">
              <Trophy className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
              Themed Reward Vault
            </span>
            <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Sublime Gem Trade-Up Vault
            </h3>
            <p className="text-slate-500 text-xs">
              Provide yourself with long-term academic milestones. Convert
              standard accumulated gems into prestigious Rare and Legendary
              tokens. Displays prominently inside your trophy cabinets.
            </p>
          </div>

          {/* Display collected items summary cabinet */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-4 text-center">
            <div>
              <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">
                Jade
              </span>
              <span className="font-mono text-base font-black text-emerald-600">
                {user.unlockedItems?.filter((x) => x === "trophy_gem_jade")
                  .length || 0}
                x
              </span>
            </div>
            <div className="border-l border-slate-200"></div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">
                Sapphire
              </span>
              <span className="font-mono text-base font-black text-blue-600">
                {user.unlockedItems?.filter((x) => x === "trophy_gem_sapphire")
                  .length || 0}
                x
              </span>
            </div>
            <div className="border-l border-slate-200"></div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">
                Ruby
              </span>
              <span className="font-mono text-base font-black text-rose-600">
                {user.unlockedItems?.filter((x) => x === "trophy_gem_ruby")
                  .length || 0}
                x
              </span>
            </div>
            <div className="border-l border-slate-200"></div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">
                Obsidian
              </span>
              <span className="font-mono text-base font-black text-purple-650">
                {user.unlockedItems?.filter((x) => x === "trophy_gem_obsidian")
                  .length || 0}
                x
              </span>
            </div>
          </div>
        </div>

        {vaultSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-pop">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{vaultSuccess}</span>
          </div>
        )}

        {vaultError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 animate-pop">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{vaultError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {tradeTiers.map((tier) => {
            const count =
              user.unlockedItems?.filter((x) => x === tier.id).length || 0;
            const hasBoughtBadge = count > 0;
            const canAfford = user.gems >= tier.price;

            return (
              <div
                key={tier.id}
                className={`p-4 border rounded-2xl flex flex-col justify-between gap-4 transition-all duration-200 ${tier.bgColor} ${
                  hasBoughtBadge
                    ? "shadow-sm border-slate-300"
                    : "border-slate-205 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate">
                      {tier.badge}
                    </span>
                    <span className="font-mono text-[9px] font-bold bg-slate-105 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                      Owned: {count}
                    </span>
                  </div>

                  <div className="flex gap-2 items-center">
                    <Gem className={`w-6 h-6 shrink-0 ${tier.iconColor}`} />
                    <h4 className="font-display font-black text-[11px] text-slate-900 uppercase">
                      {tier.name}
                    </h4>
                  </div>

                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    {tier.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => tradeTrophiesGems(tier)}
                    disabled={vaultLoading !== null || !canAfford}
                    className={`w-full py-2 text-[10px] font-extrabold font-mono uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
                      !canAfford
                        ? "bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed border-b"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {vaultLoading === tier.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        Trade {tier.price} 💎
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          id="gamified-boutique-experience-deck"
          className="space-y-10 pt-10 border-t border-slate-200 mt-10"
        >
          {/* ROW 1: POWERUPS DIRECT STORES & GACHA MACHINE WRAPPER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left animate-pop">
            {/* THE GILDED SCHOLAR MYSTERY GACHA BOX MACHINE */}
            <div className="lg:col-span-5 bg-gradient-to-b from-indigo-950 to-slate-950 border-4 border-indigo-500 rounded-[32px] p-6 text-white flex flex-col justify-between space-y-6 relative shadow-lg overflow-hidden min-h-[420px]">
              {/* Ambient Background Grid lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

              <div className="relative space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-widest">
                    🎰 Gilded Scholar Wheel
                  </span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                    Mystery Drop
                  </span>
                </div>
                <h3 className="font-display font-black text-xl text-[#f3f4f6] tracking-tight flex items-center gap-1.5 uppercase">
                  <Boxes className="w-5 h-5 text-indigo-400" />
                  Sovereign Mystery Box
                </h3>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Unlock high-end exclusive monickers flairs, rare sublime gems,
                  direct cashbacks, or valuable quiz helpers! Costs{" "}
                  <strong className="text-amber-400">120 GEMS</strong>.
                </p>
              </div>

              {/* Simulated Live Roll Panel */}
              <div className="relative bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 min-h-[140px] flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
                {isRollingGacha ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="w-12 h-12 bg-indigo-600/30 border-2 border-indigo-500 rounded-full flex items-center justify-center mx-auto text-xl animate-spin text-white">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold tracking-widest text-indigo-350 uppercase block">
                        Rerouting Cryptographic Seed...
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Verifying on-chain math calibration blocks
                      </span>
                    </div>
                  </div>
                ) : gachaResult ? (
                  <div className="space-y-2 animate-pop">
                    <div className="w-14 h-14 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm">
                      {gachaResult.icon}
                    </div>
                    <div>
                      <span className="text-[9px] bg-amber-500 text-slate-950 font-black font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                        {gachaResult.badge}
                      </span>
                      <h4 className="font-display font-black text-sm text-amber-300 uppercase tracking-tight mt-1">
                        {gachaResult.name}
                      </h4>
                      <p className="text-[10px] text-slate-300">
                        {gachaResult.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-405 rounded-full flex items-center justify-center mx-auto text-2xl">
                      🎁
                    </div>
                    <div>
                      <span className="text-xs text-indigo-305 font-bold block uppercase tracking-wider font-mono">
                        Roll Terminal Ready
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight block max-w-xs">
                        Press button below to execute cryptographic spin. Double
                        payouts guaranteed.
                      </span>
                    </div>
                  </div>
                )}

                {gachaError && (
                  <div className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900 p-2 rounded-xl animate-pop">
                    {gachaError}
                  </div>
                )}
              </div>

              <button
                onClick={handleRollGacha}
                disabled={isRollingGacha || user.gems < 120}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all border-b-4 flex items-center justify-center gap-2 cursor-pointer ${
                  isRollingGacha
                    ? "bg-indigo-950 text-indigo-700 border-indigo-900 cursor-not-allowed"
                    : user.gems < 120
                      ? "bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-60"
                      : "bg-indigo-500 hover:bg-indigo-400 text-white border-indigo-700 active:border-b-0 active:translate-y-0.5"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                Spin Machine (120 💎)
              </button>
            </div>

            {/* THE STRATEGIC POWER-UP SHOP DEPOT */}
            <div className="lg:col-span-12 bg-white border border-slate-200 rounded-[32px] p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                  ⚡ Tactical Booster Depot
                </span>
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                  Secure Live Quiz Power-Ups
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Trade your acquired Sublime Gems to resupply your operational
                  inventory stash! The rarer the gem used, the more high-powered
                  quiz boosters you manifest at once.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1.5">
                {/* Power-up item 1 */}
                <div className="bg-slate-50 border border-slate-200 hover:border-amber-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                  <div className="space-y-2 text-left mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">
                        50/50 Eliminator
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 font-mono">
                        Owned:{" "}
                        {user.unlockedItems?.filter(
                          (x) => x === "powerup_50_50",
                        ).length || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 min-h-[40px]">
                      Eliminates exactly two incorrect answers from standard
                      multiple choice quiz arrays.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_jade",
                          "powerup_50_50",
                          "50/50",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_jade")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                      <span>Pay 1 Jade (x1)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_sapphire",
                          "powerup_50_50",
                          "50/50",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_sapphire")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                      <span>Pay 1 Sapphire (x3)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_ruby",
                          "powerup_50_50",
                          "50/50",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_ruby")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Pay 1 Ruby (x7)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_obsidian",
                          "powerup_50_50",
                          "50/50",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_obsidian")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                      <span>Pay 1 Obsidian (x15)</span>
                    </button>
                  </div>
                </div>

                {/* Power-up item 2 */}
                <div className="bg-slate-50 border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                  <div className="space-y-2 text-left mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">
                        Aegis Second Life
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded border border-indigo-200 font-mono">
                        Owned:{" "}
                        {user.unlockedItems?.filter(
                          (x) => x === "powerup_extra_life",
                        ).length || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 min-h-[40px]">
                      Shield absorbs one faulty calculation entry error penalty
                      in active level quizzes.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_jade",
                          "powerup_extra_life",
                          "Extra Life",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_jade")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                      <span>Pay 1 Jade (x1)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_sapphire",
                          "powerup_extra_life",
                          "Extra Life",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_sapphire")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                      <span>Pay 1 Sapphire (x3)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_ruby",
                          "powerup_extra_life",
                          "Extra Life",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_ruby")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Pay 1 Ruby (x7)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_obsidian",
                          "powerup_extra_life",
                          "Extra Life",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_obsidian")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                      <span>Pay 1 Obsidian (x15)</span>
                    </button>
                  </div>
                </div>

                {/* Power-up item 3 */}
                <div className="bg-slate-50 border border-slate-200 hover:border-emerald-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                  <div className="space-y-2 text-left mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">
                        Temporal Hourglass
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 font-mono">
                        Owned:{" "}
                        {user.unlockedItems?.filter(
                          (x) => x === "powerup_extra_time",
                        ).length || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 min-h-[40px]">
                      Increments exam limits or cancels stress so you can
                      deliberate with ease.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_jade",
                          "powerup_extra_time",
                          "Extra Time",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_jade")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                      <span>Pay 1 Jade (x1)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_sapphire",
                          "powerup_extra_time",
                          "Extra Time",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_sapphire")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                      <span>Pay 1 Sapphire (x3)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_ruby",
                          "powerup_extra_time",
                          "Extra Time",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_ruby")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Pay 1 Ruby (x7)</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTradeGemForPowerup(
                          "trophy_gem_obsidian",
                          "powerup_extra_time",
                          "Extra Time",
                        )
                      }
                      disabled={
                        vaultLoading !== null ||
                        !user.unlockedItems?.includes("trophy_gem_obsidian")
                      }
                      className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50"
                    >
                      <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                      <span>Pay 1 Obsidian (x15)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE CERTIFICATE MODAL */}
          {showCertificateModal && (
            <div
              onClick={() => setShowCertificateModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-start overflow-y-auto z-[100] p-4 md:p-6 animate-fade-in"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col relative animate-pop text-left my-auto"
              >
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer z-10"
                  title="Close Certificate"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Certificate Sheet Display */}
                <div className="p-8 md:p-12 text-center bg-[#fdfcfa] border-8 border-double border-[#d4af37] m-4 rounded-2xl flex flex-col items-center justify-center space-y-6 relative select-none">
                  <div className="absolute top-4 left-4 text-[10px] text-stone-400 font-mono tracking-widest uppercase">
                    SECURE CRID: SIG-
                    {(user.uid || "anon").substring(4, 10).toUpperCase()}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xl font-serif font-black text-[#8c783c] tracking-widest uppercase block font-medium">
                      SIGMA ACADEMIC BOARD
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
                      curriculum calibration ledger validation
                    </span>
                  </div>

                  <div className="w-fit mx-auto border-b border-[#d4af37]/40 pb-2 mb-2">
                    <h4 className="font-serif font-medium text-2.5xl md:text-3xl text-stone-900 italic tracking-wide">
                      Certificate of Academic Excellence
                    </h4>
                  </div>

                  <div className="space-y-4 max-w-md mx-auto font-sans">
                    <p className="text-xs text-stone-600 tracking-wide">
                      This official document serves to verify the satisfactory
                      fulfillment of rigorous, graduate-level coursework models
                      in quantitative analyses. Scribed and credentialed unto:
                    </p>

                    <div className="py-2">
                      <h3 className="font-serif font-black text-2xl md:text-3xl text-[#1a2530] border-b-2 border-stone-800 w-fit mx-auto px-6 uppercase tracking-wider">
                        {user.username}
                      </h3>
                      <span className="text-[10px] text-stone-500 mt-1 block font-bold">
                        Registered Learner: {user.email}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      The aforementioned scholar has compiled perfect star
                      evaluations, maintained daily streak habits, and unlocked
                      math modeling tracks covering asset valuations,
                      double-entry financial accounting, and compounding
                      interest models.
                    </p>
                  </div>

                  {/* Gold seal stamp, signature, date */}
                  <div className="grid grid-cols-3 gap-4 items-center w-full pt-6 border-t border-stone-200">
                    <div className="text-left space-y-1">
                      <span className="text-[9px] text-stone-400 font-mono uppercase block">
                        DATED SECURED
                      </span>
                      <span className="text-xs font-mono font-semibold text-stone-800">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Gold Embossed Seal Vector */}
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-[#d4af37] flex items-center justify-center shadow-md relative border border-[#b29631]">
                        <div className="absolute inset-1 rounded-full border-2 border-dashed border-[#fdfcfa]/45"></div>
                        <Award className="w-8 h-8 text-neutral-900" />
                        <span className="absolute -bottom-1 bg-amber-900 text-white font-mono font-extrabold text-[8px] px-1 py-0.5 rounded tracking-widest uppercase">
                          VERIFIED
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[9px] text-stone-400 font-mono uppercase block">
                        SECURE SIGNATURE
                      </span>
                      <span className="text-xs font-serif italic font-semibold text-stone-800 tracking-wide block">
                        Σ. Bookkeeper
                      </span>
                      <span className="text-[8px] text-stone-400 font-mono uppercase block">
                        Syllabus Director
                      </span>
                    </div>
                  </div>

                  {/* Verification string */}
                  <div className="pt-4 text-center">
                    <span className="text-[8px] font-mono text-stone-400 leading-relaxed max-w-xs block mx-auto font-bold uppercase tracking-wider">
                      CERTIFIER LEDGER TRANSPORT HASH:
                      <br />
                      SHA-255: SIG-{generateHash(user.uid || "salt")}-
                      {generateHash(user.createdAt || "time")}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Print Verification Certificate
                  </button>
                </div>
              </div>
            </div>
          )}

          {user.tier === "scholar" && (
            <div className="pt-6 border-t border-slate-200 mt-10">
              <SponsorAdBanner placement="store" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
