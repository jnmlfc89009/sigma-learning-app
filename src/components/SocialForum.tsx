/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, BookOpen, BarChart2, DollarSign, Share2, HelpCircle, Settings, 
  Check, AlertTriangle, Cpu, ShieldCheck, Globe, Heart, Trash2, Reply, Send, Sparkles, User, RefreshCw
} from 'lucide-react';
import { safeStorage } from '../lib/safeStorage';

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bgClass: string;
  iconColor: string;
}

interface ForumComment {
  id: string;
  author: string;
  role: string;
  avatarColor: string;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
  replies?: ForumComment[];
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

const INITIAL_COMMENTS: Record<string, ForumComment[]> = {
  'sigma-general': [
    {
      id: 'gen-1',
      author: 'Aria Vance',
      role: 'Curriculum Lead',
      avatarColor: 'bg-indigo-500',
      content: 'Welcome to the Sigma Learning general forum! Use this space to plan your study roadmaps, ask about lessons, and build study cohorts. What is everyone currently focusing on?',
      timestamp: '2 hours ago',
      likes: 12,
      replies: [
        {
          id: 'gen-1-1',
          author: 'Devon Chen',
          role: 'Junior Scholar',
          avatarColor: 'bg-amber-500',
          content: 'I just finished the cryptography audit path! Dynamic calculation drills really pushed my understanding of Caesar and Vignère shifts. Highly recommend it.',
          timestamp: '1 hour ago',
          likes: 5
        }
      ]
    },
    {
      id: 'gen-2',
      author: 'Prof. Marcus Brody',
      role: 'Sigma Advisor',
      avatarColor: 'bg-slate-700',
      content: "A quick tip for new scholars: don't rush through the Double-Entry Accounting module. Ensuring your debit and credit balances always match under stress is crucial for mastering simulated corporate ledgers later on.",
      timestamp: 'Yesterday',
      likes: 24,
      replies: []
    }
  ],
  'sigma-accounting': [
    {
      id: 'acc-1',
      author: 'Elena Rostova',
      role: 'Accounting Mentor',
      avatarColor: 'bg-emerald-500',
      content: "Let's talk about double-entry integrity. When posting depreciations in the trial ledger, remember that Depreciation Expense is matched under debits, while Accumulated Depreciation is a contra-asset under credit. Anyone ran into balance mismatch issues?",
      timestamp: '4 hours ago',
      likes: 8,
      replies: [
        {
          id: 'acc-1-1',
          author: 'Michael K.',
          role: 'Audit Intern',
          avatarColor: 'bg-teal-500',
          content: 'Yes! I spent 30 minutes tracing a $500 discrepancy. I accidentally credited equipment asset directly instead of using the contra-asset account. Lessons learned!',
          timestamp: '3 hours ago',
          likes: 3
        }
      ]
    },
    {
      id: 'acc-2',
      author: 'Warren B.',
      role: 'Value Investor',
      avatarColor: 'bg-amber-600',
      content: 'Accounting is the language of business. Mastering the cash flow statement alongside your balance sheet reveals whether the net earnings actually have cash velocity or are just paper accruals. Excellent simulation design!',
      timestamp: '2 days ago',
      likes: 19,
      replies: []
    }
  ],
  'sigma-statistics': [
    {
      id: 'stat-1',
      author: 'Dr. Sarah Jenkins',
      role: 'Fellow Statistician',
      avatarColor: 'bg-teal-600',
      content: "Has anyone calculated the Banzhaf Power Index for the voting scenario in Applied Mathematics? It's fascinating how a party holding only 15% of the total seats can wield up to 40% of the true swing power under specific coalition weights.",
      timestamp: '5 hours ago',
      likes: 15,
      replies: [
        {
          id: 'stat-1-1',
          author: 'Takahiro S.',
          role: 'Analyst',
          avatarColor: 'bg-sky-500',
          content: "Absolutely. It is the perfect math proof that delegate count doesn't map linearly to actual legislative bargaining leverage. It completely changes how one views parliamentary coalitions.",
          timestamp: '3 hours ago',
          likes: 7
        }
      ]
    },
    {
      id: 'stat-2',
      author: 'Liam Vance',
      role: 'Data Miner',
      avatarColor: 'bg-indigo-600',
      content: 'For the regression exercises, make sure to look out for multi-collinearity. Running dependent parameters like age and experience together in the same linear projection often inflates variance standard errors!',
      timestamp: '1 day ago',
      likes: 11,
      replies: []
    }
  ],
  'sigma-finance': [
    {
      id: 'fin-1',
      author: 'Carlos Mendes',
      role: 'Bento Capitalist',
      avatarColor: 'bg-amber-500',
      content: "A classic progressive taxation scenario is often misunderstood: moving to a higher marginal tax rate (e.g. from 15% to 25%) does not apply the 25% tax rate to your entire income. Only the amount within that specific bracket is taxed at the higher premium! Always check your marginal layers.",
      timestamp: '1 day ago',
      likes: 22,
      replies: [
        {
          id: 'fin-1-1',
          author: 'Sanjay Gupta',
          role: 'Scholar',
          avatarColor: 'bg-rose-500',
          content: 'Exactly! It is shocking how many professional-grade analysts make this basic blunder. The progressive taxation calculator on the math path demonstrates this beautifully with real curves.',
          timestamp: '18 hours ago',
          likes: 9
        }
      ]
    },
    {
      id: 'fin-2',
      author: 'Amara Nwosu',
      role: 'Budget Optimizer',
      avatarColor: 'bg-emerald-600',
      content: 'Compound interest curve projections are exponential. Over a 30-year span, saving an extra $100 per month at an average 7% real return rate yields nearly $120,500, out of which over $84,000 is pure unearned interest returns! Time dominates principal.',
      timestamp: '3 days ago',
      likes: 14,
      replies: []
    }
  ]
};

export default function SocialForum() {
  const [activeTopic, setActiveTopic] = useState<Topic>(SOCIAL_TOPICS[0]);

  // Local comments state cached in safeStorage
  const [localComments, setLocalComments] = useState<Record<string, ForumComment[]>>(() => {
    const saved = safeStorage.getItem('sigma_forum_comments_db');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing local comments data:", e);
      }
    }
    return INITIAL_COMMENTS;
  });

  // User input settings for posting in local stream
  const [userName, setUserName] = useState(() => safeStorage.getItem('sigma_forum_user_name') || 'Scholar Learner');
  const [userRole, setUserRole] = useState(() => safeStorage.getItem('sigma_forum_user_role') || 'Contributor');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Handle local comment commits
  const saveCommentsToStorage = (updated: Record<string, ForumComment[]>) => {
    setLocalComments(updated);
    safeStorage.setItem('sigma_forum_comments_db', JSON.stringify(updated));
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: ForumComment = {
      id: `user-${Date.now()}`,
      author: userName.trim() || 'Scholar Learner',
      role: userRole.trim() || 'Contributor',
      avatarColor: 'bg-indigo-600',
      content: newCommentText.trim(),
      timestamp: 'Just now',
      likes: 0,
      hasLiked: false,
      replies: []
    };

    const currentTopicComments = localComments[activeTopic.id] || [];
    const updatedComments = {
      ...localComments,
      [activeTopic.id]: [newComment, ...currentTopicComments]
    };

    saveCommentsToStorage(updatedComments);
    setNewCommentText('');
  };

  const handlePostReply = (parentId: string) => {
    if (!replyText.trim()) return;

    const targetReply: ForumComment = {
      id: `user-reply-${Date.now()}`,
      author: userName.trim() || 'Scholar Learner',
      role: userRole.trim() || 'Contributor',
      avatarColor: 'bg-slate-600',
      content: replyText.trim(),
      timestamp: 'Just now',
      likes: 0,
      hasLiked: false
    };

    const currentTopicComments = localComments[activeTopic.id] || [];
    const updatedList = currentTopicComments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), targetReply]
        };
      }
      return comment;
    });

    const updatedComments = {
      ...localComments,
      [activeTopic.id]: updatedList
    };

    saveCommentsToStorage(updatedComments);
    setReplyText('');
    setReplyingToId(null);
  };

  const handleLikeComment = (commentId: string, isReply: boolean = false, parentCommentId?: string) => {
    const currentTopicComments = localComments[activeTopic.id] || [];
    let updatedList;

    if (!isReply) {
      updatedList = currentTopicComments.map(comment => {
        if (comment.id === commentId) {
          const alreadyLiked = comment.hasLiked;
          return {
            ...comment,
            likes: alreadyLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1,
            hasLiked: !alreadyLiked
          };
        }
        return comment;
      });
    } else if (parentCommentId) {
      updatedList = currentTopicComments.map(comment => {
        if (comment.id === parentCommentId) {
          const updatedReplies = (comment.replies || []).map(rep => {
            if (rep.id === commentId) {
              const alreadyLiked = rep.hasLiked;
              return {
                ...rep,
                likes: alreadyLiked ? Math.max(0, rep.likes - 1) : rep.likes + 1,
                hasLiked: !alreadyLiked
              };
            }
            return rep;
          });
          return {
            ...comment,
            replies: updatedReplies
          };
        }
        return comment;
      });
    } else {
      updatedList = currentTopicComments;
    }

    const updatedComments = {
      ...localComments,
      [activeTopic.id]: updatedList
    };
    saveCommentsToStorage(updatedComments);
  };

  const handleDeleteComment = (commentId: string, isReply: boolean = false, parentCommentId?: string) => {
    const currentTopicComments = localComments[activeTopic.id] || [];
    let updatedList;

    if (!isReply) {
      updatedList = currentTopicComments.filter(comment => comment.id !== commentId);
    } else if (parentCommentId) {
      updatedList = currentTopicComments.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: (comment.replies || []).filter(rep => rep.id !== commentId)
          };
        }
        return comment;
      });
    } else {
      updatedList = currentTopicComments;
    }

    const updatedComments = {
      ...localComments,
      [activeTopic.id]: updatedList
    };
    saveCommentsToStorage(updatedComments);
  };

  const handleResetForum = () => {
    if (window.confirm("Standardize local chat comments back to pristine defaults? Your custom comments will be cleared.")) {
      const resetComments = { ...INITIAL_COMMENTS };
      saveCommentsToStorage(resetComments);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Intro Header Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-950">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
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
                    : `bg-white border-slate-100 hover:shadow-md active:scale-95 ${topic.bgClass}`
                }`}
              >
                <div className="space-y-4">
                  <div className={`p-2.5 rounded-xl w-fit ${isSelected ? 'bg-slate-900 text-white' : `${topic.iconColor} bg-white border border-slate-150`}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold font-display text-slate-900 text-sm leading-tight font-sans">
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
      {/* Main Comments Container Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        
        {/* Discussion Header */}
        <div className="border-b border-slate-100 pb-5 mb-2 text-left">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider font-mono">
            Classroom Discussion Stream & Notes
          </h3>
          <p className="text-[11px] text-slate-405">Read and post local sandbox insights (Offline Protected)</p>
        </div>

        <div className="space-y-6 animate-fade-in text-left">
            
            {/* User Identity Setup Panel Banner */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
              <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center font-bold text-white shadow-inner font-display text-sm uppercase">
                  {(userName || 'SL').substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Posting as</span>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserName(val);
                        safeStorage.setItem('sigma_forum_user_name', val);
                      }}
                      placeholder="Your name..."
                      className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold text-slate-800 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">Role/Badge</span>
                    <input 
                      type="text" 
                      value={userRole} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserRole(val);
                        safeStorage.setItem('sigma_forum_user_role', val);
                      }}
                      placeholder="e.g. Scholar..."
                      className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] text-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                    />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleResetForum}
                type="button"
                className="text-[10px] text-slate-400 hover:text-slate-800 font-mono transition flex items-center gap-1 self-end sm:self-center bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl hover:shadow-sm active:bg-slate-200"
                title="Restore all discussion comments back to initial classroom examples."
              >
                <RefreshCw className="w-3 h-3" />
                Reset Threads
              </button>
            </div>

            {/* Main Interactive Comments List Feed */}
            <div className="space-y-6 pt-2">
              <h4 className="text-[11px] font-black uppercase text-indigo-650 tracking-wider font-mono">
                Recent Contributions for {activeTopic.title}
              </h4>

              <div className="space-y-5">
                {(!localComments[activeTopic.id] || localComments[activeTopic.id].length === 0) ? (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-mono font-bold">No posts in this stream yet.</p>
                    <p className="text-[11px] text-slate-500">Be the first to author a contribution below!</p>
                  </div>
                ) : (
                  localComments[activeTopic.id].map((comment) => (
                    <div key={comment.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar circle */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold font-display shadow-sm uppercase shrink-0 ${comment.avatarColor}`}>
                          {(comment.author || 'S').substring(0, 2)}
                        </div>
                        
                        <div className="space-y-1 flex-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 font-display">
                              {comment.author}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono border border-slate-200/50">
                              {comment.role}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-auto">
                              {comment.timestamp}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                            {comment.content}
                          </p>
                          
                          {/* Actions: Like, Reply, Delete */}
                          <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-slate-400 pt-1">
                            <button 
                              onClick={() => handleLikeComment(comment.id)}
                              type="button"
                              className={`flex items-center gap-1 transition ${comment.hasLiked ? 'text-rose-600' : 'hover:text-rose-600'}`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${comment.hasLiked ? 'fill-rose-500 stroke-rose-600' : ''}`} />
                              <span>Like ({comment.likes})</span>
                            </button>

                            <button 
                              onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                              type="button"
                              className="flex items-center gap-1 hover:text-indigo-600 transition"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              <span>Reply</span>
                            </button>

                            {(comment.id.startsWith('user-') || comment.author === userName) && (
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                type="button"
                                className="flex items-center gap-1 hover:text-rose-600 ml-auto transition"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          {/* Inline Writing Reply Block */}
                          {replyingToId === comment.id && (
                            <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Write your reply to ${comment.author}...`}
                                rows={2}
                                className="w-full text-xs font-sans p-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => { setReplyingToId(null); setReplyText(''); }}
                                  type="button"
                                  className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handlePostReply(comment.id)}
                                  type="button"
                                  className="bg-slate-900 border border-black hover:bg-slate-950 text-white px-3 py-1 rounded-lg text-[10px] font-bold font-mono inline-flex items-center gap-1 shadow-sm h-7"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  Send Reply
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Sub-replies thread */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="space-y-4 pl-4 border-l-2 border-slate-100 mt-4">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold font-display shadow-inner uppercase shrink-0 ${reply.avatarColor || 'bg-slate-500'}`}>
                                      {(reply.author || 'S').substring(0, 2)}
                                    </div>
                                    
                                    <div className="space-y-0.5 flex-1 text-left">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-800 font-display">
                                          {reply.author}
                                        </span>
                                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                                          {reply.role}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono ml-auto">
                                          {reply.timestamp}
                                        </span>
                                      </div>
                                      
                                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                        {reply.content}
                                      </p>
                                      
                                      <div className="flex items-center gap-3 text-[9px] font-mono font-bold text-slate-450 pt-0.5">
                                        <button 
                                          onClick={() => handleLikeComment(reply.id, true, comment.id)}
                                          type="button"
                                          className={`flex items-center gap-0.5 transition ${reply.hasLiked ? 'text-rose-600' : 'hover:text-rose-600'}`}
                                        >
                                          <Heart className={`w-3 h-3 ${reply.hasLiked ? 'fill-rose-500 stroke-rose-600' : ''}`} />
                                          <span>Like ({reply.likes})</span>
                                        </button>

                                        {(reply.id.startsWith('user-') || reply.author === userName) && (
                                          <button 
                                            onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                            type="button"
                                            className="hover:text-rose-600 ml-auto transition animate-fade-in"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Posting input Form */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-slate-150 space-y-3">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                  Compose Contribution
                </label>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={`Share your academic insights or question for ${activeTopic.title}...`}
                  rows={3}
                  required
                  className="w-full text-xs font-sans p-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-850"
                />
              </div>

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                  Supports simple local state persistence
                </p>
                <button
                  type="submit"
                  className="bg-slate-900 border border-black hover:bg-slate-950 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-2xl transition shadow-md active:scale-98 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish Post
                </button>
              </div>
            </form>

          </div>

      </div>
    </div>
  );
}
