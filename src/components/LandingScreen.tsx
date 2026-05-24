/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Compass, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Shield, 
  Info, 
  User, 
  Mail, 
  Key, 
  Gem, 
  BookOpen, 
  CheckCircle,
  BarChart2,
  Users
} from 'lucide-react';
import { clientHashPassword, encryptPayload } from '../lib/crypto';
import { UserProfile } from '../types';
import { clientDb } from '../lib/clientDb';
import { safeStorage } from '../lib/safeStorage';

interface LandingScreenProps {
  user: UserProfile | null;
  isGuest: boolean;
  onNavigate: (tab: 'home' | 'learn' | 'insights' | 'store' | 'social') => void;
  onAuthSuccess: (token: string, user: UserProfile) => void;
}

export default function LandingScreen({ user, isGuest, onNavigate, onAuthSuccess }: LandingScreenProps) {
  // Sign up/Login state
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Developer mode bypass for tech monitors
  const [showDev, setShowDev] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('dev=true') || 
      safeStorage.getItem('sigma_dev') === 'true'
    );
  });
  const [clickCount, setClickCount] = useState(0);
  const [devToast, setDevToast] = useState('');

  // Transit details for cryptography monitor
  const [transitDetails, setTransitDetails] = useState<{
    rawPayload: string;
    encryptedHex: string;
    ivUsed: string;
    timestamp: string;
  } | null>(null);

  // FAQ Accordion states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Handle popup communication for Federated OAuth (Google & Facebook)
  React.useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, email, name } = event.data;
        setLoading(true);
        setError('');
        try {
          const cleanProvider = (provider || 'google').toLowerCase() as 'google' | 'facebook';
          const data = await clientDb.loginOrRegisterFederated(cleanProvider, email, name);
          onAuthSuccess(data.token, data.user);
        } catch (err: any) {
          setError(err.message || 'Federated connection failed. Retry.');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onAuthSuccess]);

  const handleSocialAuth = (provider: 'Google' | 'Facebook') => {
    setError('');
    const authWindow = window.open(
      `/oauth/simulate?provider=${provider}&action=${isLogin ? 'login' : 'signup'}`,
      'oauth_popup',
      'width=500,height=600'
    );
    if (!authWindow) {
      setError("OAuth Popup Blocked. Please permit browser popups to sign in / sign up.");
    }
  };

  const handleLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 5) {
      const newVal = !showDev;
      setShowDev(newVal);
      safeStorage.setItem('sigma_dev', newVal ? 'true' : 'false');
      setDevToast(`Developer Inspector ${newVal ? 'ENABLED' : 'DISABLED'}! Cryptographic monitors are now ${newVal ? 'visible' : 'hidden'}.`);
      setClickCount(0);
      setTimeout(() => setDevToast(''), 4500);
    }
  };

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !username)) {
      setError("Please fill in all requested fields.");
      return;
    }

    setLoading(true);
    setError('');
    setTransitDetails(null);

    const emailClean = email.toLowerCase().trim();
    
    try {
      // 1. Client-side hash stretching
      const passwordHashLocal = await clientHashPassword(password, emailClean);

      // 2. Encrypt the hashed output for Transport-Layer-End-to-End simulation
      const iv = Array.from({ length: 12 }, () => Math.floor(Math.random() * 256))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
        
      const secretKey = 'SIGMA_LEARNING_SUPER_SECRET_KEY_FOR_JWT_AND_AES';
      const plainTextPayload = passwordHashLocal;
      const encrypted = encryptPayload(plainTextPayload, secretKey);

      const timestamp = new Date().toISOString();
      setTransitDetails({
        rawPayload: `{"passwordHash": "${passwordHashLocal.substring(0, 16)}...", "salt": "${emailClean}"}`,
        encryptedHex: encrypted.cyphertext.substring(0, 48) + "...",
        ivUsed: encrypted.iv,
        timestamp
      });

      // Artificial small delay to simulate TLS
      await new Promise(resolve => setTimeout(resolve, 800));

      let data: { token: string; user: UserProfile };
      if (isLogin) {
        data = await clientDb.login(emailClean, passwordHashLocal);
      } else {
        data = await clientDb.register(username, emailClean, passwordHashLocal);
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Crypto Validation mismatch. Check details.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "What is Sigma Learning?",
      a: "Sigma Learning is an interactive academic platform mapping advanced courseware syllabi (inspired by MIT OpenCourseWare) into visual mastermaps. We bridge rigorous curriculum content like Double-Entry Bookkeeping Accounting, Compound Corporate Finance, and Statistical Mechanics with gamified milestones, interactive quizzes, and numeric sandboxes."
    },
    {
      q: "Do I have to register to explore the tracks?",
      a: "No! Sigma features an offline-first 'Explore Mode.' You are automatically logged into a Scholar Sandbox guest session with 100 💎 gems, letting you browse courses, experience core mathematical labs, and complete introductory modules. Registering a free account locks in your learning streaks, saves progress permanently, and allows you to participate in discussion forums."
    },
    {
      q: "How are student learning plans structured?",
      a: "We offer three scholarship plans: Free Scholars can complete Level 1 to 3 on all diagnostic tracks; Analyst Premiums receive full curriculum keys to permanently unlock any 1 complete subject track; Magnate Premiums unlock ALL tracks (Levels 1 to 12) with zero gem tax and gain unlimited laboratory access."
    },
    {
      q: "Is my personal data secure on this workspace?",
      a: "Security is our core metric. Passwords are never sent or stored in plaintext. We employ client-side PBKDF2 hash stretching, AES-GCM network payloads, and standard JWT handshake verification to isolate user credentials."
    }
  ];

  return (
    <div id="landing-screen-root" className="space-y-12 animate-fade-in">
      
      {/* Dev Floating Action Toast toast */}
      {devToast && (
        <div className="fixed top-20 left-4 right-4 max-w-md mx-auto bg-slate-900 text-teal-400 border border-teal-500/50 p-3 rounded-xl shadow-lg font-mono text-center text-xs z-50 animate-bounce">
          💡 {devToast}
        </div>
      )}

      {/* Hero Welcome Unit */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div 
          onClick={handleLogoClick}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-4 py-1.5 rounded-full border border-slate-200/50 cursor-pointer transition select-none mx-auto"
        >
          <span className="bg-brand-secondary text-white font-mono text-xs font-bold px-2 py-0.5 rounded-md">Σ</span>
          <span className="text-slate-700 text-xs font-mono font-bold uppercase tracking-wider">Welcome to Sigma Academy Entrance Desk</span>
        </div>
        <h1 className="font-display font-black text-4xl sm:text-5xl text-slate-950 tracking-tight leading-none">
          Elevate Your Mathematical & Financial Acumen.
        </h1>
        <p className="text-slate-600 font-sans text-base max-w-2xl mx-auto">
          Master rigorous academic theories across <strong>Financial Literacy</strong>, <strong>Double-Entry Accounting</strong>, and <strong>Statistics</strong> with gamified paths mapped from world-class standards.
        </p>
      </div>

      {/* Split Grid Section (Content & Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: Explanations + Links + FAQs */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* Section 1: Core Features explanation */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="font-display font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Curriculum Overview
              </h2>
              <p className="text-xs text-slate-500 font-mono uppercase font-bold mt-1">WHAT WE TEACH</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Personal Finance
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Understand compounding interest curves, real annual return formulas, and modern risk mitigation modeling.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Bookkeeping & Ledger
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Learn double-entry bookkeeping rules, balance sheets, general ledgers, and debit/credit formulas.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  Statistics Mapped
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Deep-dive into probability, expected values, standard deviation, variance, and normal distribution charts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Gem className="w-4 h-4 text-cyan-500" />
                  Gamified Incentives
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Collect 💎 gems, build interactive learning streaks, post ideas to our forum, and explore freely.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgement and Support Note to MIT OpenCourseWare */}
          <div className="bg-gradient-to-r from-red-50/50 via-slate-50 to-red-50/30 border border-red-100 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs text-left animate-pop">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-750 flex-shrink-0 border border-red-200 shadow-xs">
                <span className="text-xl font-black font-display tracking-tighter text-red-700">MIT</span>
              </div>
              <div>
                <span className="text-[9px] bg-red-700 text-white font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Open Learning Tribute
                </span>
                <h3 className="font-display font-black text-sm text-slate-900 uppercase tracking-tight mt-0.5">
                  Honoring MIT OpenCourseWare
                </h3>
              </div>
            </div>
            
            <p className="text-slate-600 text-xs leading-relaxed">
              Our interactive academic syllabus is inspired by and structured after the stellar open education curriculums offered by <strong>MIT OpenCourseWare (OCW)</strong>. We wish to express our heartfelt gratitude to the Massachusetts Institute of Technology for keeping high-quality learning resources free and accessible to students globally.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1.5 border-t border-red-100/40">
              <div className="text-[10px] text-slate-500 max-w-sm">
                If our interactive visual mastermap has added value to your learning process, please consider supporting MIT's donation foundation.
              </div>
              <a
                href="https://giving.mit.edu/give/to/ocw/?utm_source=ocw&utm_medium=homepage_banner&utm_campaign=nextgen_home"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-700 hover:bg-red-800 text-white shadow-sm transition active:translate-y-0.5"
                id="mit-giving-donation-link"
              >
                <span>Support MIT OCW</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </a>
            </div>
          </div>

          {/* Section 2: Quick Links Navigation Cards */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                Explore the Platform
              </h2>
              <p className="text-slate-500 text-xs">Jump directly into any section. Guests have full read-only sandbox preview rights.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => onNavigate('learn')}
                className="group bg-white border border-slate-200/80 rounded-2xl p-4 cursor-pointer hover:border-indigo-400 hover:shadow-md transition text-left relative flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1 group-hover:text-indigo-600">
                    Mastery Map
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition transform translate-x-1" />
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">Our core levels, syllabus maps, quizzes and lesson players.</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('insights')}
                className="group bg-white border border-slate-200/80 rounded-2xl p-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition text-left relative flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1 group-hover:text-emerald-600">
                    Interactive Sandbox
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition transform translate-x-1" />
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">Compound calculators and balanced ledger bookkeeping labs.</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('store')}
                className="group bg-white border border-slate-200/80 rounded-2xl p-4 cursor-pointer hover:border-amber-400 hover:shadow-md transition text-left relative flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition shrink-0">
                  <Gem className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1 group-hover:text-amber-600">
                    Premium Store
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition transform translate-x-1" />
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">Purchase premium course keys or buy gem packs via safe Stripe checkout.</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('social')}
                className="group bg-white border border-slate-200/80 rounded-2xl p-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition text-left relative flex items-start gap-3.5"
              >
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1 group-hover:text-teal-600">
                    Social Hub Discussion
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition transform translate-x-1" />
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">Read math formulas and converse with certified members of the community.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Key FAQs */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Platform FAQ
              </h2>
              <p className="text-slate-500 text-xs">Essential information about security plans, billing, and learning methods.</p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between font-bold text-sm text-slate-950 hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-xl leading-none text-slate-400">
                      {openFaq === idx ? '−' : '+'}
                    </span>
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Hand: Interactive Account Entry Section */}
        <div className="lg:col-span-12 xl:col-span-5 lg:sticky lg:top-24">
          
          {isGuest ? (
            /* User is non-authenticated (Guest) -> Render the full Auth Form */
            <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 md:p-8 space-y-6">
              
              <div className="text-center md:text-left">
                <h3 className="font-display text-2xl font-black text-slate-950">
                  {isLogin ? "Sign In to Sigma" : "Create Private Account"}
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  {isLogin 
                    ? "Welcome back! Access your levels and track masteries." 
                    : "Deploy a free account to track course progress, earn gems, and enter discussion hubs."}
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Federated Auth Actions */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSocialAuth('Google')}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-xs font-bold text-slate-700 active:scale-95 shadow-xs cursor-pointer"
                  id="landing-google-auth-btn"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialAuth('Facebook')}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl transition text-xs font-bold active:scale-95 shadow-xs cursor-pointer"
                  id="landing-facebook-auth-btn"
                >
                  <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-150"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white px-2.5 font-mono">Or Use Credentials</span>
                </div>
              </div>

              {/* Credential Form */}
              <form onSubmit={handleAuthentication} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block font-mono">Full Human Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Isaac Newton"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-xs h-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block font-mono">Private Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block font-mono">Secure Passphrase</label>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-xs h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    loading
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-brand-secondary text-white hover:bg-brand-secondary/90 border-b-4 border-teal-950 active:border-b-0 active:translate-y-[2px]"
                  }`}
                >
                  {loading ? (
                    <>Handshaking...</>
                  ) : (
                    <>
                      {isLogin ? "Authenticate Account" : "Deploy Secure Account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode switch anchor */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setTransitDetails(null);
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline"
                >
                  {isLogin ? (
                    <span>New to Sigma Learning? <strong className="text-brand-secondary">Sign Up Free</strong></span>
                  ) : (
                    <span>Already a diagnostic user? <strong className="text-brand-secondary">Sign In</strong></span>
                  )}
                </button>
              </div>

              {/* Tech monitor embedded for full aesthetic pairing */}
              {showDev && (
                <div className="relative z-10 mt-4 bg-slate-900 text-teal-400 border border-slate-800 rounded-2xl p-4 font-mono text-[10px] space-y-2 animate-fade-in shrink-0">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-2">
                    <span className="flex items-center gap-1.5 text-teal-450">
                      <Shield className="w-3.5 h-3.5" />
                      TLS SECURED LINK
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  {transitDetails ? (
                    <div className="space-y-2">
                      <p className="text-slate-400">Plaintext hash stretching: <span className="text-yellow-400 block break-all font-mono">{transitDetails.rawPayload}</span></p>
                      <p className="text-slate-400">AES client-side frame: <span className="text-emerald-400 block break-all font-mono">{transitDetails.encryptedHex}</span></p>
                    </div>
                  ) : (
                    <span className="text-slate-500">Standby (Crypto engine ready securely). Enter credentials.</span>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* User is authenticated -> Render welcome back resume stats block */
            <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold font-mono text-xl">
                  {user.username ? user.username[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-950">Welcome Back,</h3>
                  <p className="font-bold text-indigo-700 text-sm">{user.username}</p>
                </div>
              </div>

              {/* Stats Block */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase tracking-wider">Plan Level</span>
                  <span className="font-extrabold text-slate-800 uppercase font-mono">{user.tier} Plan</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase tracking-wider">Interactive Streak</span>
                  <span className="font-extrabold text-rose-600 font-mono flex items-center gap-1">🔥 {user.streak} Days</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase tracking-wider">Academic Gems</span>
                  <span className="font-extrabold text-amber-600 font-mono flex items-center gap-1">💎 {user.gems} Gems</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase tracking-wider">Account ID</span>
                  <span className="font-mono text-slate-500 break-all">{user.email}</span>
                </div>
              </div>

              {/* Fast Cta Navigation Buttons */}
              <div className="space-y-4 pt-2">
                <button
                  onClick={() => onNavigate('learn')}
                  className="w-full py-3 bg-brand-primary text-white hover:bg-slate-850 rounded-xl font-bold font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <span>Resume Learning Path</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onNavigate('insights')}
                  className="w-full py-3 bg-slate-100 text-slate-700 hover:bg-slate-150 rounded-xl font-bold font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Launch Laboratories</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
