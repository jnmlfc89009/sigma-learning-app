/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, Check, Flame, ShieldCheck, Gem, AlertCircle, RefreshCw, Lock, X, Award, Heart } from 'lucide-react';
import { UserProfile } from '../types';

interface StoreScreenProps {
  user: UserProfile;
  onUpgrade: (tier: 'scholar' | 'analyst' | 'magnate', billingCycle: 'monthly' | 'annual') => Promise<void>;
  onBuyItem: (itemId: string, price: number, itemType: string, itemValue?: string) => Promise<void>;
  onPurchaseGems: (packId: string, gemAmount: number, price: number) => Promise<void>;
}

export default function StoreScreen({ user, onUpgrade, onBuyItem, onPurchaseGems }: StoreScreenProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [bazaarError, setBazaarError] = useState('');
  const [bazaarSuccess, setBazaarSuccess] = useState('');
  const [bazaarLoading, setBazaarLoading] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState('');
  const [purchaseError, setPurchaseError] = useState('');

  const gemPacks = [
    {
      id: "novice_satchel",
      name: "Scholar Pocket Satchel",
      gemsAmount: 150,
      price: 1.99,
      badge: "Pocket Top-Up",
      bonus: "Basic Study Fuel"
    },
    {
      id: "analyst_stash",
      name: "Analyst Treasury Stash",
      gemsAmount: 550,
      price: 4.99,
      badge: "Best Value",
      bonus: "Includes 50 bonus Gems!"
    },
    {
      id: "magnate_vault",
      name: "Magnate Sovereign Vault",
      gemsAmount: 1300,
      price: 9.99,
      badge: "High Volumes",
      bonus: "Includes 300 bonus Gems!"
    },
    {
      id: "sovereign_chest",
      name: "Endowment Capital Chest",
      gemsAmount: 3200,
      price: 19.99,
      badge: "Institutional",
      bonus: "Includes 1200 bonus Gems!"
    }
  ];

  const handlePurchaseGemsClick = async (pack: typeof gemPacks[0]) => {
    setPurchaseLoading(pack.id);
    setPurchaseSuccess('');
    setPurchaseError('');
    try {
      await onPurchaseGems(pack.id, pack.gemsAmount, pack.price);
      setPurchaseSuccess(`💳 Payment Verified! Enhanced your academic balance by +${pack.gemsAmount} 💎.`);
      
      // Play ascending cash register / coin sounds
      if (typeof window !== 'undefined') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(f, now + i * 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(0.06, now + i * 0.05 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.35);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.4);
        });
      }
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
      description: "Display the legendary gold title 🎖️ 'SOVEREIGN LEDGER LORD' next to your avatar across all learning tabs.",
      price: 300,
      itemType: "title",
      itemValue: "Sovereign Ledger Lord",
      badge: "Prestige Accent"
    },
    {
      id: "title_mit_expert",
      name: "Title Flair: MIT Syllabus Scholar",
      description: "Adorn your profile header with the distinguished amber 🎖️ 'MIT SYLLABUS SCHOLAR' badge.",
      price: 400,
      itemType: "title",
      itemValue: "MIT Syllabus Scholar",
      badge: "Syllabus Champion"
    },
    {
      id: "charity_sponsor",
      name: "Simulated Scholar Peer Support",
      description: "Spend gems to sponsor simulated free-tier Scholar students. Grants you simulated tax write-offs and dynamic patron certificates.",
      price: 250,
      itemType: "sponsor",
      itemValue: "sponsor",
      badge: "Philanthropy"
    },
    {
      id: "ocw_certificate",
      name: "Dynamic MIT Syllabus Certificate",
      description: "Generate a dynamically verifiable certificate of academic mastery featuring your live stats and validation protocols.",
      price: 500,
      itemType: "certificate",
      itemValue: "certificate",
      badge: "Printable Diploma"
    }
  ];

  const handleBuyItemClick = async (item: typeof bazaarItems[0]) => {
    if (user.tier === 'scholar') {
      setBazaarError("⚠️ Gem Bazaar privileges are strictly reserved for premium Analyst & Magnate scholar levels!");
      return;
    }
    if (user.gems < item.price) {
      setBazaarError(`⚠️ Insufficient Gems. Unlocking '${item.name}' costs ${item.price} 💎 but you only have ${user.gems} 💎.`);
      return;
    }

    setBazaarLoading(item.id);
    setBazaarError('');
    setBazaarSuccess('');

    try {
      await onBuyItem(item.id, item.price, item.itemType, item.itemValue);
      setBazaarSuccess(`🎉 Successfully unlocked ${item.name}! Applied changes to your live profile ledger.`);
      
      // Play a lovely high bell sound
      if (typeof window !== 'undefined') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    return Math.abs(hash).toString(16).padEnd(8, "f").substring(0, 8).toUpperCase();
  };

  const plans = [
    {
      id: "scholar" as const,
      name: "SCHOLAR",
      color: "from-slate-400 to-slate-600",
      priceMonthly: 0,
      priceAnnual: 0,
      features: [
        "Learn core tracks up to Level 3",
        "Clamped Compound Wealth APY & Horizons",
        "Locked Booking Ledger & Normal Curve labs",
        "Ad-supported framework banner units",
        "Standard progression speeds"
      ],
      cta: "Current Tier",
      popular: false,
      gemsCredit: 0
    },
    {
      id: "analyst" as const,
      name: "ANALYST GOLD",
      color: "from-teal-600 to-emerald-600",
      priceMonthly: 8.99,
      priceAnnual: 5.99,
      features: [
        "Select ONE Course to study Level 1-12 in full",
        "Spend 100 💎 to unlock levels in subsidiary courses",
        "Full, unlimited access to Math Sandbox labs",
        "Instant 500 💎 premium Gems credit",
        "Ad-free curriculum environment",
        "Basic Certificate of Financial Literacy"
      ],
      cta: "Upgrade to Analyst",
      popular: true,
      gemsCredit: 500
    },
    {
      id: "magnate" as const,
      name: "MAGNATE PRO",
      color: "from-brand-primary to-indigo-950",
      priceMonthly: 19.99,
      priceAnnual: 12.99,
      features: [
        "Unlock ALL courses 1-12 completely (No gem walls)",
        "Unlocks Daily Applied Mathematics track",
        "Full, unlimited access to all Math Sandbox labs",
        "Instant 2,000 💎 premium Gems credit",
        "MIT OCW syllabus verified exam logs",
        "Priority executive specialist support"
      ],
      cta: "Upgrade to Magnate",
      popular: false,
      gemsCredit: 2000
    }
  ];

  const handleUpgradeClick = async (planId: 'scholar' | 'analyst' | 'magnate') => {
    if (planId === user.tier) return;
    setLoadingTier(planId);
    setSuccessMsg('');
    try {
      await onUpgrade(planId, billingCycle);
      setSuccessMsg(`Account successfully upgraded to ${planId.toUpperCase()}! Your premium balance has been updated.`);
      
      // Attempt play chime
      if (typeof window !== 'undefined') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = f;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.5);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.6);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div id="store-screen-container" className="space-y-10 animate-pop max-w-5xl mx-auto pb-12">
      {/* Monetization / Playstore Header */}
      <div className="text-center space-y-3">
        <span className="bg-brand-secondary/15 text-brand-secondary text-xs uppercase font-mono font-bold px-3 py-1.5 rounded-full border border-brand-secondary/20">
          Android Playstore & Appstore Monetization Blueprint
        </span>
        <h2 className="font-display font-black text-3xl md:text-4xl text-slate-950 tracking-tight">
          Select Your Academic Scholarship Level
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto font-sans text-sm md:text-base">
          Our flexible SaaS structure unlocks premium certification logs and boosts gems to maximize progression. Toggle billing tiers to review dynamic subscription rate configurations.
        </p>

        {/* Dynamic Toggle Billing Term (replicates screenshot 1 toggle style) */}
        <div className="flex items-center justify-center gap-3 pt-6">
          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? "text-slate-900" : "text-slate-400"}`}>Monthly Rate</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="text-slate-700 hover:text-slate-950 transition-transform h-8"
          >
            {billingCycle === 'monthly' ? (
              <ToggleLeft className="w-11 h-11 text-slate-300" />
            ) : (
              <ToggleRight className="w-11 h-11 text-[#006a61]" />
            )}
          </button>
          <span className={`text-sm font-bold ${billingCycle === 'annual' ? "text-[#006a61]" : "text-slate-400"}`}>
            Billed Annually <span className="text-[10px] bg-teal-100 text-[#006f66] px-1.5 py-0.5 rounded ml-1">SAVE 33%</span>
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 font-sans text-sm md:text-base shadow-sm">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid containing Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
        {plans.map((p) => {
          const isCurrent = user.tier === p.id;
          const price = billingCycle === 'monthly' ? p.priceMonthly : p.priceAnnual;
          const formattedPrice = price === 0 ? "FREE" : `$${price.toFixed(2)}`;
          const periodText = price === 0 ? "" : "/month";

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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{p.name}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-display font-black text-3xl md:text-4xl text-slate-900 leading-none">{formattedPrice}</span>
                  {periodText && <span className="text-xs text-slate-400 font-bold">{periodText}</span>}
                </div>
                {p.priceAnnual > 0 && billingCycle === 'annual' && (
                  <span className="text-[10px] font-mono text-emerald-600 block bg-emerald-50 px-2 py-0.5 rounded w-fit italic">
                    Billed annually at ${(price * 12).toFixed(2)}/yr
                  </span>
                )}

                {p.gemsCredit > 0 && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 text-xs text-yellow-800 font-semibold px-2.5 py-1.5 rounded-lg border border-yellow-200 w-fit">
                    <Gem className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Includes {p.gemsCredit} Premium Gems!</span>
                  </div>
                )}

                <p className="border-b border-slate-100 pb-4"></p>

                {/* Features Checklist */}
                <ul className="space-y-3 pt-2">
                  {p.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-start gap-2.5 text-xs text-slate-600 font-sans">
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
                      ? "bg-indigo-600 text-white border-indigo-900 hover:bg-indigo-700 active:border-b-0 active:translate-y-1"
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
      <div id="gem-purchase-depot-section" className="space-y-6 pt-10 border-t border-slate-200 mt-10 text-left">
        <div className="space-y-1">
          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
            💳 Premium Gem Depositor
          </span>
          <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">
            Purchase Academic Progression Gems
          </h3>
          <p className="text-slate-500 text-xs font-sans max-w-xl">
            Acquire extra gems instantly to bypass quiz walls, speed-unlock curriculum levels, sponsored simulation peers, or secure exclusive digital certificates.
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
                    <Gem className="w-6 h-6 text-amber-500 fill-amber-500 animate-pulse" />
                  </div>
                  <h4 className="font-display font-black text-sm text-slate-900 uppercase tracking-tight block">
                    {pack.name}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-black text-lg text-slate-900">+{pack.gemsAmount}</span>
                    <span className="text-amber-500 font-bold text-xs uppercase">💎</span>
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
      <div id="gem-bazaar-section" className="space-y-6 pt-10 border-t border-slate-200 mt-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
              💎 Academic Gem Boutique
            </span>
            <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Pre-Eminent Gem Exchange & Bazaar
            </h3>
            <p className="text-slate-500 text-xs font-sans max-w-xl">
              Turn your accrued academic capital into permanent achievements and credentials. Premium Analyst & Magnate scholars enjoy full trade licenses.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl border-b-2 border-slate-950 shadow-sm shrink-0">
            <Gem className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider">Your Balance: {user.gems} 💎</span>
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
            const isScholar = user.tier === 'scholar';

            return (
              <div 
                key={item.id} 
                className={`p-5 rounded-3xl border text-left flex flex-col justify-between gap-4 transition-all ${
                  hasPurchased && item.id !== 'charity_sponsor'
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
                      <Gem className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{item.price}</span>
                    </div>
                  </div>

                  <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-tight block">
                    {item.name}
                  </h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {item.description}
                  </p>

                  {item.id === 'charity_sponsor' && (user.sponsoredCount || 0) > 0 && (
                    <div className="pt-1.5">
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                        💖 Supported Peers: {user.sponsoredCount} simulated students
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {hasPurchased && item.id === 'ocw_certificate' ? (
                    <button
                      onClick={() => setShowCertificateModal(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border-b-2 border-indigo-900 shadow-sm"
                    >
                      <Award className="w-3.5 h-3.5" />
                      View Verification Document
                    </button>
                  ) : hasPurchased && item.id !== 'charity_sponsor' ? (
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

      {/* INTERACTIVE CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative animate-pop text-left">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Sheet Display */}
            <div className="p-8 md:p-12 text-center bg-[#fdfcfa] border-8 border-double border-[#d4af37] m-4 rounded-2xl flex flex-col items-center justify-center space-y-6 relative select-none">
              <div className="absolute top-4 left-4 text-[10px] text-stone-400 font-mono tracking-widest uppercase">
                SECURE CRID: SIG-{(user.uid || "anon").substring(4, 10).toUpperCase()}
              </div>

              <div className="space-y-2">
                <span className="text-xl font-serif font-black text-[#8c783c] tracking-widest uppercase block">
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

              <div className="space-y-4 max-w-md mx-auto">
                <p className="text-xs text-stone-600 font-sans tracking-wide">
                  This official document serves to verify the satisfactory fulfillment of rigorous, graduate-level coursework models in quantitative analyses. Scribed and credentialed unto:
                </p>

                <div className="py-2">
                  <h3 className="font-serif font-black text-2xl md:text-3xl text-[#1a2530] border-b-2 border-stone-800 w-fit mx-auto px-6 uppercase tracking-wider">
                    {user.username}
                  </h3>
                  <span className="text-[10px] text-stone-500 font-sans mt-1 block font-bold">
                    Registered Learner: {user.email}
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                  The aforementioned scholar has compiled perfect star evaluations, maintained daily streak habits, and unlocked math modeling tracks covering asset valuations, double-entry financial accounting, and compounding interest models.
                </p>
              </div>

              {/* Gold seal stamp, signature, date */}
              <div className="grid grid-cols-3 gap-4 items-center w-full pt-6 border-t border-stone-200">
                <div className="text-left space-y-1">
                  <span className="text-[9px] text-stone-400 font-mono uppercase block">DATED SECURED</span>
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
                  <span className="text-[9px] text-stone-400 font-mono uppercase block">SECURE SIGNATURE</span>
                  <span className="text-xs font-serif italic font-semibold text-stone-800 tracking-wide block">
                    Σ. Bookkeeper
                  </span>
                  <span className="text-[8px] text-stone-400 font-mono uppercase block">Syllabus Director</span>
                </div>
              </div>

              {/* Verification string */}
              <div className="pt-4 text-center">
                <span className="text-[8px] font-mono text-stone-400 leading-relaxed max-w-xs block mx-auto font-bold uppercase tracking-wider">
                  CERTIFIER LEDGER TRANSPORT HASH:<br />
                  SHA-255: SIG-{generateHash(user.uid || "salt")}-{generateHash(user.createdAt || "time")}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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

      {/* Play-Store / Admob Sandbox presentation (matches requirement of monetization display) */}
      {user.tier === 'scholar' && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-700 font-mono text-xs flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
          <div className="space-y-1 max-w-xl text-left">
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
              <AlertCircle className="w-4 h-4 animate-bounce" />
              <span>GOOGLE ADMOB SANDBOX ACTIVATED</span>
            </div>
            <p className="text-slate-400">
              You are currently on the ad-supported **Scholar** tier. Ad banner scripts are dynamically registered to stream mock earnings back to Android marketplace dashboards. Upgrade to block ad scripts.
            </p>
          </div>
          <div className="bg-slate-950 p-3 border border-slate-800 rounded-lg text-rose-400 text-center flex-shrink-0 w-full md:w-auto font-bold uppercase tracking-widest border-dashed">
            [ SIMULATED AD BANNER BLOCK ]
          </div>
        </div>
      )}
    </div>
  );
}
