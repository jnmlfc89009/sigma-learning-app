/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiscussionEmbed } from 'disqus-react';
import { MessageSquare, BookOpen, BarChart2, DollarSign, Share2, HelpCircle } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bgClass: string;
  iconColor: string;
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

  // Construct stable, clean page URL for Disqus integration matching current selected forum channel
  const disqusUrl = `${window.location.origin}/social/${activeTopic.id}`;

  const disqusConfig = {
    url: disqusUrl,
    identifier: activeTopic.id,
    title: activeTopic.title,
    language: 'en_SG' // Default language requested by user
  };

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
            <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider font-mono">
              Live Disqus Stream
            </span>
            <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
              {activeTopic.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Traditional Chinese (zh_TW) Forum Active</span>
          </div>
        </div>

        {/* Disqus forum embed loader */}
        <div className="min-h-[300px]">
          <DiscussionEmbed
            key={activeTopic.id} // Forces re-mount when switching channels, keeping load clean
            shortname="sigma-learner"
            config={disqusConfig}
          />
        </div>

        {/* Footer Support Notice */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex gap-3 text-xs text-slate-500 font-sans leading-relaxed">
          <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Connection with Global Forum API</p>
            <p>
              Comments posted here are indexed globally through the Disqus academic network. Sign in or post as a guest to build your external reputation indices!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
