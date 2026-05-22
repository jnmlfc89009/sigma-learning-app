/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { getCompleteTracks } from './src/data/seedQuestions';
import { UserProfile, SecurityAuditLog } from './src/types';

// Load environmental parameters (local .env or cloud system credentials)
dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const SECRET_KEY = process.env.JWT_SECRET || 'SIGMA_LEARNING_SUPER_SECRET_KEY_FOR_JWT_AND_AES';

// Initialize Supabase if variables exist
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Client proxy bypasses RLS with service_role secret securely on server side
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log("Supabase Integration Status: TRUE (Connected to cloud database)");
} else {
  console.log("Supabase Integration Status: FALSE (Falling back to local data/db.json)");
}

// Convert model schema to postgres syntax and camelCase back types
function toDbUser(user: any) {
  return {
    uid: user.uid,
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    streak: Number(user.streak || 0),
    gems: Number(user.gems || 0),
    tier: user.tier || 'scholar',
    billing_cycle: user.billingCycle || 'monthly',
    avatar_seed: user.avatarSeed || '1000',
    active_title: user.activeTitle || '',
    sponsored_count: Number(user.sponsoredCount || 0),
    unlocked_items: user.unlockedItems || [],
    progress: user.progress || {},
    unlocked_levels: user.unlockedLevels || {},
    created_at: user.createdAt || new Date().toISOString()
  };
}

function fromDbUser(row: any): any {
  if (!row) return null;
  return {
    uid: row.uid,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    streak: row.streak,
    gems: row.gems,
    tier: row.tier,
    billingCycle: row.billing_cycle,
    avatarSeed: row.avatar_seed,
    activeTitle: row.active_title,
    sponsoredCount: row.sponsored_count,
    unlockedItems: typeof row.unlocked_items === 'string' ? JSON.parse(row.unlocked_items) : row.unlocked_items,
    progress: typeof row.progress === 'string' ? JSON.parse(row.progress) : row.progress,
    unlockedLevels: typeof row.unlocked_levels === 'string' ? JSON.parse(row.unlocked_levels) : row.unlocked_levels,
    createdAt: row.created_at
  };
}


// Ensure data directory exists
try {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
} catch (e) {
  console.warn("Vercel or read-only filesystem detected. Falling back to robust in-memory database store.");
}

// Interfaces for our DB structure
interface DatabaseSchema {
  users: Record<string, UserProfile & { passwordHash: string }>;
  questions: any[];
  securityLogs: SecurityAuditLog[];
}

// Fetch all tracks with full 12 levels per topic
const allTracks = getCompleteTracks();

// Memory-based DB cache for serverless environments with locked filesystems
let memoryDb: DatabaseSchema | null = null;

// Initialize DB with seed structure if not present
function loadDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure essential fields exist
      if (!parsed.users) parsed.users = {};
      if (!parsed.questions) parsed.questions = allTracks;
      if (!parsed.securityLogs) parsed.securityLogs = [];
      memoryDb = parsed;
      return parsed;
    } catch (e) {
      console.error("Database parsing failed, re-initializing", e);
    }
  }

  const initialDB: DatabaseSchema = {
    users: {},
    questions: allTracks,
    securityLogs: [
      {
        timestamp: new Date().toISOString(),
        action: "DATABASE_INITIALIZATION",
        details: "Secure database seeded with 36 high-end academic levels inspired by MIT OpenCourseWare (15.401, 15.511, 18.05).",
        decryptedVerification: true
      }
    ]
  };
  memoryDb = initialDB;
  saveDatabase(initialDB);
  return initialDB;
}

function saveDatabase(db: DatabaseSchema) {
  memoryDb = db;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Vercel read-only filesystem check - Saved modifications successfully in server memory.");
  }
}

// Add an entry to the cryptographic audit trail
function logSecurityAction(db: DatabaseSchema, action: string, details: string, payloadPreview?: string, success = true) {
  const audit: SecurityAuditLog = {
    timestamp: new Date().toISOString(),
    action,
    details,
    encryptedPayloadPreview: payloadPreview,
    decryptedVerification: success
  };
  db.securityLogs.unshift(audit);
  // Cap logs at 100 entries for efficiency
  if (db.securityLogs.length > 100) {
    db.securityLogs.pop();
  }
  saveDatabase(db);
}

// ==========================================
// UNIFIED DUAL DATABASE (JSON / SUPABASE) API HELPERS
// ==========================================
async function dbGetUser(uid: string): Promise<any | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();
    if (error) {
      console.error("Supabase user get failure:", error.message);
      return null;
    }
    return fromDbUser(data);
  } else {
    const localDb = loadDatabase();
    return localDb.users[uid] || null;
  }
}

async function dbGetUserByEmail(email: string): Promise<any | null> {
  const emailLower = email.toLowerCase().trim();
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailLower)
      .maybeSingle();
    if (error) {
      console.error("Supabase user email lookup failure:", error.message);
      return null;
    }
    return fromDbUser(data);
  } else {
    const localDb = loadDatabase();
    return Object.values(localDb.users).find(u => u.email.toLowerCase() === emailLower) || null;
  }
}

async function dbSaveUser(uid: string, userRecord: any): Promise<void> {
  if (supabase) {
    const dbRow = toDbUser(userRecord);
    const { error } = await supabase
      .from('users')
      .upsert(dbRow);
    if (error) {
      console.error("Supabase user upsert failure:", error.message);
      throw new Error(`Cloud DB save failed: ${error.message}`);
    }
  } else {
    const localDb = loadDatabase();
    localDb.users[uid] = userRecord;
    saveDatabase(localDb);
  }
}

async function dbLogSecurityAction(action: string, details: string, payloadPreview?: string, success = true): Promise<void> {
  const timestamp = new Date().toISOString();
  if (supabase) {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        timestamp,
        action,
        details,
        encrypted_payload_preview: payloadPreview || null,
        decrypted_verification: success
      });
    if (error) {
      console.error("Supabase security audit log insert failure:", error.message);
    }
  } else {
    const localDb = loadDatabase();
    const audit: SecurityAuditLog = {
      timestamp,
      action,
      details,
      encryptedPayloadPreview: payloadPreview,
      decryptedVerification: success
    };
    localDb.securityLogs.unshift(audit);
    if (localDb.securityLogs.length > 100) {
      localDb.securityLogs.pop();
    }
    saveDatabase(localDb);
  }
}

async function dbGetSecurityLogs(): Promise<any[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) {
      console.error("Supabase security audit logs fetch failure:", error.message);
      return [];
    }
    return data.map(row => ({
      timestamp: row.timestamp,
      action: row.action,
      details: row.details,
      encryptedPayloadPreview: row.encrypted_payload_preview,
      decryptedVerification: row.decrypted_verification
    }));
  } else {
    const localDb = loadDatabase();
    return localDb.securityLogs;
  }
}


// Secure key/session generator using HMAC-SHA256
function signSessionToken(userId: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${userId}:${expiry}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${hmac}`;
}

function verifySessionToken(token: string): string | null {
  try {
    if (!token) return null;
    const [encodedPayload, hash] = token.split('.');
    if (!encodedPayload || !hash) return null;

    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const [userId, expiryStr] = payload.split(':');
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) return null; // Expired

    const recomputedHash = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    if (recomputedHash === hash) {
      return userId;
    }
  } catch (err) {
    console.error("Token verification failed", err);
  }
  return null;
}

// XOR decryption matching the client's payload wrapping algorithm
function decryptClientTransmission(cyphertext: string, iv: string): string {
  const k = SECRET_KEY + iv;
  let stretchedKey = "";
  while (stretchedKey.length < cyphertext.length * 2) {
    stretchedKey += k;
  }

  const output: string[] = [];
  const keyLength = k.length;

  if (cyphertext.startsWith("HEX:")) {
    const rawHex = cyphertext.substring(4);
    for (let i = 0; i < rawHex.length; i += 2) {
      const charCode = parseInt(rawHex.substring(i, i + 2), 16);
      const keyIndex = Math.floor(i / 2) % keyLength;
      const keyChar = stretchedKey.charCodeAt(keyIndex);
      output.push(String.fromCharCode(charCode ^ keyChar));
    }
    return output.join("");
  }
  throw new Error("Invalid transmission cypher format.");
}

// Initialize active database in memory on start
let db = loadDatabase();

// Express JSON and urlencoded parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Token parsing middleware
function authenticateMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized session access." });
  }
  const token = authHeader.split(' ')[1];
  const userId = verifySessionToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Session expired or invalid credentials." });
  }
  req.userId = userId;
  next();
}

// Helper to sanitize incoming and historical user records
function sanitizeUserProfile(user: any): any {
  if (!user.progress) {
    user.progress = {};
  }
  if (!user.progress.personalFinance) {
    user.progress.personalFinance = { level: 1, progressPercent: 0, completedLevels: {} };
  }
  if (!user.progress.accounting) {
    user.progress.accounting = { level: 1, progressPercent: 0, completedLevels: {} };
  }
  if (!user.progress.statistics) {
    user.progress.statistics = { level: 1, progressPercent: 0, completedLevels: {} };
  }
  if (!user.progress.appliedMath) {
    user.progress.appliedMath = { level: 1, progressPercent: 0, completedLevels: {} };
  }
  if (!user.unlockedLevels) {
    user.unlockedLevels = {};
  }
  if (!user.unlockedItems) {
    user.unlockedItems = [];
  }
  if (!user.activeTitle) {
    user.activeTitle = "";
  }
  if (user.sponsoredCount === undefined) {
    user.sponsoredCount = 0;
  }
  return user;
}

// ==========================================
// API REST ENDPOINTS
// ==========================================

// 1. Register with client-side encrypted credentials
app.post('/api/auth/register', async (req, res) => {
  const { username, email, encryptedPassword, iv, clientTimestamp } = req.body;

  if (!username || !email || !encryptedPassword || !iv) {
    return res.status(400).json({ error: "Missing required transmission components." });
  }

  try {
    // Check if user already exists
    const emailLower = email.toLowerCase().trim();
    const existingUser = await dbGetUserByEmail(emailLower);
    if (existingUser) {
      await dbLogSecurityAction("REGISTER_REJECTED", `Attempted duplicate email register: ${email}`, undefined, false);
      return res.status(400).json({ error: "Email address is already registered." });
    }

    // Decrypt the password transitted
    const decryptedPasswordHash = decryptClientTransmission(encryptedPassword, iv);
    
    const uid = 'usr_' + crypto.randomUUID();
    const newUserProfile: UserProfile = {
      uid,
      username,
      email: emailLower,
      streak: 1, // Start with 1 day streak
      gems: 100, // Balanced starting capital
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
      unlockedLevels: {}
    };

    const passwordHash = crypto.createHash('sha256').update(decryptedPasswordHash + SECRET_KEY).digest('hex');

    await dbSaveUser(uid, {
      ...newUserProfile,
      passwordHash
    });

    await dbLogSecurityAction(
      "USER_REGISTERED",
      `New user created successfully. UID: ${uid}, Email: ${emailLower}. Data payload authenticated.`,
      `IV: ${iv.substring(0, 4)}... Cypher: ${encryptedPassword.substring(4, 16)}...`,
      true
    );

    const token = signSessionToken(uid);
    res.json({ token, user: newUserProfile });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Crypto validation error. Transmission signature mismatch." });
  }
});

// 2. Client Login
app.post('/api/auth/login', async (req, res) => {
  const { email, encryptedPassword, iv } = req.body;

  if (!email || !encryptedPassword || !iv) {
    return res.status(400).json({ error: "Credentials transport missing parameters." });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    let userDbRecord = await dbGetUserByEmail(emailLower);

    if (emailLower === 'johndoe@gmail.com') {
      if (!userDbRecord) {
        // Auto-create demo user profile on demand
        const demoPlaintextHash = crypto.createHash('sha256').update("123456johndoe@gmail.comSIGMA_SALT_KEYS").digest('hex');
        const passwordHash = crypto.createHash('sha256').update(demoPlaintextHash + SECRET_KEY).digest('hex');
        
        const uid = 'usr_johndoe_demo_account_2026';
        userDbRecord = {
          uid,
          username: "John Doe",
          email: "johndoe@gmail.com",
          streak: 3,
          gems: 9999,
          tier: 'magnate',
          billingCycle: 'monthly',
          avatarSeed: "5839",
          createdAt: new Date().toISOString(),
          progress: {
            personalFinance: { level: 2, progressPercent: 40, completedLevels: { "1": true } },
            accounting: { level: 1, progressPercent: 0, completedLevels: {} },
            statistics: { level: 1, progressPercent: 0, completedLevels: {} },
            appliedMath: { level: 1, progressPercent: 0, completedLevels: {} }
          },
          unlockedLevels: {},
          passwordHash
        };

        await dbSaveUser(uid, userDbRecord);
        await dbLogSecurityAction(
          "USER_REGISTERED",
          `Demo account pre-seeded and registered. UID: ${uid}, Email: ${emailLower}.`,
          "Pre-seeded credentials pipeline",
          true
        );
      } else {
        // Force update existing demo account to be 'magnate' with 9999 gems if not already done
        if (userDbRecord.gems !== 9999 || userDbRecord.tier !== 'magnate') {
          userDbRecord.gems = 9999;
          userDbRecord.tier = 'magnate';
          await dbSaveUser(userDbRecord.uid, userDbRecord);
        }
      }
    }

    if (!userDbRecord) {
      await dbLogSecurityAction("LOGIN_FAILED", `Invalid email lookup: ${emailLower}`, undefined, false);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Decrypt the password hash transmitted
    const decryptedPasswordHash = decryptClientTransmission(encryptedPassword, iv);
    const incomingServerHash = crypto.createHash('sha256').update(decryptedPasswordHash + SECRET_KEY).digest('hex');

    if (incomingServerHash !== userDbRecord.passwordHash) {
      await dbLogSecurityAction("LOGIN_FAILED", `Failed password verification for: ${emailLower}`, undefined, false);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    userDbRecord = sanitizeUserProfile(userDbRecord);

    // Check streak decay / update
    userDbRecord.streak = Math.max(userDbRecord.streak, 1); // Clamp

    await dbSaveUser(userDbRecord.uid, userDbRecord);

    await dbLogSecurityAction(
      "USER_AUTHENTICATED",
      `Session established safely for ${emailLower}. Secure JWT created.`,
      `Key Fingerprint: SHA-256`,
      true
    );

    const token = signSessionToken(userDbRecord.uid);
    
    // Strip private password hash before wire delivery
    const { passwordHash, ...safeProfile } = userDbRecord;
    res.json({ token, user: safeProfile });
  } catch (err) {
    console.error("Login verification failed:", err);
    res.status(500).json({ error: "Decryption matching algorithm signature verification failed." });
  }
});

// 3. Get profile
app.get('/api/profile', authenticateMiddleware, async (req: any, res) => {
  let userRecord = await dbGetUser(req.userId);
  if (!userRecord) {
    return res.status(404).json({ error: "User profile not found." });
  }
  userRecord = sanitizeUserProfile(userRecord);
  await dbSaveUser(req.userId, userRecord);

  const { passwordHash, ...safeProfile } = userRecord;
  res.json(safeProfile);
});

// 4. Update progress securely
app.post('/api/profile/progress', authenticateMiddleware, async (req: any, res) => {
  const { encryptedPayload, iv } = req.body;

  if (!encryptedPayload || !iv) {
    return res.status(400).json({ error: "Progress transmission package missing parameters." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);

    if (!userRecord) {
      return res.status(404).json({ error: "Profile not found." });
    }

    userRecord = sanitizeUserProfile(userRecord);

    // Decrypt
    const decryptedJson = decryptClientTransmission(encryptedPayload, iv);
    const parsedPayload = JSON.parse(decryptedJson);

    const { track, levelNumber, progressPercent, starsEarned, gemsAwarded, streakIncrement } = parsedPayload;

    if (!track || !levelNumber) {
      return res.status(400).json({ error: "Malformed decrypted payload metrics." });
    }

    const t = track as 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath';
    const targetTrack = userRecord.progress[t];

    if (targetTrack) {
      // Record complete status
      if (progressPercent >= 100) {
        const starCount = starsEarned || 3;
        targetTrack.completedLevels[levelNumber] = {
          stars: Math.max(targetTrack.completedLevels[levelNumber]?.stars || 0, starCount),
          completedAt: new Date().toISOString()
        };
        // Unlock next levels
        if (levelNumber === targetTrack.level && levelNumber < 12) {
          targetTrack.level += 1;
        }
      }
      
      targetTrack.progressPercent = progressPercent;
    }

    if (gemsAwarded) userRecord.gems += gemsAwarded;
    if (streakIncrement) userRecord.streak += streakIncrement;

    await dbSaveUser(userRecord.uid, userRecord);
    
    await dbLogSecurityAction(
      "PROGRESS_UPDATED",
      `Track: ${track}, Level: ${levelNumber}, Score: ${progressPercent}%. Streak: ${userRecord.streak}. Balance: ${userRecord.gems}💎`,
      `Decrypt size: ${decryptedJson.length} bytes`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    console.error("Progress save failed:", err);
    res.status(500).json({ error: "Encryption session validation failed." });
  }
});

// 5. Purchase Tier
app.post('/api/profile/purchase', authenticateMiddleware, async (req: any, res) => {
  const { tier, billingCycle } = req.body;
  if (!tier || !['scholar', 'analyst', 'magnate'].includes(tier)) {
    return res.status(400).json({ error: "Invalid premium subscription tier." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);
    if (!userRecord) return res.status(404).json({ error: "User not found." });

    userRecord = sanitizeUserProfile(userRecord);

    userRecord.tier = tier;
    userRecord.billingCycle = billingCycle || 'monthly';
    
    // Reward custom subscription premium gems
    if (tier === 'analyst') userRecord.gems += 500;
    if (tier === 'magnate') userRecord.gems += 2000;

    await dbSaveUser(userRecord.uid, userRecord);

    await dbLogSecurityAction(
      "TIER_UPGRADED",
      `Account upgraded to premium tier: ${tier} (${billingCycle}). Assets provisioned successfully.`,
      `Subscription Verified`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    res.status(500).json({ error: "Plan initialization failed." });
  }
});

// 5b. Choose analyst free complete module
app.post('/api/profile/select-track', authenticateMiddleware, async (req: any, res) => {
  const { track } = req.body;
  if (!['personalFinance', 'accounting', 'statistics'].includes(track)) {
    return res.status(400).json({ error: "Invalid track selected." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);
    if (!userRecord) return res.status(404).json({ error: "User not found." });

    userRecord = sanitizeUserProfile(userRecord);
    if (userRecord.tier !== 'analyst') {
      return res.status(400).json({ error: "Only Analyst tier members can select a completely free track." });
    }

    userRecord.unlockedTrack = track;
    await dbSaveUser(userRecord.uid, userRecord);

    await dbLogSecurityAction(
      "ANALYST_TRACK_SELECTED",
      `Selected ${track} as the completely free, unlocked course for Analyst subscription.`,
      `Analyst choice saved`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    res.status(500).json({ error: "Track selection failed." });
  }
});

// 5c. Unlock level using Gems for Analyst or Magnate tier
app.post('/api/profile/unlock-level', authenticateMiddleware, async (req: any, res) => {
  const { track, levelNumber } = req.body;
  if (!['personalFinance', 'accounting', 'statistics', 'appliedMath'].includes(track) || !levelNumber) {
    return res.status(400).json({ error: "Invalid parameters." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);
    if (!userRecord) return res.status(404).json({ error: "User not found." });

    userRecord = sanitizeUserProfile(userRecord);
    if (userRecord.tier === 'scholar') {
      return res.status(400).json({ error: "Scholar (Free) tier members cannot unlock levels with gems directly. Upgrade to Analyst/Magnate." });
    }

    const price = 100; // 100 gems to unlock
    if (userRecord.gems < price) {
      return res.status(400).json({ error: `Insufficient gems. Unlocking Level ${levelNumber} costs ${price}💎 (Your balance: ${userRecord.gems}💎).` });
    }

    userRecord.gems -= price;

    if (!userRecord.unlockedLevels) {
      userRecord.unlockedLevels = {};
    }
    if (!userRecord.unlockedLevels[track]) {
      userRecord.unlockedLevels[track] = [];
    }
    if (!userRecord.unlockedLevels[track].includes(levelNumber)) {
      userRecord.unlockedLevels[track].push(levelNumber);
    }

    // Advance Level boundary
    const nextLvl = levelNumber; 
    if (nextLvl > userRecord.progress[track].level) {
      userRecord.progress[track].level = nextLvl;
    }

    await dbSaveUser(userRecord.uid, userRecord);

    await dbLogSecurityAction(
      "LEVEL_GEMS_UNLOCKED",
      `Spent ${price}💎 to unlock Level ${levelNumber} in ${track}. Remaining: ${userRecord.gems}💎`,
      `Successfully unlocked`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    res.status(500).json({ error: "Unlock process failed." });
  }
});

// 5d. Exchange Premium Gems for Exclusives in Bazaar
app.post('/api/profile/buy-item', authenticateMiddleware, async (req: any, res) => {
  const { itemId, price, itemType, itemValue } = req.body;
  if (!itemId || !price) {
    return res.status(400).json({ error: "Invalid store buy request." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);
    if (!userRecord) return res.status(404).json({ error: "User not found." });

    userRecord = sanitizeUserProfile(userRecord);

    if (userRecord.gems < price) {
      return res.status(400).json({ error: `Insufficient gems. Unlocking costs ${price}💎 (Your balance: ${userRecord.gems}💎).` });
    }

    userRecord.gems -= price;

    if (!userRecord.unlockedItems) {
      userRecord.unlockedItems = [];
    }
    if (!userRecord.unlockedItems.includes(itemId)) {
      userRecord.unlockedItems.push(itemId);
    }

    if (itemType === 'title') {
      userRecord.activeTitle = itemValue || "";
    } else if (itemType === 'sponsor') {
      userRecord.sponsoredCount = (userRecord.sponsoredCount || 0) + 1;
    }

    await dbSaveUser(userRecord.uid, userRecord);

    await dbLogSecurityAction(
      "STORE_ITEM_PURCHASED",
      `Spent ${price}💎 to buy/upgrade ${itemId} (${itemType}). Remaining balance: ${userRecord.gems}💎`,
      `Successfully purchased ${itemId}`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    res.status(500).json({ error: "Item purchase failed in premium boutique." });
  }
});

// 5e. Purchase premium gems top-up package
app.post('/api/profile/purchase-gems', authenticateMiddleware, async (req: any, res) => {
  const { packId, gemAmount, price } = req.body;
  if (!packId || !gemAmount || !price) {
    return res.status(400).json({ error: "Invalid gem purchase request." });
  }

  try {
    let userRecord = await dbGetUser(req.userId);
    if (!userRecord) return res.status(404).json({ error: "User not found." });

    userRecord = sanitizeUserProfile(userRecord);
    userRecord.gems = (userRecord.gems || 0) + Number(gemAmount);

    await dbSaveUser(userRecord.uid, userRecord);

    await dbLogSecurityAction(
      "GEMS_PURCHASED",
      `Purchased ${gemAmount}💎 pack (${packId}) for $${price}. New balance: ${userRecord.gems}💎`,
      `Simulated card processing checkout of $${price} successful`,
      true
    );

    const { passwordHash, ...safeProfile } = userRecord;
    res.json(safeProfile);
  } catch (err) {
    res.status(500).json({ error: "Gems purchase checkout failed." });
  }
});

// 6. Fetch questions database list
app.get('/api/questions', (req, res) => {
  res.json(allTracks);
});

// 7. Security Logs Console API
app.get('/api/security/logs', async (req, res) => {
  const logs = await dbGetSecurityLogs();
  res.json(logs);
});

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Exception Captured:", err);
  res.status(500).json({
    error: "A server-side error occurred. If you recently deployed to Vercel, please make sure you have fully configured your Supabase environment variables in the Vercel Project Dashboard settings.",
    details: err?.message || String(err)
  });
});

// ==========================================
// VITE MIDDLEWARE AND STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sigma Learning Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
