import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertTriangle, ExternalLink } from 'lucide-react';

interface DiscussionEmbedProps {
  key?: string;
  shortname: string;
  config: {
    url: string;
    identifier: string;
    title: string;
    language: string;
  };
}

// React 19 stable high-fidelity drop-in replacement for Disqus injection
export function DiscussionEmbed({ shortname, config }: DiscussionEmbedProps) {
  useEffect(() => {
    const disqusConfig = function (this: any) {
      this.page.url = config.url;
      this.page.identifier = config.identifier;
      this.page.title = config.title;
      this.language = config.language;
      this.page.developer = 1; // Strict bypass for development / iframe sandbox blocks
    };

    (window as any).disqus_config = disqusConfig;
    (window as any).disqus_shortname = shortname;

    const d = document;
    
    // Remote client script reset to correctly support seamless channel swapping
    const oldScript = d.querySelector('script[src*=".disqus.com/embed.js"]');
    if (oldScript) {
      oldScript.remove();
    }

    if ((window as any).DISQUS) {
      try {
        (window as any).DISQUS.reset({
          reload: true,
          config: disqusConfig
        });
      } catch (err) {
        console.warn("Disqus thread reset bypassed:", err);
      }
    } else {
      try {
        const s = d.createElement('script');
        s.src = `https://${shortname}.disqus.com/embed.js`;
        s.setAttribute('data-timestamp', +new Date() + '');
        s.async = true;
        (d.head || d.body).appendChild(s);
      } catch (err) {
        console.error("Disqus connection aborted:", err);
      }
    }
  }, [shortname, config.url, config.identifier, config.title, config.language]);

  return <div id="disqus_thread" className="w-full min-h-[350px] bg-white p-4 rounded-2xl" />;
}

interface DisqusSectionProps {
  activeTab: string;
}

export default function DisqusSection({ activeTab }: DisqusSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'failed' | 'timeout'>('loading');

  const disqusShortname = 'sigma-learner';

  const tabTitles: Record<string, string> = {
    learn: 'Mastery Curriculum Map',
    insights: 'Quantum Math Sandbox',
    store: 'Premium Resource Store',
    social: 'Peer Classroom Social Hub',
    security: 'Cryptography Audit Console',
    auth: 'Public Peer Board & Guest Lobby'
  };

  const activeTitle = tabTitles[activeTab] || 'Interactive Academic Workspace';
  const disqusUrl = `${window.location.origin}/page/${activeTab}`;
  const disqusIdentifier = `sigma-page-${activeTab}`;

  useEffect(() => {
    setLoadingState('loading');
    
    // Smoothly fade out the loading backdrop after 1.5 seconds
    const loadTimer = setTimeout(() => {
      setLoadingState('loaded');
    }, 1500);

    // Diagnostics timer for detecting iframe block / tracker blocks
    const diagnosticTimer = setTimeout(() => {
      const container = document.getElementById('disqus_thread');
      if (container && !container.hasChildNodes()) {
        setLoadingState('timeout');
      }
    }, 6000);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(diagnosticTimer);
    };
  }, [activeTab]);

  return (
    <div className="mt-12 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs max-w-7xl mx-auto w-full text-left font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-150 text-indigo-600 rounded-2xl shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-slate-950 text-sm tracking-tight leading-tight uppercase">
              Global Comments Section ({activeTitle})
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Powered by Disqus. Join public conversations, ask questions, or review notes below!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-950 hover:bg-slate-950 text-[10px] font-mono font-black uppercase text-white shadow-xs transition"
          >
            {isOpen ? "COLLAPSE FEED" : "LOAD DISQUS COMMENTS"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-6">
          {/* AdBlocker or Iframe Preview Sandbox Warning */}
          {(loadingState === 'timeout' || loadingState === 'failed') && (
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-xs font-sans text-amber-900 leading-relaxed space-y-2">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">Script connection delayed (Safe Sandbox Filter Active?)</p>
                  <p className="text-slate-600 text-[11px]">
                    Disqus scripts may be prevented from loading directly inside sandbox environments like Google AI Studio's iframe previews due to cross-origin script-prevention or tracker shields.
                  </p>
                  <p className="text-indigo-950 text-[11.5px] font-semibold">
                    🚀 Standard Hosting Deployment: Once you share, build, or deploy this application to standalone containers (like Vercel, Netlify, or Cloud Run), these browser blocks disappear, permitting seamless script connections!
                  </p>
                </div>
              </div>
              <div className="pl-6.5 flex flex-wrap gap-2.5 items-center">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold font-mono uppercase text-slate-700 px-3 py-1.5 rounded-xl inline-flex items-center gap-1 transition shadow-xs"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  Open Standalone tab
                </a>
              </div>
            </div>
          )}

          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-55/40 relative min-h-[350px]">
            {loadingState === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-10 space-y-3 font-mono">
                <div className="w-8 h-8 rounded-full border-2 border-t-indigo-600 border-slate-100 animate-spin" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  Attuning Disqus Discussion Engine...
                </p>
              </div>
            )}
            <DiscussionEmbed
              key={`${disqusShortname}-${activeTab}`}
              shortname={disqusShortname}
              config={{
                url: disqusUrl,
                identifier: disqusIdentifier,
                title: `${activeTitle} Discussion | Sigma Learning`,
                language: 'en_SG' // e.g. for English Singapore
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
