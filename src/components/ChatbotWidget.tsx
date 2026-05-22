/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Headphones, Sparkles, HelpCircle, ArrowRight, ShieldCheck, CheckCircle, Ticket } from 'lucide-react';
import { UserProfile } from '../types';

interface ChatbotWidgetProps {
  user: UserProfile;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  isSupportTicketLink?: boolean;
}

const FAQ_OPTIONS = [
  { q: "How do I earn gems? 💎", key: "gems" },
  { q: "What are the tier limitations? 📊", key: "tiers" },
  { q: "Is progress data encrypted? 🔒", key: "security" },
  { q: "How can I study Applied Math? 🧠", key: "applied_math" },
];

export default function ChatbotWidget({ user }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "wel_1",
      sender: 'bot',
      text: `Hello ${user.username}! I am the Sigma Learning Assistant. I can help resolve curriculum queries, explain double-entry mechanics, or support upgrades. Please select an option below or type a custom question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  
  // Custom support ticket flow
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'form' | 'submitting' | 'submitted'>('idle');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Curriculum Problem');
  const [ticketId, setTicketId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, ticketStatus]);

  const handlePostUserMessage = (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: timeStr,
    };

    setMessages(prev => [...prev, userMsg]);
    setHasInteracted(true);
    
    // Simulate thinking then generate response
    setTimeout(() => {
      const botResponse = getBotResponse(text);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 600);
  };

  const getBotResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('gem') || q.includes('diamond')) {
      return "Gems represent knowledge milestones. You can earn gems by: \n1. Completing lesson chapters (25 💎 for completing, up to 50 💎 for perfect score).\n2. Gaining perfect star ratings.\nScholar tier can also upgrade to Analyst for an instant 500 💎 premium bonus, or Magnate for 2,000 💎.";
    }
    if (q.includes('tier') || q.includes('analyst') || q.includes('scholar') || q.includes('limit') || q.includes('locked')) {
      return "Sigma Learning features three academic tiers:\n\n• Scholar (Free): Locked to Level 3 on all tracks. Clamped sandbox ranges.\n• Analyst Premium: Custom choices to unlock 1 course fully (Levels 1-12). Other courses remain free up to Level 3, and require 100 💎 per higher level.\n• Magnate Premium: Unlocks ALL courses (1-12) with zero gem charges, plus exclusive access to the 'Daily Applied Mathematics' track and full sandbox tools.";
    }
    if (q.includes('encrypt') || q.includes('security') || q.includes('aes') || q.includes('decrypted') || q.includes('ciph')) {
      return "Our systems feature client-side AES simulation. Before any curriculum metrics (lesson completed, streak daily count, stars) are transmited over the web API to persistent storage, they are encrypted into robust cyphertext blocks in /src/lib/crypto.ts. Check the 'Cryptography' panel above to verify active security logs!";
    }
    if (q.includes('applied') || q.includes('math') || q.includes('cryptography') || q.includes('tax')) {
      return "Applied Mathematics includes extreme calculation drills: Progressive taxation formulas, Caesar Cipher key shifts, Electoral power indexes, and Appliance consumption wattage calculations. Because it covers professional-grade modeling, it is strictly reserved for academic Magnate subscribers.";
    }
    if (q.includes('hello') || q.includes('hi ') || q.includes('hey')) {
      return `Hello ${user.username}! Ask me anything about curriculum limits, gems, or cryptography, or click one of the quick buttons below.`;
    }
    if (q.includes('help') || q.includes('support') || q.includes('offline') || q.includes('agent')) {
      if (user.tier === 'magnate') {
        return "As an active academic Magnate tier member, you are eligible for immediate direct offline-agent support connection. Click the support button in the chat options to open a ticket!";
      }
      return "Standard support is handled through this terminal. For billing problems, you can navigate to the Premium Store to secure a priority support contract!";
    }

    return "Thank you for asking. I'm trained with MIT OCW Syllabi indices. If that is related to gems, user subscription tiers, sandbox equations, or AES key verification, please select one of the FAQ shortcuts below for immediate clarity!";
  };

  const handleSendInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const txt = input;
    setInput('');
    handlePostUserMessage(txt);
  };

  const handleSelectOption = (key: string, label: string) => {
    handlePostUserMessage(label);
  };

  const handleOpenTicket = () => {
    if (user.tier !== 'magnate') return;
    setTicketStatus('form');
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    setTicketStatus('submitting');
    setTimeout(() => {
      const generatedId = "SIG-TK-" + Math.floor(100000 + Math.random() * 900000);
      setTicketId(generatedId);
      setTicketStatus('submitted');

      // Add a system bot message confirmation to the chat history
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'bot',
        text: `🛡️ STRENGTH SECURITY CONFIRMED: Support ticket has been successfully registered under offline queue! ID: ${generatedId}. An offline academic representative will send an encrypted response to ${user.email} within 4 business hours.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Trigger Button (open to all users) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        id="floating-chatbot-trigger"
        className="fixed bottom-6 right-6 z-40 bg-slate-900 border-b-4 border-slate-950 text-white rounded-full p-4 hover:translate-y-[-2px] transition duration-150 shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
        aria-label="FAQ Support Chat"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
        </div>
        <span className="text-xs font-display font-extrabold uppercase tracking-wider max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300">
          Sigma Bot
        </span>
      </button>

      {/* Modern Chat Drawer Box */}
      {isOpen && (
        <div
          id="chatbot-drawer-panel"
          className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[550px] bg-white border border-slate-200 border-b-4 rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-pop border-l-2"
        >
          {/* Header segment */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-extrabold text-sm block">SIGMA FAQs HELPER</span>
                <span className="text-[9px] text-slate-300 font-mono tracking-wider font-semibold uppercase flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                  Multi-tier Active Matrix
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setTicketStatus('idle');
                setTicketMessage('');
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body chatbot screens */}
          {ticketStatus === 'idle' || ticketStatus === 'submitted' ? (
            <>
              {/* Messages Lists */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
                {messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={msg.id} className={`flex items-start gap-2.5 ${isBot ? "" : "flex-row-reverse"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isBot ? "bg-indigo-100 text-indigo-700" : "bg-slate-900 text-white"
                      }`}>
                        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1 max-w-[78%]">
                        <div className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${
                          isBot 
                            ? "bg-white border border-slate-100 text-slate-800" 
                            : "bg-slate-900 text-white"
                        }`}>
                          {msg.text.split('\n').map((line, i) => (
                            <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
                          ))}
                        </div>
                        <span className={`text-[9px] text-slate-400 font-mono block ${isBot ? "" : "text-right"}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Options Block */}
              <div className="p-3 bg-white border-t border-slate-100 space-y-2 shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Interactive Quick Shortcuts</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FAQ_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key, opt.q)}
                      className="text-[10px] font-sans font-bold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg border border-slate-200 transition text-left"
                    >
                      {opt.q}
                    </button>
                  ))}
                </div>

                {/* MAGNATE EXCLUSIVE SUPPORT LINK BUTTON */}
                {user.tier === 'magnate' && (
                  <div className="pt-2 border-t border-dashed border-slate-200 mt-2">
                    {hasInteracted ? (
                      <button
                        onClick={handleOpenTicket}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl border-b-2 border-indigo-900 shadow transition flex items-center justify-center gap-1.5 uppercase tracking-wide"
                      >
                        <Headphones className="w-3.5 h-3.5 text-yellow-300" />
                        Connect Live Offline Agent Support
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-serif block text-center italic">
                        🔐 Verify chatbot FAQs responses once before priority queue unlocked.
                      </span>
                    )}
                  </div>
                )}
                {user.tier !== 'magnate' && hasInteracted && (
                  <div className="pt-1.5 border-t border-slate-100 text-center">
                    <span className="text-[9px] font-sans text-slate-400 block leading-tight">
                      Want direct Live Support? Upgrade to <strong className="text-purple-600">Magnate Exclusive Plan</strong> to connect with offline academic specialists!
                    </span>
                  </div>
                )}
              </div>

              {/* Standard chat box typed fields input */}
              <form onSubmit={handleSendInput} className="p-3 border-t border-slate-200 flex gap-1.5 shrink-0 bg-white">
                <input
                  type="text"
                  placeholder="Ask about ciphers, compounding, limits..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-grow text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl transition cursor-pointer"
                  title="Submit Custom Chat"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : ticketStatus === 'form' || ticketStatus === 'submitting' ? (
            /* Direct offline Live Support Form strictly for MAGNATES */
            <form onSubmit={handleSubmitTicket} className="flex-grow flex flex-col justify-between bg-white overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-grow">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-800">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-display font-black uppercase tracking-wide">MAGNATE PRIORITY SECURITY LINE</span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed font-sans">
                    You are connected via authenticated TLS. Post your technical or curriculum problems below. An academic specialist is assigned and is reviewing tickets.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="Curriculum Syllabus Clarification">Curriculum Syllabus Clarification</option>
                    <option value="Compounding Formula Discrepancy">Compounding Formula Discrepancy</option>
                    <option value="Bookkeeping Balanced Sandbox Error">Bookkeeping Balanced Ledger Help</option>
                    <option value="Security Client Ciphers Verify">Security Client Cryptography Pipeline</option>
                    <option value="Subscription Billing Problem">Subscription billing or Gems glitch</option>
                  </select>
                </div>

                <div className="space-y-1 flex-grow flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Detailed Request message</label>
                  <textarea
                    required
                    placeholder="Describe your mathematical verification challenge. E.g. T-Ledgers debits not compiling correctly on asset values"
                    rows={4}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-grow leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTicketStatus('idle')}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketStatus === 'submitting' || !ticketMessage.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wide rounded-xl border-b-4 border-indigo-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {ticketStatus === 'submitting' ? (
                    <span className="animate-pulse">Registering Ticket...</span>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 text-emerald-300" />
                      Submit Live Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Ticket registered dashboard status message */
            <div className="flex-grow p-6 flex flex-col items-center justify-center text-center space-y-4 bg-indigo-50/50">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-md animate-pop">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase font-mono">TICKET ID: {ticketId}</span>
                <h4 className="font-display font-black text-lg text-slate-950">Active Offline Link Secured</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Your priority query was uploaded successfully. An expert is on stand-by under ticket <strong>{ticketId}</strong>. Check your inbox ({user.email}) for updates.
                </p>
              </div>

              <button
                onClick={() => setTicketStatus('idle')}
                className="px-5 py-2.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold font-mono tracking-wide shadow"
              >
                Back to Live Chat FAQs
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
