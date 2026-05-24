/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Info, X, ExternalLink, ChevronRight, Check } from 'lucide-react';

interface SponsorAdBannerProps {
  onNavigateToStore?: () => void;
  placement: 'path-map' | 'insights' | 'store';
}

interface AdSenseItem {
  domain: string;
  title: string;
  desc: string;
  cta: string;
  badge: string;
}

const ADSENSE_POOL: AdSenseItem[] = [
  {
    domain: "www.coursera.org/mit-professional",
    title: "MIT Systems Engineering & Data Science Certificate",
    desc: "Accelerate your academic career. Learn spatial data modeling, double-entry cryptography, and recursive sandbox mathematics directly from certified Ivy League instructors.",
    cta: "Apply Online",
    badge: "Sponsored Certificate",
  },
  {
    domain: "aws.amazon.com/free-cloud-tier",
    title: "Build and Deploy Full-Stack Node.js Apps on AWS",
    desc: "Launch robust Express and React dockerized services with standard load balancer parameters. Register today to receive $300 in free trial application credits.",
    cta: "Start Free",
    badge: "Cloud Developer Ad",
  },
  {
    domain: "www.grammarly.com/students",
    title: "Write Academic Reports 3x Faster with AI Correction",
    desc: "Detect ledger errors, format formal curriculum papers instantly, and eliminate double-negative grammar structures. Works with MIT OCW canvas environments.",
    cta: "Install Free Extension",
    badge: "Sponsor Widget",
  },
  {
    domain: "www.bluehost.com/wordpress-hosting",
    title: "Launch Your Website Today with One-Click Setup",
    desc: "Get an online web domain, fully configured databases, and persistent SSL certificates. High-performance caching enabled. Starting at only $2.95/month.",
    cta: "Claim Domain",
    badge: "Special Offer",
  }
];

export default function SponsorAdBanner({ onNavigateToStore, placement }: SponsorAdBannerProps) {
  const [adIndex, setAdIndex] = useState(0);
  const [isAdClosed, setIsAdClosed] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [muteReason, setMuteReason] = useState<string | null>(null);

  // Pick ad dynamically based on placement and time
  useEffect(() => {
    let baseIdx = 0;
    if (placement === 'insights') baseIdx = 1;
    if (placement === 'store') baseIdx = 2;
    
    const offset = new Date().getMinutes() % ADSENSE_POOL.length;
    setAdIndex((baseIdx + offset) % ADSENSE_POOL.length);
  }, [placement]);

  if (isAdClosed) {
    if (muteReason) {
      return (
        <div 
          id={`adsense-muted-${placement}`}
          className="border border-slate-200 border-b-2 rounded-2xl p-4 bg-slate-50 text-center font-sans text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span><b>Ad closed.</b> Thank you for your feedback. We will try not to show this ad again.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                setIsAdClosed(false);
                setMuteReason(null);
                setShowMuteOptions(false);
              }}
              className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
            >
              Undo
            </button>
            {onNavigateToStore && (
              <button 
                onClick={onNavigateToStore}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-lg border-b-2 border-indigo-900 transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-yellow-300" />
                Remove All Ads Permanently
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        id={`adsense-feedback-${placement}`}
        className="border border-slate-200 border-b-2 rounded-2xl p-4 bg-slate-50 text-center font-sans text-xs text-slate-500 flex flex-col gap-2.5 animate-fade-in"
      >
        <span className="font-bold text-slate-700 font-mono text-[10px] uppercase tracking-wider">Ad closed by Google</span>
        <p className="text-[11px] text-slate-500">Why was this ad shown? What was wrong with it?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Repetitive", "Irrelevant", "Covered Content", "Inappropriate"].map((reason) => (
            <button
              key={reason}
              onClick={() => setMuteReason(reason)}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-[10px] px-2.5 py-1 rounded-md text-slate-600 transition cursor-pointer font-medium"
            >
              {reason}
            </button>
          ))}
          <button
            onClick={() => {
              setIsAdClosed(false);
              setShowMuteOptions(false);
            }}
            className="text-slate-400 hover:text-slate-600 border border-transparent text-[10px] px-2 py-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const currentAd = ADSENSE_POOL[adIndex];

  return (
    <div 
      id={`google-adsense-${placement}`} 
      className="bg-[#fafbfb] border border-slate-250 rounded-2xl shadow-sm transition relative overflow-hidden font-sans hover:shadow-md hover:border-slate-350 p-4"
    >
      {/* Google AdSense Meta Ribbon */}
      <div className="flex items-center justify-between border-b border-slate-150 pb-2 mb-2 w-full text-[10px]">
        <div className="flex items-center gap-1 text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-sans text-[9px] tracking-wide uppercase font-bold text-slate-400">Ads by Google</span>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToStore && (
            <button 
              onClick={onNavigateToStore}
              className="text-[9px] font-sans font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer uppercase tracking-wider bg-indigo-50 border border-indigo-150 rounded-md px-1.5 py-0.5"
            >
              <Sparkles className="w-3 h-3 text-yellow-500 animate-spin" />
              Upgrade to Premium Store (Hide Ads)
            </button>
          )}
          <button 
            type="button"
            onClick={() => setIsAdClosed(true)}
            className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition"
            title="Close Ad"
          >
            <X className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
      </div>

      {/* Ad Contents matching Google Search / AdSense text cards layout style */}
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
        <div className="flex-1 space-y-1 text-left">
          {/* Display Domain URL in standard green link tone */}
          <div className="flex items-center gap-1 text-emerald-700 font-sans text-[11px] tracking-wide relative">
            <span>{currentAd.domain}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[9px] font-mono font-medium text-slate-450 uppercase px-1 border border-slate-200 bg-white shadow-3xs rounded-sm">
              {currentAd.badge}
            </span>
          </div>

          {/* Hyperlink Title in deep blue Google Anchor style */}
          <a
            href={`https://${currentAd.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block group cursor-pointer"
          >
            <h4 className="font-display font-bold text-blue-800 leading-snug group-hover:underline text-sm md:text-base">
              {currentAd.title}
            </h4>
          </a>

          {/* Description Text matching gray Ad density */}
          <p className="text-slate-600 font-sans text-[11.5px] leading-relaxed max-w-3xl">
            {currentAd.desc}
          </p>
        </div>

        {/* Action Button styled as premium Google dynamic badge */}
        <div className="shrink-0 flex flex-col justify-center items-stretch md:items-end gap-1.5 w-full md:w-auto">
          <a
            href={`https://${currentAd.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto bg-[#1a73e8] hover:bg-[#1557b0] text-white font-sans font-extrabold text-[11px] px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-[#1a73e8]"
          >
            {currentAd.cta}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
