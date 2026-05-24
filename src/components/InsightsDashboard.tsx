/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Percent, Plus, Trash2, ArrowRightLeft, Database, Sparkles, TrendingUp, Lock, Award } from 'lucide-react';
import { UserProfile } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import SponsorAdBanner from './SponsorAdBanner';

interface InsightsDashboardProps {
  user: UserProfile;
  onNavigateToStore?: () => void;
}

export default function InsightsDashboard({ user, onNavigateToStore }: InsightsDashboardProps) {
  const isScholar = user.tier === 'scholar';

  // --- 1. State for Accounting T-Ledger Simulator ---
  const [ledgerEntries, setLedgerEntries] = useState<Array<{
    id: string;
    description: string;
    type: 'debit' | 'credit';
    account: 'cash' | 'equipment' | 'loans' | 'equity';
    amount: number;
    created_at?: string;
  }>>([
    { id: '1', description: 'Starting Capital Deposit', type: 'debit', account: 'cash', amount: 10000 },
    { id: '2', description: 'Purchase study devices', type: 'debit', account: 'equipment', amount: 3000 },
    { id: '3', description: 'SBA loan received', type: 'credit', account: 'loans', amount: 5000 },
    { id: '4', description: 'Partner contribution', type: 'credit', account: 'equity', amount: 12000 }
  ]);
  const [leDesc, setLeDesc] = useState('');
  const [leAccount, setLeAccount] = useState<'cash' | 'equipment' | 'loans' | 'equity'>('cash');
  const [leType, setLeType] = useState<'debit' | 'credit'>('debit');
  const [leAmount, setLeAmount] = useState('1500');

  // Supabase client instance state
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [dbSyncStatus, setDbSyncStatus] = useState<'connecting' | 'synced' | 'fallback'>('connecting');

  useEffect(() => {
    let activeChannel: any = null;

    const initSupabase = async () => {
      const client = await getSupabaseClient();
      if (!client) {
        console.warn("Supabase client not initialized. Falling back to local in-memory store.");
        setDbSyncStatus('fallback');
        return;
      }

      setSupabaseClient(client);

      try {
        // Fetch current entries
        const { data, error } = await client
          .from('entries')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn("Supabase fetch failed (table/columns may not exist yet). Gracefully falling back:", error.message);
          setDbSyncStatus('fallback');
        } else {
          setDbSyncStatus('synced');
          if (data && data.length > 0) {
            setLedgerEntries(data.map((r: any) => ({
              id: String(r.id),
              description: r.description || '',
              type: r.type || 'debit',
              account: r.account || 'cash',
              amount: Number(r.amount || 0),
              created_at: r.created_at
            })));
          } else {
            // Database is empty, pre-populate table with initial demo seed entries
            const initialDemo = [
              { description: 'Starting Capital Deposit', type: 'debit', account: 'cash', amount: 10000 },
              { description: 'Purchase study devices', type: 'debit', account: 'equipment', amount: 3000 },
              { description: 'SBA loan received', type: 'credit', account: 'loans', amount: 5000 },
              { description: 'Partner contribution', type: 'credit', account: 'equity', amount: 12000 }
            ];
            const { error: seedError, data: seededData } = await client
              .from('entries')
              .insert(initialDemo)
              .select();

            if (seedError) {
              console.warn("Failed to seed initial entries, falling back to local memory seed list:", seedError.message);
            } else if (seededData && seededData.length > 0) {
              setLedgerEntries(seededData.map((r: any) => ({
                id: String(r.id),
                description: r.description,
                type: r.type,
                account: r.account,
                amount: Number(r.amount),
                created_at: r.created_at
              })));
            }
          }
        }

        // Subscribe to live Realtime database transactions with dynamic channel identification to bypass client-side channel caching collisions
        const randomSubId = Math.random().toString(36).substring(2, 11);
        activeChannel = client
          .channel(`public_entries_sub_${randomSubId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'entries' },
            (payload: any) => {
              console.log("Real-time DB Broadcast Received:", payload);
              if (payload.eventType === 'INSERT') {
                const r = payload.new;
                const newEntry = {
                  id: String(r.id),
                  description: r.description || '',
                  type: r.type || 'debit',
                  account: r.account || 'cash',
                  amount: Number(r.amount || 0),
                  created_at: r.created_at
                };
                setLedgerEntries((prev) => {
                  if (prev.some((e) => e.id === newEntry.id)) return prev;
                  return [...prev, newEntry];
                });
              } else if (payload.eventType === 'DELETE') {
                const oldId = payload.old?.id;
                if (oldId) {
                  setLedgerEntries((prev) => prev.filter((e) => e.id !== String(oldId)));
                }
              } else if (payload.eventType === 'UPDATE') {
                const r = payload.new;
                const updatedEntry = {
                  id: String(r.id),
                  description: r.description || '',
                  type: r.type || 'debit',
                  account: r.account || 'cash',
                  amount: Number(r.amount || 0),
                  created_at: r.created_at
                };
                setLedgerEntries((prev) => prev.map((e) => e.id === updatedEntry.id ? updatedEntry : e));
              }
            }
          )
          .subscribe();

      } catch (err: any) {
        console.error("Exception synchronizing with Supabase database:", err);
        setDbSyncStatus('fallback');
      }
    };

    initSupabase();

    return () => {
      if (activeChannel && supabaseClient) {
        supabaseClient.removeChannel(activeChannel);
      }
    };
  }, [supabaseClient]);

  // --- 2. State for Compound Interest Simulator ---
  const [rawPrincipal, setRawPrincipal] = useState(5000);
  const [rawApy, setRawApy] = useState(8); // %
  const [rawYears, setRawYears] = useState(15);

  // Apply strict clamps for Scholar tier
  const principal = isScholar ? Math.min(rawPrincipal, 10000) : rawPrincipal;
  const apy = isScholar ? Math.min(rawApy, 6) : rawApy;
  const years = isScholar ? Math.min(rawYears, 10) : rawYears;

  // --- 3. State for Gaussian Bell Curve Simulator (Statistics) ---
  const [mean, setMean] = useState(100);
  const [stdDev, setStdDev] = useState(15);

  // --- Accounting Ledger functions ---
  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isScholar) return; // Guard
    const amt = parseFloat(leAmount);
    if (!leDesc || isNaN(amt) || amt <= 0) return;

    const payloadObj = {
      description: leDesc,
      type: leType,
      account: leAccount,
      amount: amt
    };

    let savedLocally = false;

    if (supabaseClient && dbSyncStatus === 'synced') {
      try {
        const { data, error } = await supabaseClient
          .from('entries')
          .insert([payloadObj])
          .select();

        if (error) {
          console.warn("Supabase ledger insert failed. Fallback to local state persistence.", error.message);
          savedLocally = true;
        } else if (data && data.length > 0) {
          const returned = data[0];
          const newEntry = {
            id: String(returned.id),
            description: returned.description,
            type: returned.type,
            account: returned.account,
            amount: Number(returned.amount),
            created_at: returned.created_at
          };
          setLedgerEntries((prev) => {
            if (prev.some((e) => e.id === newEntry.id)) return prev;
            return [...prev, newEntry];
          });
        } else {
          savedLocally = true;
        }
      } catch (ex) {
        console.warn("Exception during Supabase insert. Applying local-only state:", ex);
        savedLocally = true;
      }
    } else {
      savedLocally = true;
    }

    if (savedLocally) {
      setLedgerEntries([
        ...ledgerEntries,
        {
          id: Math.random().toString(),
          ...payloadObj
        }
      ]);
    }

    setLeDesc('');
    setLeAmount('');
  };

  const handleDeleteLedger = async (id: string) => {
    if (isScholar) return; // Guard

    let deletedLocally = false;

    if (supabaseClient && dbSyncStatus === 'synced' && !id.startsWith('0.')) {
      try {
        const { error } = await supabaseClient
          .from('entries')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn("Supabase record deletion failed. Removing locally:", error.message);
          deletedLocally = true;
        } else {
          setLedgerEntries((prev) => prev.filter((e) => e.id !== id));
        }
      } catch (ex) {
        console.warn("Exception during database query deletion. Removing locally:", ex);
        deletedLocally = true;
      }
    } else {
      deletedLocally = true;
    }

    if (deletedLocally) {
      setLedgerEntries(ledgerEntries.filter(e => e.id !== id));
    }
  };

  // Compute balance indicators
  const totalDebits = ledgerEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const totalCredits = ledgerEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
  const isEquationBalanced = totalDebits === totalCredits;

  // --- Mathematical calculations for Compound Interest exponential path ---
  const compoundPoints: Array<{ year: number; amount: number }> = [];
  for (let i = 0; i <= years; i++) {
    const amt = principal * Math.pow(1 + apy / 100, i);
    compoundPoints.push({ year: i, amount: Math.round(amt) });
  }

  // Find max for scaling
  const maxCompounded = compoundPoints[compoundPoints.length - 1]?.amount || principal;

  // --- Statistics Normal distribution curve generator (Gaussian) ---
  const bellPoints: Array<{ x: number; y: number }> = [];
  const minX = mean - 4 * stdDev;
  const maxX = mean + 4 * stdDev;
  const steps = 60;
  const stepSize = (maxX - minX) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = minX + i * stepSize;
    const expTerm = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * expTerm;
    bellPoints.push({ x, y });
  }

  const maxY = 1 / (stdDev * Math.sqrt(2 * Math.PI));

  return (
    <div id="insights-dashboard-main" className="space-y-12 animate-pop pb-12">
      {/* Upper Title segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight">Interactive Mathematical Laboratories</h2>
          <p className="text-slate-500 font-sans text-sm mt-1">
            Real-time simulations of core accounting formulas, compounding vectors, and spatial distribution curves.
          </p>
        </div>
      </div>

      {isScholar && (
        <SponsorAdBanner 
          onNavigateToStore={onNavigateToStore} 
          placement="insights" 
        />
      )}

      {/* BLOCK 1: MIT COMPREHENSIVE PERSONAL FINANCE - EXPONENTIAL COMPOUND INTEREST CURVE */}
      <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 shadow-sm relative">
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-indigo-700">
            <TrendingUp className="w-5 h-5" />
            <span className="font-mono text-xs uppercase tracking-widest font-extrabold">FINANCE • COMPOUND ACCELERATOR</span>
          </div>

          <h3 className="font-display font-extrabold text-2xl text-slate-950">Compound Wealth Accelerator</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Adjust the slider components to observe the parabolic trajectory of exponential compounding compared to linear deposits. As APY increases, the geometric gradient yields larger returns in the secondary phases.
          </p>

          {isScholar && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-850 text-xs font-sans leading-relaxed">
              <strong>⚠️ Free Account Simulation Clamp:</strong> Principal is capped at $10k, APY 6%, and horizon duration is capped at 10 years. Upgrade to Analyst or Magnate to unlock the full exponential scale!
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Input sliders */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Initial Deposit</span>
                <span className="font-mono text-brand-secondary text-sm">${principal.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max={isScholar ? "10000" : "50000"}
                step="500"
                value={rawPrincipal}
                onChange={(e) => setRawPrincipal(parseInt(e.target.value))}
                className="w-full accent-brand-secondary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Annual Percentage Yield (APY)</span>
                <span className="font-mono text-brand-secondary text-sm">{apy}%</span>
              </div>
              <input
                type="range"
                min="1"
                max={isScholar ? "6" : "20"}
                step="1"
                value={rawApy}
                onChange={(e) => setRawApy(parseInt(e.target.value))}
                className="w-full accent-brand-secondary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Horizon (Years)</span>
                <span className="font-mono text-brand-secondary text-sm">{years} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max={isScholar ? "10" : "40"}
                step="1"
                value={rawYears}
                onChange={(e) => setRawYears(parseInt(e.target.value))}
                className="w-full accent-brand-secondary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Compound Chart representation */}
        <div className="lg:col-span-7 flex flex-col justify-center bg-slate-950 rounded-2xl p-6 border-b-4 border-slate-900 relative">
          <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500">
            <span>Projection Apex: ${maxCompounded.toLocaleString()}</span>
          </div>

          <div className="w-full h-64 md:h-80 select-none">
            <svg viewBox="0 0 500 300" className="w-full h-full overflow-visible">
              {/* Gridlines */}
              <line x1="40" y1="260" x2="480" y2="260" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="40" y1="40" x2="480" y2="40" stroke="#0f172a" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="40" y1="150" x2="480" y2="150" stroke="#0f172a" strokeWidth="0.8" strokeDasharray="3 3" />

              {/* Shaded Area underneath Compound path */}
              {compoundPoints.length > 0 && (
                <path
                  d={`M 40 260 ${compoundPoints.map((pt, i) => {
                    const xCoord = 40 + (pt.year / years) * 440;
                    const yCoord = 260 - (pt.amount / maxCompounded) * 220;
                    return `L ${xCoord} ${yCoord}`;
                  }).join(' ')} L 480 260 Z`}
                  fill="url(#indigoGrad)"
                  opacity="0.2"
                />
              )}

              {/* Shaded Area for simple non-compounding principal linear */}
              <line x1="40" y1={260 - (principal / maxCompounded) * 220} x2="480" y2={260 - (principal / maxCompounded) * 220} stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Compound curve line */}
              {compoundPoints.length > 0 && (
                <path
                  d={compoundPoints.map((pt, i) => {
                    const xCoord = 40 + (pt.year / years) * 440;
                    const yCoord = 260 - (pt.amount / maxCompounded) * 220;
                    return `${i === 0 ? 'M' : 'L'} ${xCoord} ${yCoord}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive cursor pointer at end */}
              {compoundPoints.length > 0 && (
                <circle
                  cx={40 + 440}
                  cy={260 - 220}
                  r="5"
                  fill="#ffb703"
                  className="animate-pulse"
                />
              )}

              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-4 px-2">
            <span>Year 0 (Start)</span>
            <span className="text-indigo-400">Yield: {apy}%</span>
            <span>Horizon Apex: {years} Years</span>
          </div>
        </div>
      </div>

      {/* BLOCK 2: ACCOUNTING DOUBLE-ENTRY T-ACCOUNT BALANCER SANDBOX */}
      <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
        {/* FROSTED GLASS ACCESS WALL FOR SCHOLAR (FREE) TIER */}
        {isScholar && (
          <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl border-2 border-indigo-200">
            <div className="max-w-sm space-y-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-700 shadow border-b border-indigo-100">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold tracking-widest text-indigo-600 block uppercase font-mono">🔒 PREMIUM LABORATORY LOCK</span>
              <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight">
                Double-Entry Ledger Sandbox
              </h4>
              <p className="text-slate-500 text-xs leading-normal">
                Post custom business records, balance assets, accounts list, debit accounts list, credit accounts list, and observe if double-entry math remains correct.
              </p>
              <button
                onClick={onNavigateToStore}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border-b-4 border-indigo-900 transition-all cursor-pointer shadow"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-teal-700">
          <ArrowRightLeft className="w-5 h-5 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest font-extrabold">ACCOUNTING • DOUBLE ENTRY BALANCE SHEET LAW</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-display font-extrabold text-2xl text-slate-950">Bookkeeping Ledger Balancer</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Every financial event in corporate accounting must register offset entries to satisfy: <br />
              <strong className="text-brand-primary">Assets (Cash, Equipment) = Liabilities (Loans) + Equity</strong>. <br />
              Post test transactions and review if your Ledger is mathematically balanced!
            </p>

            <form onSubmit={handleAddLedger} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Add Journal Entry</span>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Desk computers lease"
                  value={leDesc}
                  onChange={(e) => setLeDesc(e.target.value)}
                  className="w-full col-span-2 p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                />

                <select
                  value={leAccount}
                  onChange={(e) => setLeAccount(e.target.value as any)}
                  className="p-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="cash">Cash (Asset)</option>
                  <option value="equipment">Equipment (Asset)</option>
                  <option value="loans">Bank Loans (Liability)</option>
                  <option value="equity">Retained Equity (Capital)</option>
                </select>

                <select
                  value={leType}
                  onChange={(e) => setLeType(e.target.value as any)}
                  className="p-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="debit">DEBIT (Dr)</option>
                  <option value="credit">CREDIT (Cr)</option>
                </select>

                <div className="relative col-span-2">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    value={leAmount}
                    onChange={(e) => setLeAmount(e.target.value)}
                    className="w-full p-2.5 pl-7 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-slate-980 flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Post to Ledger
              </button>
            </form>

            <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
              isEquationBalanced 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-amber-50 border-amber-100 text-amber-800 animate-pulse"
            }`}>
              <div className="shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold block uppercase tracking-wide">
                  {isEquationBalanced ? "✓ Balance Account SECURED" : "✗ MISMATCH WARNING"}
                </span>
                <p className="mt-0.5">
                  {isEquationBalanced 
                    ? "Debit sums exactly match credits. Asset value equal liabilities and equity balances."
                    : "Accounting equations does not balance! Sum total of debits must match credits."
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DEBITS */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-96 bg-white shadow-sm">
              <div className="bg-slate-50 p-3 font-semibold text-xs border-b flex justify-between tracking-wide text-slate-700">
                <span>DEBITS (Dr)</span>
                <span className="text-[10px] font-mono text-emerald-600 font-black">INCREASE ASSETS</span>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto flex-grow divide-y divide-slate-100">
                {ledgerEntries.filter(e => e.type === 'debit').map(e => (
                  <div key={e.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block truncate max-w-[150px]">{e.description}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Account: {e.account}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="text-slate-900">${e.amount.toLocaleString()}</span>
                      <button onClick={() => handleDeleteLedger(e.id)} className="p-1 text-slate-350 hover:text-red-500 rounded" title="Delete Ledger Entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-3 mt-auto flex justify-between text-xs font-mono font-black border-t text-slate-800">
                <span>TOTAL DEBIT (Dr):</span>
                <span>${totalDebits.toLocaleString()}</span>
              </div>
            </div>

            {/* CREDITS */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-96 bg-white shadow-sm">
              <div className="bg-slate-50 p-3 font-semibold text-xs border-b flex justify-between tracking-wide text-slate-700">
                <span>CREDITS (Cr)</span>
                <span className="text-[10px] font-mono text-indigo-600 font-black">DECREASE ASSETS / INC EQUITY</span>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto flex-grow divide-y divide-slate-100">
                {ledgerEntries.filter(e => e.type === 'credit').map(e => (
                  <div key={e.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block truncate max-w-[150px]">{e.description}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Account: {e.account}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="text-slate-900">${e.amount.toLocaleString()}</span>
                      <button onClick={() => handleDeleteLedger(e.id)} className="p-1 text-slate-350 hover:text-red-500 rounded" title="Delete Ledger Entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-3 mt-auto flex justify-between text-xs font-mono font-black border-t text-slate-800">
                <span>TOTAL CREDIT (Cr):</span>
                <span>${totalCredits.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 3: STATISTICS (GAUSSIAN NORMAL CURVE) PLOTTER */}
      <div className="bg-white border border-slate-200 border-b-4 rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 shadow-sm relative overflow-hidden">
        {/* FROSTED GLASS ACCESS WALL FOR SCHOLAR (FREE) TIER */}
        {isScholar && (
          <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl border-2 border-indigo-200">
            <div className="max-w-sm space-y-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-700 shadow border-b border-indigo-100">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold tracking-widest text-indigo-600 block uppercase font-mono">🔒 PREMIUM LABORATORY LOCK</span>
              <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight">
                Gaussian Probability Plotter
              </h4>
              <p className="text-slate-500 text-xs leading-normal">
                Fine-tune continuous mean limits and standard deviations. Model central limit theorem predictions and standard distributions interactively.
              </p>
              <button
                onClick={onNavigateToStore}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border-b-4 border-indigo-900 transition-all cursor-pointer shadow"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        )}

        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-sky-700">
            <Percent className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest font-extrabold">STATISTICS • PROBABILITY DENSITY</span>
          </div>

          <h3 className="font-display font-extrabold text-2xl text-slate-950">Gaussian Normal distribution</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            The normal bell curve underlies almost all physical data types. Adjust the Mean and Standard Deviation sliders. Observe how modifying standard deviation (std) flattens the density function of probability.
          </p>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Mean (μ) - Center</span>
                <span className="font-mono text-brand-secondary text-sm">{mean}</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={mean}
                onChange={(e) => setMean(parseInt(e.target.value))}
                className="w-full accent-brand-secondary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                <span>Standard Dev (σ) - Spread</span>
                <span className="font-mono text-brand-secondary text-sm">{stdDev}</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={stdDev}
                onChange={(e) => setStdDev(parseInt(e.target.value))}
                className="w-full accent-brand-secondary cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between text-[11px] text-slate-600 leading-normal font-mono">
            <span>68% boundary criteria: <br /> [{mean - stdDev} to {mean + stdDev}]</span>
            <span>95% boundary criteria: <br /> [{mean - 2 * stdDev} to {mean + 2 * stdDev}]</span>
          </div>
        </div>

        {/* Dynamic Canvas SVG Curve */}
        <div className="lg:col-span-7 flex flex-col justify-center bg-slate-950 rounded-2xl p-6 border-b-4 border-slate-900 relative">
          <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500">
            <span>Probability Density Apex</span>
          </div>

          <div className="w-full h-64 md:h-80 select-none">
            <svg viewBox="0 0 500 300" className="w-full h-full overflow-visible">
              {/* Axes lines */}
              <line x1="40" y1="260" x2="480" y2="260" stroke="#334155" strokeWidth="1.5" />
              <line x1="260" y1="20" x2="260" y2="260" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

              {/* Area path for standard region shade */}
              {bellPoints.length > 0 && (
                <path
                  d={`M 40 260 ${bellPoints.map((pt, i) => {
                    const xPercent = i / steps;
                    const xCoord = 40 + xPercent * 440;
                    // Scale maximum height onto central vertical dimension
                    const yCoord = 260 - (pt.y / maxY) * 200;
                    return `L ${xCoord} ${yCoord}`;
                  }).join(' ')} L 480 260 Z`}
                  fill="url(#bellGrad)"
                  opacity="0.35"
                />
              )}

              {/* Draw continuous line curve */}
              {bellPoints.length > 0 && (
                <path
                  d={bellPoints.map((pt, i) => {
                    const xPercent = i / steps;
                    const xCoord = 40 + xPercent * 440;
                    const yCoord = 260 - (pt.y / maxY) * 200;
                    return `${i === 0 ? 'M' : 'L'} ${xCoord} ${yCoord}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Label center mean */}
              <g>
                <circle cx="260" cy={260 - 200} r="4" fill="#38bdf8" />
                <text x="260" y="260 - 215" fill="#f8fafc" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                  Mean Point (μ)
                </text>
              </g>

              {/* Label standard Deviation flags */}
              <line x1="260 - 40" y1="260" x2="260 - 40" y2="150" stroke="#ffb703" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="260 + 40" y1="260" x2="260 + 40" y2="150" stroke="#ffb703" strokeWidth="0.8" strokeDasharray="2 2" />

              <defs>
                <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-4 px-2">
            <span>-4σ Bounds: {Math.round(mean - 4 * stdDev)}</span>
            <span className="text-sky-400 font-bold">Center (μ) = {mean}</span>
            <span>+4σ Bounds: {Math.round(mean + 4 * stdDev)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
