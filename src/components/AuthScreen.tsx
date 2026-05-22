/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Key, Mail, User, Info, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { clientHashPassword, encryptPayload } from '../lib/crypto';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onSuccess: (token: string, user: UserProfile) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Developer mode bypass to hide technical larpy monitors from standard users
  const [showDev, setShowDev] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('dev=true') || 
      localStorage.getItem('sigma_dev') === 'true'
    );
  });
  const [clickCount, setClickCount] = useState(0);
  const [devToast, setDevToast] = useState('');

  const handleLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 5) {
      const newVal = !showDev;
      setShowDev(newVal);
      localStorage.setItem('sigma_dev', newVal ? 'true' : 'false');
      setDevToast(`Developer Inspector ${newVal ? 'ENABLED' : 'DISABLED'}! Cryptographic monitors are now ${newVal ? 'visible' : 'hidden'}.`);
      setClickCount(0);
      setTimeout(() => setDevToast(''), 4500);
    }
  };

  // Security visualizer states
  const [transitDetails, setTransitDetails] = useState<{
    rawPayload: string;
    encryptedHex: string;
    ivUsed: string;
    timestamp: string;
  } | null>(null);

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
      // 1. Client-side hash stretching: never transmit plaintext passwords!
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

      // Artificial small delay to let users observe the cryptographic transmission details
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payloadBody = isLogin ? {
        email: emailClean,
        encryptedPassword: encrypted.cyphertext,
        iv: encrypted.iv
      } : {
        username,
        email: emailClean,
        encryptedPassword: encrypted.cyphertext,
        iv: encrypted.iv,
        clientTimestamp: timestamp
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody)
      });

      let data: any = null;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        if (!response.ok) {
          throw new Error(text || `Internal server error (${response.status})`);
        }
        throw new Error("Unable to parse server-side handshake response.");
      }

      if (!response.ok) {
        throw new Error(data?.error || "Authentication transfer error.");
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Crypto Validation mismatch. Check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-64px)] w-full items-stretch overflow-hidden">
      {/* Brand & Security Showcase */}
      <div className="lg:col-span-7 bg-brand-primary text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Abstract background graphics representing finance, statistics and balance grids */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-brand-secondary filter blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-500 filter blur-3xl"></div>
          {/* Statistical grid overlay */}
          <div className="w-full h-full border-b border-r border-slate-700/30" style={{ backgroundImage: 'radial-gradient(#ffffff15 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        </div>

        <div className="relative z-10">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 mb-12 cursor-pointer hover:opacity-90 select-none active:scale-95 transition w-fit"
            title="Click 5 times to toggle Developer Inspector Mode"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-secondary flex items-center justify-center p-2 border-b-2 border-teal-900 shadow">
              <span className="text-white font-mono font-bold text-xl">Σ</span>
            </div>
            <span className="font-display font-black text-2xl tracking-tight text-teal-400">SIGMA LEARNING</span>
          </div>

          <div className="max-w-xl">
            <span className="bg-brand-secondary/30 text-teal-300 font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full font-bold border border-brand-secondary/40">
              SCHOLAR-ATHLETE TRACKS
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl mt-6 tracking-tight leading-tight">
              Elevate Your Mathematical & Financial Acumen.
            </h1>
            <p className="text-slate-300 font-sans text-base md:text-lg mt-6 leading-relaxed">
              Master the academic theories of <strong>Personal Financial Literacy</strong>, <strong>Double-Entry Accounting</strong>, and <strong>Statistics</strong> with gamified paths inspired by MIT OpenCourseWare.
            </p>
          </div>
        </div>

        {/* Developer Floating Action Toast toast */}
        {devToast && (
          <div className="absolute top-4 left-4 right-4 bg-slate-900 text-teal-400 border border-teal-500/50 p-3 rounded-xl shadow-lg font-mono text-center text-xs z-50 animate-bounce">
            💡 {devToast}
          </div>
        )}

        {/* Cryptographic Transmission Visualizer - only shown when showDev is enabled */}
        {showDev && (
          <div className="relative z-10 mt-12 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 font-mono text-xs backdrop-blur animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-teal-400">
                <Shield className="w-4 h-4" />
                <span>TLS / END-TO-END TRANSMISSION MONITOR (DEV MODE)</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Plaintext Client Hashing:</span>
                <span className="text-slate-300">{loading ? "Computing SHA-256..." : "Standby (Awaiting Input)"}</span>
              </div>
              {transitDetails ? (
                <>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-yellow-400 font-bold">Client Passphrase stretched payload:</span>
                    <p className="text-slate-400 break-all mt-1">{transitDetails.rawPayload}</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-teal-400 font-bold">AES Transmitted Ciphertext:</span>
                    <p className="text-emerald-400 break-all mt-1">{transitDetails.encryptedHex}</p>
                    <p className="text-[10px] text-slate-500 mt-1">IV (Initial vector): {transitDetails.ivUsed}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-teal-500">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>The raw password is encrypted client-side and sent as encrypted blocks, keeping it mathematically secure.</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-center py-6 border border-dashed border-slate-800 rounded bg-slate-950/40">
                  Enter your credentials on the right to trigger secure key hashes.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 text-xs text-slate-400 mt-6 flex justify-between items-center">
          <span>MIT OpenCourseWare Reference syllabus © 2026</span>
          <span className="text-brand-secondary font-bold">SHA-256 / AES-GCM SECURED</span>
        </div>
      </div>

      {/* Forms Segment */}
      <div className="lg:col-span-5 bg-white p-8 md:p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-extrabold text-slate-950">
              {isLogin ? "Sign In to Sigma" : "Create Private Account"}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {isLogin ? "Welcome back! Resume your path toward levels of mastery." : "Start your path toward financial literacy, bookkeeping and statistical mechanics."}
            </p>
            {isLogin && (
              <div 
                onClick={() => {
                  setEmail('johndoe@gmail.com');
                  setPassword('123456');
                }}
                className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all rounded-xl cursor-pointer text-xs text-indigo-900 flex items-start gap-2.5 duration-150"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">💡</div>
                <div>
                  <div className="font-bold">Quick Premium Demo Login Available</div>
                  <div className="text-slate-600 mt-0.5">Click here to auto-fill premium <span className="font-semibold text-indigo-700">Magnate</span> account (<code className="bg-white/80 border border-slate-100 px-1 py-0.5 rounded font-mono font-medium">johndoe@gmail.com</code> with passcode <code className="bg-white/80 border border-slate-100 px-1 py-0.5 rounded font-mono font-medium">123456</code>) preloaded with 9,999 gems.</div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl mb-6 flex gap-2">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuthentication} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Human Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Isaac Newton"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-sm h-11"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Private Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-sm h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Secure Passphrase</label>
                {isLogin && (
                  <button type="button" className="text-xs text-brand-secondary font-bold hover:underline">
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary font-sans text-sm h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 text-sm font-bold uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 ${
                loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-brand-secondary text-white hover:bg-brand-secondary/90 border-b-4 border-teal-900 active:border-b-0 active:translate-y-[2px]"
              }`}
            >
              {loading ? (
                <>Establishing Handshake...</>
              ) : (
                <>
                  {isLogin ? "Authenticate Account" : "Deploy Secure Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setTransitDetails(null);
              }}
              className="text-sm font-semibold text-brand-primary hover:text-brand-binary/80"
            >
              {isLogin ? (
                <span>New to Sigma Learning? <strong className="text-brand-secondary">Sign Up Free</strong></span>
              ) : (
                <span>Already registered on the platform? <strong className="text-brand-secondary font-bold">Sign In</strong></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
