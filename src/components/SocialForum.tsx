/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, BookOpen, BarChart2, DollarSign, Share2, HelpCircle, Settings, Check, AlertTriangle, Cpu } from 'lucide-react';
import { safeStorage } from '../lib/safeStorage';

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bgClass: string;
  iconColor: string;
}

interface DiscussionEmbedProps {
  key?: string;
  shortname: string;
  config: {
    url: string;
    identifier: string;
    title: string;
    language: string;
  };
  onLoadSuccess?: () => void;
  onLoadError?: () => void;
}

// React 19 Compliant fully-functional DiscussionEmbed Component
export function DiscussionEmbed({ shortname, config, onLoadSuccess, onLoadError }: DiscussionEmbedProps) {
  useEffect(() => {
    // 1. Configure global window variables for Disqus loader
    const disqusConfig = function (this: any) {
      this.page.url = config.url;
      this.page.identifier = config.identifier;
      this.page.title = config.title;
      this.language = config.language;
      this.page.developer = 1; // Strict bypass for development / iframe domain blocks

      // Safely register ready callback if supported
      this.callbacks = this.callbacks || {};
      this.callbacks.onReady = this.callbacks.onReady || [];
      this.callbacks.onReady.push(() => {
        if (onLoadSuccess) onLoadSuccess();
      });
    };
    (window as any).disqus_config = disqusConfig;
    (window as any).disqus_developer = 1;

    // 2. Clear old loaders to force fresh initialization on channel swap
    const d = document;
    const existingScript = d.querySelector('script[src*=".disqus.com/embed.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 3. Check if Disqus script is already loaded and reset accordingly
    if ((window as any).DISQUS) {
      try {
        (window as any).DISQUS.reset({
          reload: true,
          config: disqusConfig
        });
        if (onLoadSuccess) onLoadSuccess();
      } catch (e) {
        console.warn("Disqus reset failed gracefully:", e);
        if (onLoadError) onLoadError();
      }
    } else {
      // 4. Mount Disqus script asynchronously
      try {
        const s = d.createElement('script');
        s.src = `https://${shortname}.disqus.com/embed.js`;
        s.setAttribute('data-timestamp', +new Date() + '');
        s.async = true;
        s.onload = () => {
          if (onLoadSuccess) onLoadSuccess();
        };
        s.onerror = (err) => {
          console.error("Disqus script loading blocked:", err);
          if (onLoadError) onLoadError();
        };
        (d.head || d.body).appendChild(s);
      } catch (err) {
        console.error("Disqus script mounting exception:", err);
        if (onLoadError) onLoadError();
      }
    }
  }, [shortname, config.url, config.identifier, config.title, config.language, onLoadSuccess, onLoadError]);

  return <div id="disqus_thread" className="w-full h-full min-h-[300px]" />;
}

const SOCIAL_TOPICS: Topic[] = [
  {
    id: 'sigma-general',
    title: 'Sigma Learning General Forum',
    description: 'Connect with fellow scholars, share learning tracks, and discuss academic roadmap strategies.',
    icon: MessageSquare,
    bgClass: 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200',
    iconColor: 'text-indigo-650'
  },
  {
    id: 'sigma-accounting',
    title: 'Accounting & Ledger Help',
    description: 'Discuss debit/credit balance sheets, accounting ledger simulations, and advanced financial flows.',
    icon: BookOpen,
    bgClass: 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200',
    iconColor: 'text-emerald-650'
  },
  {
    id: 'sigma-statistics',
    title: 'Statistics & Math Hub',
    description: 'Delve into probability theorems, statistical sampling, data models, and regression analysis parameters.',
    icon: BarChart2,
    bgClass: 'bg-teal-50/50 border-teal-100 hover:bg-teal-50 hover:border-teal-200',
    iconColor: 'text-teal-650'
  },
  {
    id: 'sigma-finance',
    title: 'Personal Finance & Economics Club',
    description: 'Share tips about compound interest, budgeting, capital allocation, and macro-economics concepts.',
    icon: DollarSign,
    bgClass: 'bg-amber-50/50 border-amber-100 hover:bg-amber-50 hover:border-amber-200',
    iconColor: 'text-amber-650'
  }
];

export default function SocialForum() {
  const [activeTopic, setActiveTopic] = useState<Topic>(SOCIAL_TOPICS[0]);
  
  // Custom Disqus Shortname settings with local cache fallback
  const [disqusShortname, setDisqusShortname] = useState(() => safeStorage.getItem('sigma_disqus_shortname') || 'sigma-learner');
  const [tempShortname, setTempShortname] = useState(disqusShortname);
  const [shortnameStatusMsg, setShortnameStatusMsg] = useState('');
  const [disqusLoadingState, setDisqusLoadingState] = useState<'loading' | 'loaded' | 'failed' | 'timeout'>('loading');
  const [clarityLoaded, setClarityLoaded] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Construct stable, clean page URL for Disqus integration matching current selected forum channel
  const disqusUrl = `${window.location.origin}/social/${activeTopic.id}`;

  // Check if Microsoft Clarity is active/loaded dynamically
  useEffect(() => {
    const checkClarity = () => {
      if ((window as any).clarity) {
        setClarityLoaded(true);
      }
    };
    checkClarity();
    const interval = setInterval(checkClarity, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDisqusLoadingState('loading');

    // Enable developer mode globally for Disqus load sequence
    (window as any).disqus_developer = 1;

    // Set a safety timeout to detect AdBlockers or Sandboxing blocks after 6 seconds
    const timer = setTimeout(() => {
      const container = document.getElementById('disqus_thread');
      if (container && !container.hasChildNodes()) {
        setDisqusLoadingState('timeout');
      }
    }, 6000);

    return () => {
      clearTimeout(timer);
    };
  }, [disqusUrl, activeTopic.id, activeTopic.title, disqusShortname]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Intro Header Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-950">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-555/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-250 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            Peer-to-Peer Academic Social Network
          </span>
          <h2 className="font-display font-black text-3xl md:text-4xl tracking-tight leading-none">
            Sigma Academic Forum
          </h2>
          <p className="text-sm text-indigo-150 leading-relaxed font-sans font-medium">
            Join thousands of analysts and scholars in real-time discussion boards. Share insights on the 
            accounting simulator, question formulations, and cryptographic telemetry audits!
          </p>
        </div>
      </div>

      {/* Grid of Interactive Topics */}
      <div>
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest font-mono mb-4">
          Select Discussion Channel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOCIAL_TOPICS.map((topic) => {
            const Icon = topic.icon;
            const isSelected = activeTopic.id === topic.id;

            return (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className={`text-left p-5 rounded-2xl border-2 transition duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-slate-900 shadow-lg scale-[1.01] ring-2 ring-slate-900/5"
                    : `bg-white border-slate-100 hover:shadow-xs active:scale-98 ${topic.bgClass}`
                }`}
              >
                <div className="space-y-4">
                  <div className={`p-2.5 rounded-xl w-fit ${isSelected ? 'bg-slate-900 text-white' : `${topic.iconColor} bg-white border border-slate-150`}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold font-display text-slate-900 text-sm leading-tight">
                      {topic.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
                      {topic.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[11px] font-mono font-bold">
                  <span className={isSelected ? "text-slate-900 underline" : "text-slate-400"}>
                    {isSelected ? "Active Channel" : "Join Channel"}
                  </span>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disqus Integration Render Frame Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider font-mono">
                Live Peer-To-Peer Academic Stream
              </span>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition flex items-center gap-1 text-[10px] font-mono font-bold"
                title="Configure Forum API"
              >
                <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                Configure API
              </button>
            </div>
            <h3 className="font-display font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeTopic.title}</span>
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold border rounded-xl px-2.5 py-1 ${
              disqusLoadingState === 'loaded' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : disqusLoadingState === 'loading'
                ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                disqusLoadingState === 'loaded' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
              }`} />
              <span>Disqus Shortname: "{disqusShortname}"</span>
            </div>

            <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold border rounded-xl px-2.5 py-1 ${
              clarityLoaded 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <Cpu className="w-3 h-3 text-indigo-600" />
              <span>Clarity: {clarityLoaded ? "ENABLED" : "BLOCKED"}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Settings Form */}
        {showConfig && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fade-in font-sans">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              Developer Forum Customizer
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Disqus comments are served under a specific forum channel called a <strong>Shortname</strong>. 
              By default, we load the peer-to-peer <code>sigma-learner</code> channel. If you have registered your own Disqus forum, 
              input your shortname below to instantly hook up your personal comments thread!
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="text"
                value={tempShortname}
                onChange={(e) => setTempShortname(e.target.value.trim().toLowerCase())}
                placeholder="e.g. my-awesome-forum"
                className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => {
                  if (tempShortname) {
                    safeStorage.setItem('sigma_disqus_shortname', tempShortname);
                    setDisqusShortname(tempShortname);
                    setShortnameStatusMsg('Shortname saved! Reloading thread...');
                    setTimeout(() => setShortnameStatusMsg(''), 3000);
                  } else {
                    safeStorage.removeItem('sigma_disqus_shortname');
                    setDisqusShortname('sigma-learner');
                    setTempShortname('sigma-learner');
                    setShortnameStatusMsg('Reset to default channel.');
                    setTimeout(() => setShortnameStatusMsg(''), 3000);
                  }
                }}
                className="bg-slate-900 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl border-b-2 border-black hover:bg-slate-950 transition active:border-b-0"
              >
                Save
              </button>
            </div>
            {shortnameStatusMsg && (
              <p className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" />
                {shortnameStatusMsg}
              </p>
            )}
          </div>
        )}

        {/* Diagnostics & Ad-Blocker Warning Panel */}
        {(disqusLoadingState === 'timeout' || disqusLoadingState === 'failed') && (
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 font-sans text-xs text-rose-850 justify-between items-start md:items-center">
            <div className="flex gap-3 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950">Script Connection Diagnostics Notice (AdBlock Detected?)</p>
                <p>
                  Disqus or Microsoft Clarity script injection timed out. This is extremely common in sandbox environments 
                  like <strong>Google AI Studio Code Preview</strong>.
                </p>
                <p className="text-rose-700">
                  <strong>Why does this happen?</strong> Browers (e.g. Brave shields, Safari tracking prevention, Chrome's AdBlockers, or uBlock Origin) 
                  automatically block external scripts that track engagements or load comments across duplicate domains inside an <code>iframe</code>.
                </p>
                <p className="text-slate-600 font-medium">
                  💡 <strong>Permanent Fix:</strong> Double click the top corner's <strong>"Open inside a new tab"</strong> icon in AI Studio to load this application in its full standalone context, or add this domain as an exception in your AdBlocker.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disqus forum embed loader */}
        <div className="min-h-[300px] border border-slate-100 rounded-2xl p-4 bg-slate-50/50 relative">
          {disqusLoadingState === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 space-y-3 font-mono">
              <span className="w-8 h-8 rounded-full border-2 border-t-indigo-600 border-slate-100 animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Mounting Disqus Thread...</p>
            </div>
          )}
          <DiscussionEmbed
            key={`${disqusShortname}-${activeTopic.id}`}
            shortname={disqusShortname}
            config={{
              url: disqusUrl,
              identifier: activeTopic.id,
              title: activeTopic.title,
              language: 'zh_TW'
            }}
            onLoadSuccess={() => setDisqusLoadingState('loaded')}
            onLoadError={() => setDisqusLoadingState('failed')}
          />
        </div>

        {/* Footer Support Notice */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex gap-3 text-xs text-slate-500 font-sans leading-relaxed">
          <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Connection with Global Forum API</p>
            <p>
              Comments posted here are indexed globally through the Disqus academic network. Sign in or post as a guest to build your external reputation indices! Set up active local development overrides as <code>page.developer = 1</code> is automatically running to authorize this layout instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
