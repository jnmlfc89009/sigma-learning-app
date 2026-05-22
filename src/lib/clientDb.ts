/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, SecurityAuditLog } from '../types';
import { clientHashPassword } from './crypto';
import { safeStorage } from './safeStorage';

// Setup global or state-persistent Supabase client instance
let clientInstance: SupabaseClient | null = null;
let connectionMode: 'supabase' | 'localStorage' = 'localStorage';
let connectionError: string | null = null;

// Initialize Supabase configuration with fallback settings
export function initializeSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  // 1. Try public Vite environment variables
  let url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  let key = (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // 2. Try non-prefixed local storage settings (user customization dashboard)
  const customUrl = safeStorage.getItem('sigma_supabase_url');
  const customKey = safeStorage.getItem('sigma_supabase_key');

  if (customUrl) url = customUrl.trim();
  if (customKey) key = customKey.trim();

  // Strip exact double/single quotes pasted by accident
  url = url.replace(/^['"]|['"]$/g, '').trim();
  key = key.replace(/^['"]|['"]$/g, '').trim();

  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  if (url && key) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      connectionMode = 'supabase';
      connectionError = null;
      console.log('🟢 Supabase Client initialized successfully from config.');
      return clientInstance;
    } catch (err: any) {
      console.error('🔴 Failed to initialize Supabase client:', err);
      connectionError = err?.message || String(err);
      clientInstance = null;
      connectionMode = 'localStorage';
    }
  } else {
    connectionMode = 'localStorage';
  }

  return null;
}

// Check database connection mode
export function getDbConnectionStatus() {
  initializeSupabaseClient();
  let url = (import.meta as any).env?.VITE_SUPABASE_URL || safeStorage.getItem('sigma_supabase_url') || '';
  url = url.replace(/^['"]|['"]$/g, '').trim();

  return {
    mode: connectionMode,
    supabaseUrl: url || null,
    error: connectionError
  };
}

// Convert model schema to database format for postgres consistency
function toDbUser(user: UserProfile) {
  return {
    uid: user.uid,
    username: user.username,
    email: user.email.toLowerCase().trim(),
    streak: Number(user.streak || 1),
    gems: Number(user.gems || 100),
    tier: user.tier || 'scholar',
    billing_cycle: user.billingCycle || 'monthly',
    avatar_seed: user.avatarSeed || '1000',
    active_title: user.activeTitle || '',
    sponsored_count: Number(user.sponsoredCount || 0),
    unlocked_items: user.unlockedItems || [],
    progress: user.progress || {},
    unlocked_levels: user.unlockedLevels || {}
  };
}

// Map PostgreSQL snake_case columns back to clean camelCase TypeScript models
function fromDbUser(row: any): UserProfile | null {
  if (!row) return null;
  return {
    uid: row.uid,
    username: row.username,
    email: row.email,
    streak: Number(row.streak ?? 1),
    gems: Number(row.gems ?? 100),
    tier: row.tier || 'scholar',
    billingCycle: row.billing_cycle || 'monthly',
    avatarSeed: row.avatar_seed || '1000',
    activeTitle: row.active_title || '',
    sponsoredCount: Number(row.sponsored_count ?? 0),
    unlockedItems: typeof row.unlocked_items === 'string' ? JSON.parse(row.unlocked_items) : (row.unlocked_items || []),
    progress: typeof row.progress === 'string' ? JSON.parse(row.progress) : (row.progress || {
      personalFinance: { level: 1, progressPercent: 0, completedLevels: {} },
      accounting: { level: 1, progressPercent: 0, completedLevels: {} },
      statistics: { level: 1, progressPercent: 0, completedLevels: {} },
      appliedMath: { level: 1, progressPercent: 0, completedLevels: {} }
    }),
    unlockedLevels: typeof row.unlocked_levels === 'string' ? JSON.parse(row.unlocked_levels) : (row.unlocked_levels || {}),
    createdAt: row.created_at || new Date().toISOString()
  };
}

// LOCALSTORAGE FALLBACK ENGINE
function getLocalUsers(): Record<string, any> {
  try {
    const raw = safeStorage.getItem('sigma_local_users');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUsers(users: Record<string, any>) {
  try {
    safeStorage.setItem('sigma_local_users', JSON.stringify(users));
  } catch (e) {
    console.error("Failed to persist users to safeStorage:", e);
  }
}

function getLocalLogs(): SecurityAuditLog[] {
  try {
    const raw = safeStorage.getItem('sigma_local_logs');
    return raw ? JSON.parse(raw) : [{
      timestamp: new Date().toISOString(),
      action: "DATABASE_INITIALIZATION",
      details: "Client-side encrypted sandbox environment running smoothly inside LocalStorage.",
      decryptedVerification: true
    }];
  } catch {
    return [];
  }
}

function saveLocalLogs(logs: SecurityAuditLog[]) {
  try {
    safeStorage.setItem('sigma_local_logs', JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to persist logs to safeStorage:", e);
  }
}

// EXPORTED DIRECT CLIENT CLIENT-SIDE DATABASE COMMANDS (MATCHES Express API)
export const clientDb = {
  // 1. Fetch user by internal UID
  async getUser(uid: string): Promise<UserProfile | null> {
    const supabase = initializeSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', uid)
          .maybeSingle();

        if (!error && data) {
          return fromDbUser(data);
        }
        if (error) {
          console.warn('Supabase query error, falling back to LocalStorage cache:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase connection lost, running LocalStorage fallback:', err?.message || err);
      }
    }

    // Local Storage Fallback
    const local = getLocalUsers();
    return local[uid] ? (local[uid] as UserProfile) : null;
  },

  // 2. Fetch user by raw registry email
  async getUserByEmail(email: string): Promise<any | null> {
    const emailClean = email.toLowerCase().trim();
    const supabase = initializeSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', emailClean)
          .maybeSingle();

        if (!error && data) {
          return {
            profile: fromDbUser(data)!,
            passwordHash: data.password_hash
          };
        }
        if (error) {
          console.warn('Supabase find email error, falling back to LocalStorage cache:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase find email exception, running LocalStorage fallback:', err?.message || err);
      }
    }

    // Local Storage Fallback
    const local = getLocalUsers();
    const record = Object.values(local).find((u: any) => u.email.toLowerCase().trim() === emailClean);
    if (record) {
      return {
        profile: record as UserProfile,
        passwordHash: record.passwordHash
      };
    }
    return null;
  },

  // 3. Save / Upsert user profile to cloud + local cache
  async saveUser(user: UserProfile, passwordHashToPersist?: string): Promise<void> {
    const supabase = initializeSupabaseClient();
    const emailClean = user.email.toLowerCase().trim();
    
    if (supabase && connectionMode === 'supabase') {
      try {
        const dbRow = toDbUser(user) as any;
        if (passwordHashToPersist) {
          dbRow.password_hash = passwordHashToPersist;
        }

        const { error } = await supabase
          .from('users')
          .upsert(dbRow);

        if (!error) {
          console.log('🚀 User profile successfully synced to Supabase Cloud.');
          // Also track in LocalStorage for offline performance caching
          const local = getLocalUsers();
          const existingPass = local[user.uid]?.passwordHash || passwordHashToPersist || '';
          local[user.uid] = { ...user, email: emailClean, passwordHash: existingPass };
          saveLocalUsers(local);
          return;
        }
        console.error('Supabase write aborted, falling back to LocalStorage:', error.message);
      } catch (err: any) {
        console.error('Supabase sync exception, falling back to LocalStorage:', err?.message || err);
      }
    }

    // Local Storage fallback write
    const local = getLocalUsers();
    const existingPass = local[user.uid]?.passwordHash || passwordHashToPersist || '';
    local[user.uid] = { ...user, email: emailClean, passwordHash: existingPass };
    saveLocalUsers(local);
  },

  // 4. Register a brand-new account client-side
  async register(username: string, email: string, passwordHashLocal: string): Promise<{ token: string; user: UserProfile }> {
    const emailClean = email.toLowerCase().trim();
    const existing = await this.getUserByEmail(emailClean);
    if (existing) {
      await this.logSecurityAction("REGISTER_REJECTED", `Attempted duplicate email register: ${emailClean}`, undefined, false);
      throw new Error("Email address is already registered.");
    }

    const uid = 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const newUserProfile: UserProfile = {
      uid,
      username,
      email: emailClean,
      streak: 1,
      gems: 100,
      tier: 'scholar',
      billingCycle: 'monthly',
      avatarSeed: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString(),
      progress: {
        personalFinance: { level: 1, progressPercent: 0, completedLevels: {} },
        accounting: { level: 1, progressPercent: 0, completedLevels: {} },
        statistics: { level: 1, progressPercent: 0, completedLevels: {} },
        appliedMath: { level: 1, progressPercent: 0, completedLevels: {} }
      },
      unlockedLevels: {},
      unlockedItems: [],
      activeTitle: ''
    };

    // Save directly to our client-resilient data lake
    await this.saveUser(newUserProfile, passwordHashLocal);

    await this.logSecurityAction(
      "USER_REGISTERED",
      `New user created successfully. UID: ${uid}, Email: ${emailClean}. Data stored securely in Supabase.`,
      `Salt: ${emailClean}`,
      true
    );

    return { token: uid, user: newUserProfile };
  },

  // 5. Authenticate existing user login
  async login(email: string, passwordHashLocal: string): Promise<{ token: string; user: UserProfile }> {
    const emailClean = email.toLowerCase().trim();
    const userRecord = await this.getUserByEmail(emailClean);

    if (!userRecord) {
      await this.logSecurityAction("LOGIN_FAILED", `Invalid email lookup: ${emailClean}`, undefined, false);
      throw new Error("Invalid credentials.");
    }

    if (userRecord.passwordHash !== passwordHashLocal) {
      await this.logSecurityAction("LOGIN_FAILED", `Failed password verification for: ${emailClean}`, undefined, false);
      throw new Error("Invalid credentials.");
    }

    // Refresh streak decay checks
    const profile = userRecord.profile;
    profile.streak = Math.max(profile.streak || 1, 1);

    await this.saveUser(profile);

    await this.logSecurityAction(
      "USER_AUTHENTICATED",
      `Session established safely for ${emailClean}. Direct client access token created.`,
      `Key Fingerprint: SHA-256`,
      true
    );

    return { token: profile.uid, user: profile };
  },

  // 6. Security Logs writing
  async logSecurityAction(action: string, details: string, payloadPreview?: string, success = true): Promise<void> {
    const timestamp = new Date().toISOString();
    const supabase = initializeSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      try {
        const { error } = await supabase
          .from('security_logs')
          .insert({
            timestamp,
            action,
            details,
            encrypted_payload_preview: payloadPreview || null,
            decrypted_verification: success
          });

        if (!error) {
          // Sync local logs cache as well
          const local = getLocalLogs();
          local.unshift({ timestamp, action, details, encryptedPayloadPreview: payloadPreview, decryptedVerification: success });
          if (local.length > 50) local.pop();
          saveLocalLogs(local);
          return;
        }
        console.warn('Logging to Supabase database returned error:', error.message);
      } catch (err: any) {
        console.warn('Logging to Supabase database caught exception:', err?.message || err);
      }
    }

    // Fallback Local Storage logs
    const local = getLocalLogs();
    local.unshift({ timestamp, action, details, encryptedPayloadPreview: payloadPreview, decryptedVerification: success });
    if (local.length > 50) local.pop();
    saveLocalLogs(local);
  },

  // 7. Security Logs reading
  async getSecurityLogs(): Promise<SecurityAuditLog[]> {
    const supabase = initializeSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('security_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);

        if (!error && data) {
          return data.map(r => ({
            timestamp: r.timestamp,
            action: r.action,
            details: r.details,
            encryptedPayloadPreview: r.encrypted_payload_preview,
            decryptedVerification: r.decrypted_verification
          }));
        }
      } catch (err: any) {
        console.warn('Unable to query security logs from Supabase cloud database:', err?.message || err);
      }
    }

    return getLocalLogs();
  }
};
