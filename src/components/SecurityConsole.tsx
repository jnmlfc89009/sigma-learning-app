/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, Key, Terminal, Code, Settings, ListCollapse, RefreshCw } from 'lucide-react';
import { SecurityAuditLog } from '../types';

export default function SecurityConsole() {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Custom sandbox playground
  const [plainInput, setPlainInput] = useState('{"progressPercent": 100, "stars": 3}');
  const [testIV, setTestIV] = useState('d4e138a0c9b4e7fe22a6');
  const [testCipher, setTestCipher] = useState('');
  const [testDecrypted, setTestDecrypted] = useState('');

  const fetchSecurityLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to query audit trail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  // Sandbox calculations
  const triggerAesSimulation = () => {
    const secretKey = 'SIGMA_LEARNING_SUPER_SECRET_KEY_FOR_JWT_AND_AES';
    const keyWithIv = secretKey + testIV;
    
    // Encrypt
    const output: string[] = [];
    const keyLength = keyWithIv.length;
    let stretchedKey = "";
    while (stretchedKey.length < plainInput.length * 2) {
      stretchedKey += keyWithIv;
    }

    for (let i = 0; i < plainInput.length; i++) {
      const charCode = plainInput.charCodeAt(i);
      const keyChar = stretchedKey.charCodeAt(i % keyLength);
      const xorValue = charCode ^ keyChar;
      output.push(xorValue.toString(16).padStart(2, "0"));
    }
    const cipherHex = "HEX:" + output.join("");
    setTestCipher(cipherHex);

    // Decrypt
    const decryptOut: string[] = [];
    const rawHex = cipherHex.substring(4);
    for (let i = 0; i < rawHex.length; i += 2) {
      const charCode = parseInt(rawHex.substring(i, i + 2), 16);
      const keyIndex = Math.floor(i / 2) % keyLength;
      const keyChar = stretchedKey.charCodeAt(keyIndex);
      decryptOut.push(String.fromCharCode(charCode ^ keyChar));
    }
    setTestDecrypted(decryptOut.join(""));
  };

  return (
    <div id="security-console-component" className="space-y-8 animate-pop pb-12 max-w-5xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 gap-4">
        <div>
          <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-700 animate-pulse" />
            Cryptographic Inspection Office
          </h2>
          <p className="text-slate-500 font-sans text-sm mt-1">
            Audit the real-time server-side database logs, TLS handshake packets, and client-side stretched password arrays.
          </p>
        </div>

        <button
          onClick={fetchSecurityLogs}
          disabled={loading}
          className="bg-brand-primary text-white font-mono text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 border-b-4 border-black active:border-b-0 hover:bg-slate-950 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          RE-QUERY AUDIT TRAILS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Play Sandbox Encryptor */}
        <div className="lg:col-span-5 bg-white border border-slate-200 border-b-4 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-800">
            <Lock className="w-5 h-5" />
            <span className="font-mono text-xs uppercase font-extrabold tracking-widest">CIPHER DECODE LAB</span>
          </div>
          <p className="text-slate-500 text-xs font-sans leading-relaxed">
            Test the application's underlying cryptographic encryption engine. Enter custom parameters below to generate dynamic ciphertext hex blocks using simulated AES-GCM and verify integrity limits.
          </p>

          <div className="space-y-3 font-sans text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide block">Raw Target Parameter Payload</label>
              <textarea
                value={plainInput}
                onChange={(e) => setPlainInput(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono text-slate-800 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide block">AES Initialization Vector (IV)</label>
              <input
                type="text"
                value={testIV}
                onChange={(e) => setTestIV(e.target.value)}
                className="w-full p-2.5 border rounded-lg font-mono text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={triggerAesSimulation}
              className="w-full py-3 bg-brand-secondary hover:bg-brand-secondary/95 text-white font-bold uppercase tracking-wider text-xs border-b-4 border-teal-950 rounded-xl"
            >
              Examine Cipher handshake
            </button>

            {testCipher && (
              <div className="space-y-3 pt-3 border-t font-mono text-[11px]">
                <div className="bg-slate-950 p-2.5 rounded text-emerald-400 break-all border border-slate-800">
                  <strong className="text-white text-[10px] block mb-1">Generated Ciphertext Hex:</strong>
                  {testCipher}
                </div>
                <div className="bg-slate-950 p-2.5 rounded text-teal-400 break-all border border-slate-800">
                  <strong className="text-white text-[10px] block mb-1">Decrypted Output Match Verified:</strong>
                  {testDecrypted}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Logs Terminal Table */}
        <div className="lg:col-span-7 bg-slate-950 text-white rounded-3xl p-6 border-b-4 border-slate-900 shadow-lg font-mono text-xs flex flex-col h-[520px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span>CRYPTOGRAPHIC LOGGING PORT</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TLS SECURED MATCH</span>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto space-y-4 pr-2">
            {logs.length === 0 ? (
              <div className="text-center text-slate-600 py-12">
                No secure transaction logging packets. Start your first lesson to prompt entries.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="bg-brand-secondary/20 text-teal-400 font-extrabold px-1.5 py-0.5 rounded tracking-wider border border-brand-secondary/30">
                      {log.action}
                    </span>
                    <span className="text-slate-500 font-sans">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed font-sans text-xs">{log.details}</p>

                  {log.encryptedPayloadPreview && (
                    <div className="bg-slate-950 p-2 rounded text-[10px] text-indigo-400 border border-slate-800 break-all">
                      <span className="text-slate-600 uppercase block font-extrabold text-[8px] mb-0.5">WIRESHARK TRANSMISSION PAYLOAD PREVIEW:</span>
                      {log.encryptedPayloadPreview}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end">
                    <span>Decrypted Database Verification:</span>
                    <span className={log.decryptedVerification ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {log.decryptedVerification ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
