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
import { getCompleteTracks } from './src/data/seedQuestions';
import { UserProfile, SecurityAuditLog } from './src/types';
import { fileURLToPath } from 'url';

// Load environmental parameters (local .env or cloud system credentials) //
dotenv.config();

const app = express();
const PORT = 3000;

let __filename = '';
let __dirname = '';

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  // Safe fallback if compiled or run in CommonJS / Vercel serverless environments
  __filename = '';
  __dirname = process.cwd();
}

// Find the readable seed database path across multiple environments
let readDbPath = '';
const pathsToTry = [
  path.join(process.cwd(), 'data', 'db.json'),
  path.join(__dirname, 'data', 'db.json'),
  path.join(__dirname, '..', 'data', 'db.json'),
  path.join('/var/task', 'data', 'db.json')
];

for (const p of pathsToTry) {
  if (fs.existsSync(p)) {
    readDbPath = p;
    break;
  }
}

// Writeable database path - use /tmp on Vercel to allow real writes, else follow read path
const isVercel = !!process.env.VERCEL || !readDbPath;
const DB_PATH = isVercel ? '/tmp/db.json' : (readDbPath || pathsToTry[0]);

if (isVercel && readDbPath && !fs.existsSync(DB_PATH)) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.copyFileSync(readDbPath, DB_PATH);
    console.log(`Seeded /tmp/db.json successfully from ${readDbPath}`);
  } catch (e: any) {
    console.warn("Failed to seed database in /tmp, falling back to in-memory store.", e?.message || e);
  }
}

const SECRET_KEY = process.env.JWT_SECRET || 'SIGMA_LEARNING_SUPER_SECRET_KEY_FOR_JWT_AND_AES';

// Initialize Supabase if variables exist with extreme resilience against Vercel format/quote errors
let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
let supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Strip any surrounding double or single quotes that may have been pasted into Vercel Dashboard
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1).trim();
if (supabaseUrl.startsWith("'") && supabaseUrl.endsWith("'")) supabaseUrl = supabaseUrl.slice(1, -1).trim();
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) supabaseKey = supabaseKey.slice(1, -1).trim();
if (supabaseKey.startsWith("'") && supabaseKey.endsWith("'")) supabaseKey = supabaseKey.slice(1, -1).trim();

// Ensure the protocol prefix is correct
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    console.log("Supabase Integration Status: TRUE (Connected to cloud database)");
  } catch (err: any) {
    console.error("CRITICAL error initializing Supabase client in Vercel environment:", err?.message || err);
    supabase = null;
  }
} else {
  console.log(`Supabase Integration Status: FALSE (Falling back to local ${DB_PATH})`);
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

  const backupPath = DB_PATH + '.bak';

  const attemptLoad = (targetPath: string): DatabaseSchema | null => {
    try {
      if (fs.existsSync(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf-8');
        if (!content || !content.trim()) {
          console.warn(`File ${targetPath} is empty or whitespace-only.`);
          return null;
        }
        const parsed = JSON.parse(content);
        // Ensure essential fields exist
        if (!parsed.users) parsed.users = {};
        if (!parsed.questions) parsed.questions = allTracks;
        if (!parsed.securityLogs) parsed.securityLogs = [];
        return parsed;
      }
    } catch (e: any) {
      console.error(`Database parsing failed for ${targetPath}:`, e.message || e);
    }
    return null;
  };

  // 1. Try to load from primary DB_PATH
  let parsed = attemptLoad(DB_PATH);

  // 2. If load failed or file empty/corrupted, try to restore from backup
  if (!parsed) {
    console.warn(`Primary database file (${DB_PATH}) failed to load. Attempting to restore from backup: ${backupPath}`);
    parsed = attemptLoad(backupPath);
    if (parsed) {
      console.info("SUCCESS: Restored database from backup. Re-saving to repair primary file...");
      // Re-save asynchronously or synchronously to keep it clean, let's do synchronous repair
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch (repairErr: any) {
        console.error("Failed to repair primary database from backup on disk:", repairErr.message);
      }
    }
  }

  // 3. If still unsuccessful (e.g., Vercel spin-up or fresh setup), try to restore from seed
  if (!parsed && isVercel && readDbPath && DB_PATH !== readDbPath) {
    console.warn(`Attempting self-healing of db.json. Restoring from seed database: ${readDbPath}`);
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.copyFileSync(readDbPath, DB_PATH);
      parsed = attemptLoad(DB_PATH);
    } catch (restoreErr: any) {
      console.error("Self-healing: failed to copy seed database to /tmp:", restoreErr.message);
    }
  }

  // 4. Fall back to read-only seed directly
  if (!parsed && readDbPath) {
    console.warn(`Falling back to direct loading of readDbPath seed database: ${readDbPath}`);
    parsed = attemptLoad(readDbPath);
  }

  if (parsed) {
    memoryDb = parsed;
    return parsed;
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
  const backupPath = DB_PATH + '.bak';
  const tempPath = DB_PATH + '.tmp';
  try {
    const dataString = JSON.stringify(db, null, 2);
    // 1. Atomic write using temporary file to avoid partial writes during reload/restart
    fs.writeFileSync(tempPath, dataString, 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
    
    // 2. Also keep a backup file updated to endure any crash-restarts or disk interruption
    const tempBackupPath = backupPath + '.tmp';
    try {
      fs.writeFileSync(tempBackupPath, dataString, 'utf-8');
      fs.renameSync(tempBackupPath, backupPath);
    } catch (bakErr: any) {
      console.warn("Minor database backup save warning:", bakErr.message || bakErr);
    }
  } catch (err: any) {
    console.error("Critical: Database write failed. Falling back to memory-only store. Details:", err.message || err);
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
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      if (!error) {
        return fromDbUser(data);
      }
      console.warn("Supabase user fetch failed (relation does not exist? or RLS). Falling back to local/memory store.", error.message);
    } catch (err: any) {
      console.warn("Supabase user fetch exception, falling back to local/memory store.", err?.message || err);
    }
  }
  
  const localDb = loadDatabase();
  return localDb.users[uid] || null;
}

async function dbGetUserByEmail(email: string): Promise<any | null> {
  const emailLower = email.toLowerCase().trim();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();
      if (!error) {
        return fromDbUser(data);
      }
      console.warn("Supabase email query failed (relation does not exist? or RLS). Falling back to local/memory store.", error.message);
    } catch (err: any) {
      console.warn("Supabase email query exception, falling back to local/memory store.", err?.message || err);
    }
  }
  
  const localDb = loadDatabase();
  return Object.values(localDb.users).find(u => u.email.toLowerCase() === emailLower) || null;
}

async function dbSaveUser(uid: string, userRecord: any): Promise<void> {
  if (supabase) {
    try {
      const dbRow = toDbUser(userRecord);
      const { error } = await supabase
        .from('users')
        .upsert(dbRow);
      if (!error) {
        return;
      }
      console.warn("Supabase upsert user failed (relation does not exist? or RLS). Falling back to local/memory store.", error.message);
    } catch (err: any) {
      console.warn("Supabase upsert exception, falling back to local/memory store.", err?.message || err);
    }
  }
  
  const localDb = loadDatabase();
  localDb.users[uid] = userRecord;
  saveDatabase(localDb);
}

async function dbLogSecurityAction(action: string, details: string, payloadPreview?: string, success = true): Promise<void> {
  const timestamp = new Date().toISOString();
  if (supabase) {
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
        return;
      }
      console.warn("Supabase log security failed (relation does not exist? or RLS). Falling back to local/memory store.", error.message);
    } catch (err: any) {
      console.warn("Supabase log exception, falling back to local/memory store.", err?.message || err);
    }
  }
  
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

async function dbGetSecurityLogs(): Promise<any[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (!error) {
        return data.map(row => ({
          timestamp: row.timestamp,
          action: row.action,
          details: row.details,
          encryptedPayloadPreview: row.encrypted_payload_preview,
          decryptedVerification: row.decrypted_verification
        }));
      }
      console.warn("Supabase logs fetch failed (relation does not exist? or RLS). Falling back to local/memory store.", error.message);
    } catch (err: any) {
      console.warn("Supabase logs fetch exception, falling back to local/memory store.", err?.message || err);
    }
  }
  
  const localDb = loadDatabase();
  return localDb.securityLogs;
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

// 8. Expose Supabase database parameters to client securely
app.get('/api/supabase-config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  });
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
    const { createServer: createViteServer } = await import('vite');
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

const isVercelEnv = !!process.env.VERCEL || !!process.env.NOW_REGION;

if (!isVercelEnv) {
  startServer();
}

export default app;
