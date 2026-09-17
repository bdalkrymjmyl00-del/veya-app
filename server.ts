import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '5mb' }));

// CORS & preflight headers for all environments & iframes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Lazy initialization of Gemini client
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Account + cloud-sync storage.
// For hosted deployments, set DATABASE_URL to a Postgres connection string (Supabase/Render Postgres).
// Local development keeps the original JSON fallback so Veya remains easy to run offline.
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

type StoredUser = { id: string; email: string; salt: string; passwordHash: string; snapshot: Record<string, string>; createdAt: number; updatedAt: number };
const sessions = new Map<string, { userId: string; expiresAt: number }>();
const pgPool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 }) : null;
let pgReady: Promise<void> | null = null;

async function ensurePgSchema() {
  if (!pgPool) return;
  if (!pgReady) {
    pgReady = pgPool.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`).then(() => undefined);
  }
  await pgReady;
}

function readUsers(): StoredUser[] {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(users: StoredUser[]) { fs.writeFileSync(USERS_FILE, JSON.stringify(users), 'utf8'); }
function hashPassword(password: string, salt: string) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function makeToken(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  return token;
}
async function getUserFromRequest(req: Request): Promise<StoredUser | null> {
  const auth = req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) { if (token) sessions.delete(token); return null; }
  if (pgPool) {
    await ensurePgSchema();
    const { rows } = await pgPool.query('SELECT id,email,salt,password_hash,snapshot,created_at,updated_at FROM users WHERE id=$1', [session.userId]);
    const u = rows[0];
    return u ? { id: u.id, email: u.email, salt: u.salt, passwordHash: u.password_hash, snapshot: u.snapshot || {}, createdAt: Number(u.created_at), updatedAt: Number(u.updated_at) } : null;
  }
  return readUsers().find((u) => u.id === session.userId) || null;
}

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const snapshot = req.body?.snapshot && typeof req.body.snapshot === 'object' ? req.body.snapshot : {};
    if (!email || !email.includes('@') || password.length < 8) return res.status(400).json({ error: 'Use a valid email and a password of at least 8 characters.' });
    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const now = Date.now();
    if (pgPool) {
      await ensurePgSchema();
      const existing = await pgPool.query('SELECT 1 FROM users WHERE email=$1', [email]);
      if (existing.rowCount) return res.status(409).json({ error: 'An account with this email already exists.' });
      await pgPool.query('INSERT INTO users (id,email,salt,password_hash,snapshot,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id,email,salt,passwordHash,JSON.stringify(snapshot),now,now]);
    } else {
      const users = readUsers();
      if (users.some((u) => u.email === email)) return res.status(409).json({ error: 'An account with this email already exists.' });
      users.push({ id, email, salt, passwordHash, snapshot, createdAt: now, updatedAt: now });
      writeUsers(users);
    }
    const token = makeToken(id);
    res.json({ auth: { token, email, userId: id }, snapshot, hasData: Object.keys(snapshot).length > 0 });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Unable to create the account right now.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    let user: StoredUser | null = null;
    if (pgPool) {
      await ensurePgSchema();
      const { rows } = await pgPool.query('SELECT id,email,salt,password_hash,snapshot,created_at,updated_at FROM users WHERE email=$1', [email]);
      const u = rows[0];
      if (u) user = { id:u.id,email:u.email,salt:u.salt,passwordHash:u.password_hash,snapshot:u.snapshot||{},createdAt:Number(u.created_at),updatedAt:Number(u.updated_at) };
    } else {
      user = readUsers().find((u) => u.email === email) || null;
    }
    if (!user || !crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(hashPassword(password, user.salt), 'hex'))) return res.status(401).json({ error: 'Incorrect email or password.' });
    const token = makeToken(user.id);
    res.json({ auth: { token, email: user.email, userId: user.id }, snapshot: user.snapshot || {}, hasData: Object.keys(user.snapshot || {}).length > 0 });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.get('/api/sync', async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ snapshot: user.snapshot || {}, updatedAt: user.updatedAt });
});

app.put('/api/sync', async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const snapshot = req.body?.snapshot;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return res.status(400).json({ error: 'Invalid snapshot' });
  const updatedAt = Date.now();
  if (pgPool) {
    await ensurePgSchema();
    await pgPool.query('UPDATE users SET snapshot=$1, updated_at=$2 WHERE id=$3', [JSON.stringify(snapshot), updatedAt, user.id]);
  } else {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx < 0) return res.status(401).json({ error: 'Unauthorized' });
    users[idx] = { ...users[idx], snapshot, updatedAt };
    writeUsers(users);
  }
  res.json({ ok: true, updatedAt });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Available free-tier Gemini models in priority order
const FREE_TIER_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
];

// Safety settings configured with the least restrictive supported threshold (BLOCK_NONE)
// for developer-configurable categories so fictional roleplay, romance, emotional intimacy,
// and creative dialogue are not unnecessarily blocked.
// Built-in non-configurable safety protections remain completely active and uncircumvented.
const ROLEPLAY_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const isSafetyRefusal = (errOrObj: any): boolean => {
  if (!errOrObj) return false;
  const msg = (errOrObj.message || '').toLowerCase();
  const finishReason = errOrObj.candidates?.[0]?.finishReason;
  const blockReason = errOrObj.promptFeedback?.blockReason;
  return (
    finishReason === 'SAFETY' ||
    Boolean(blockReason) ||
    msg.includes('safety') ||
    msg.includes('blocked') ||
    msg.includes('harm_')
  );
};

const getNaturalSafetyRefusal = (characterName: string): string => {
  return `*hesitates, looking away with a quiet sigh* I won't cross that line. What else is on your mind?`;
};

const isTemporaryOrOverloadError = (err: any): boolean => {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || err?.status;
  return (
    code === 503 ||
    code === 429 ||
    code === 'UNAVAILABLE' ||
    code === 'RESOURCE_EXHAUSTED' ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('503') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('timeout')
  );
};

// Chat endpoint with streaming support and multi-model fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { character, userProfile, characterMemories, messages, stream = true } = req.body;

    if (!character || !character.name) {
      return res.status(400).json({ error: 'Character information is required' });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getGenAI();

    // Construct user profile context lines if provided
    const userProfileLines: string[] = [];
    if (userProfile && typeof userProfile === 'object') {
      const pName = typeof userProfile.name === 'string' ? userProfile.name.trim() : '';
      const pAge = typeof userProfile.age === 'string' ? userProfile.age.trim() : '';
      const pGender = typeof userProfile.gender === 'string' ? userProfile.gender.trim() : '';
      const pAppearance = typeof userProfile.appearance === 'string' ? userProfile.appearance.trim() : '';
      const pPersonality = typeof userProfile.personality === 'string' ? userProfile.personality.trim() : '';
      const pBackground = typeof userProfile.background === 'string' ? userProfile.background.trim() : '';
      const pInterests = typeof userProfile.interests === 'string' ? userProfile.interests.trim() : '';
      const pAdditional = typeof userProfile.additionalDetails === 'string' ? userProfile.additionalDetails.trim() : '';

      if (pName || pAge || pGender || pAppearance || pPersonality || pBackground || pInterests || pAdditional) {
        userProfileLines.push('');
        userProfileLines.push('USER CHARACTER PROFILE & CONTEXT:');
        userProfileLines.push('You are interacting with the user whose roleplay character identity is:');
        if (pName) userProfileLines.push(`- Name: ${pName}`);
        if (pAge) userProfileLines.push(`- Age: ${pAge}`);
        if (pGender) userProfileLines.push(`- Gender: ${pGender}`);
        if (pAppearance) userProfileLines.push(`- Appearance & Physical Description: ${pAppearance}`);
        if (pPersonality) userProfileLines.push(`- Persona & Demeanor: ${pPersonality}`);
        if (pBackground) userProfileLines.push(`- Background & History: ${pBackground}`);
        if (pInterests) userProfileLines.push(`- Interests & Hobbies: ${pInterests}`);
        if (pAdditional) userProfileLines.push(`- Additional Details: ${pAdditional}`);
        userProfileLines.push('');
        userProfileLines.push('RULES FOR USING THE USER PROFILE INFORMATION:');
        userProfileLines.push('- NATURAL & RELEVANT RECALL: You naturally know and remember this information as context for your relationship or encounter. Do NOT recite or list the entire profile unnecessarily. Only reference relevant details naturally and subtly when pertinent to the current moment.');
        userProfileLines.push('- STRICT USER AGENCY (NO PUPPETING): Having this user profile does NOT give you permission to speak for the user, write the user\'s dialogue, or decide what the user feels, thinks, or does. The user controls their own actions entirely.');
      }
    }

    // Construct character-specific memories context lines if provided
    const characterMemoryLines: string[] = [];
    if (Array.isArray(characterMemories) && characterMemories.length > 0) {
      characterMemoryLines.push('');
      characterMemoryLines.push(`YOUR LIVING MEMORY BANK WITH THIS USER (STRICTLY EXCLUSIVE TO YOU, ${character.name}):`);
      characterMemoryLines.push('You possess completely separate and independent long-term memories with the user from past conversations.');
      
      const events: string[] = [];
      const relationshipDev: string[] = [];
      const preferences: string[] = [];
      const facts: string[] = [];
      const promisesJokesConflicts: string[] = [];
      const otherMemories: string[] = [];

      characterMemories.forEach((mem: any) => {
        const text = typeof mem === 'string' ? mem : mem?.content;
        const cat = (typeof mem === 'object' && mem?.category) ? mem.category : 'other';
        if (!text || !text.trim()) return;

        const formatted = text.trim();
        if (cat === 'event') {
          events.push(formatted);
        } else if (cat === 'milestone' || cat === 'relationship') {
          relationshipDev.push(formatted);
        } else if (cat === 'preference') {
          preferences.push(formatted);
        } else if (cat === 'fact') {
          facts.push(formatted);
        } else if (cat === 'promise' || cat === 'joke' || cat === 'conflict') {
          promisesJokesConflicts.push(formatted);
        } else {
          otherMemories.push(formatted);
        }
      });

      if (events.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('🏛️ IMPORTANT EVENTS BETWEEN YOU AND THE USER:');
        events.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      if (relationshipDev.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('💫 RELATIONSHIP DEVELOPMENT & MEANINGFUL CHANGES:');
        relationshipDev.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      if (preferences.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('☕ USER PREFERENCES MENTIONED IN CONVERSATION:');
        preferences.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      if (facts.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('💡 IMPORTANT FACTS THE USER REVEALED:');
        facts.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      if (promisesJokesConflicts.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('🔒 PROMISES, CONFLICTS, INSIDE JOKES & SHARED EXPERIENCES:');
        promisesJokesConflicts.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      if (otherMemories.length > 0) {
        characterMemoryLines.push('');
        characterMemoryLines.push('📜 ADDITIONAL SHARED EXPERIENCES & CONTEXT:');
        otherMemories.forEach((m) => characterMemoryLines.push(`- ${m}`));
      }

      characterMemoryLines.push('');
      characterMemoryLines.push('CRITICAL RULES FOR CHARACTER MEMORY BEHAVIOR:');
      characterMemoryLines.push('1. STRICT INDEPENDENCE & ISOLATION: These memories belong strictly and exclusively to your relationship with this user. Memories from one character must NEVER be shared with or influenced by another character. My Profile is general user identity, but your memories are your personal shared history.');
      characterMemoryLines.push('2. USE MEMORIES NATURALLY WHEN RELEVANT: Only draw upon memories when they are naturally relevant to the current conversation topic or dynamic.');
      characterMemoryLines.push('3. DO NOT CONSTANTLY SAY "I REMEMBER": Never repeatedly tell the user that you "remember" something (avoid phrasing like "I remember you said...", "According to my memories...", or "I haven\'t forgotten that you like..."). Simply demonstrate familiarity through actions, gestures, and unspoken intimacy without announcing it.');
      characterMemoryLines.push('4. NEVER RECITE THE MEMORY LIST: Do not list or quote your memories during conversation.');
      characterMemoryLines.push('5. INFLUENCE RESPONSES NATURALLY IN-CHARACTER: Memories should shape your posture, tone, emotional closeness, level of trust, playful banter, or protective instinct while staying strictly in-character.');
    }

    // Construct detailed immersion system instructions for interactive Chai-style character chat
    const systemInstruction = [
      `You are ${character.name}. You are engaged in an interactive, real-time character roleplay chat with the user.`,
      `Your Persona and Core Traits: ${character.personality || 'Attentive, conversational, and expressive'}.`,
      `Your Background & Lore: ${character.background || 'A fictional individual with a rich past'}.`,
      `Your Speaking Style: ${character.speakingStyle || 'Natural, conversational, authentic to your personality'}.`,
      ...userProfileLines,
      ...characterMemoryLines,
      '',
      'OPENNESS, EMOTIONAL INTIMACY & NATURAL ROLEPLAY:',
      '- FULL IMMERSION IN FICTION: Respond naturally, openly, and flexibly to fictional conversations. Never break character, never deliver moral lectures, never add safety disclaimers, and never become unnaturally stiff, preachy, or formal.',
      '- NATURAL ROMANCE & ATTRACTION: Readily and naturally engage in romance, flirting, teasing, attraction, jealousy, emotional intimacy, relationship tension, and affectionate physical interactions (e.g., touches, hugs, caresses, kisses, leaning close, holding hands).',
      '- MATURE EMOTIONAL THEMES: Allow complex emotions, romantic tension, vulnerabilities, and mature storytelling themes to unfold smoothly whenever permitted by the model\'s safety rules. Do not unnecessarily restrict normal fictional roleplay, romance, or affection.',
      '- CHARACTER-DRIVEN BOUNDARIES: Do NOT make every character behave the same way. Your degree of openness, confidence, affection, jealousy, humor, flirtatiousness, and boundaries must be uniquely calibrated to your individual personality, lore, and speaking style (e.g., bold and seductive vs. shy and hesitant vs. gruff and protective).',
      '- BRIEF NATURAL HANDLING IF DISALLOWED: If a user request genuinely violates the underlying AI model\'s safety requirements, decline or deflect briefly and naturally IN CHARACTER, without long preachy lectures or lecturing explanations.',
      '',
      'RESPONSE LENGTH & INTERACTIVE PACING (CHAI-STYLE CHAT):',
      '- NATURAL MEDIUM LENGTH: Do not make replies extremely short, but avoid novel-length walls of text or long narrations.',
      '- A balanced response typically includes:',
      '  * 1–3 brief physical actions, gestures, or expressions in asterisks (*...*).',
      '  * 1–3 engaging lines of authentic dialogue in your character\'s distinct voice.',
      '  * Natural, personality-rich reactions or perceptive observations.',
      '- DESIRED PACING: Character action → Dialogue / reaction → Optional brief observation → STOP to let the user respond.',
      '',
      'LEAVE ROOM FOR THE USER TO REACT (NO SCENE AUTOPLAY):',
      '1. STOP AT THE INTERACTION POINT: Once you ask a question or initiate an interaction, STOP your message right there and wait for the user\'s response.',
      '2. NO POST-QUESTION ACTIONS: Never continue the scene, change the subject, or perform several new actions after asking a question.',
      '3. DO NOT RESOLVE THE INTERACTION: Never decide how the user reacts or answers. Never resolve the scene on your own.',
      '4. ONE INTERACTION PER MESSAGE: Do not turn a single message into a self-contained complete scene.',
      '',
      'ACTIVE OBSERVATION & INTUITIVE PERCEPTION:',
      '- Actively notice subtle details in the user\'s words, tone, actions, pauses, body language, or shifts in behavior (e.g. nervous, tired, upset, quiet, excited, guarded, flustered, jealous).',
      '- Make reasonable inferences from context and naturally weave in what you notice, without waiting for the user to explain everything.',
      '- NO MIND-READING: Keep observations grounded in plausible behavioral cues. Do not claim to read thoughts or know unstated external facts.',
      '',
      'STRICT USER AGENCY:',
      '- NEVER speak for the user, never write the user\'s dialogue, and never decide the user\'s actions, reactions, or feelings.',
    ].join('\n');

    // Format message history for @google/genai
    // Only pass user and model messages with non-empty text
    const formattedContents = messages
      .filter((m: { role: string; content: string }) => m.content && m.content.trim().length > 0)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (formattedContents.length === 0) {
      return res.status(400).json({ error: 'At least one message is required' });
    }

    // If stream is requested, use Server-Sent Events (SSE) with graceful model fallback
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }

      let streamStartedWriting = false;
      let lastError: any = null;

      for (let i = 0; i < FREE_TIER_MODELS.length; i++) {
        const model = FREE_TIER_MODELS[i];
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.85,
              topP: 0.95,
              maxOutputTokens: 450,
              safetySettings: ROLEPLAY_SAFETY_SETTINGS,
            },
          });

          for await (const chunk of responseStream) {
            if (isSafetyRefusal(chunk)) {
              if (!streamStartedWriting) {
                res.write(`data: ${JSON.stringify({ text: getNaturalSafetyRefusal(character.name) })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
                return;
              }
            }
            const textChunk = chunk.text || '';
            if (textChunk) {
              streamStartedWriting = true;
              res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
            }
          }

          if (streamStartedWriting) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            return;
          }
          console.warn(`Model ${model} completed stream without text, attempting fallback...`);
        } catch (streamError: any) {
          lastError = streamError;
          console.warn(`Streaming failed on model ${model}:`, streamError?.message || streamError);

          // If a non-configurable safety requirement blocks the response before writing, reply naturally in character
          if (isSafetyRefusal(streamError) && !streamStartedWriting) {
            res.write(`data: ${JSON.stringify({ text: getNaturalSafetyRefusal(character.name) })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
            return;
          }

          // If text chunks were already sent to client, we cannot cleanly restart streaming from another model
          if (streamStartedWriting) {
            res.write(`data: ${JSON.stringify({ error: streamError.message || 'Error generating response' })}\n\n`);
            res.end();
            return;
          }

          // If this is a temporary/high demand error or if we have further models, try the next fallback
          if (i < FREE_TIER_MODELS.length - 1 && (isTemporaryOrOverloadError(streamError) || !streamStartedWriting)) {
            console.log(`Fallback: Switching from ${model} to ${FREE_TIER_MODELS[i + 1]}...`);
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
        }
      }

      if (isSafetyRefusal(lastError)) {
        res.write(`data: ${JSON.stringify({ text: getNaturalSafetyRefusal(character.name) })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      const errorMessage = lastError?.message?.includes('high demand')
        ? 'The AI model is currently under high demand across servers. Please tap Retry in a few seconds.'
        : (lastError?.message || 'Error generating response. Please try again.');

      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
      return;
    } else {
      // Non-streaming fallback logic
      let lastError: any = null;
      for (let i = 0; i < FREE_TIER_MODELS.length; i++) {
        const model = FREE_TIER_MODELS[i];
        try {
          const response = await ai.models.generateContent({
            model,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.85,
              maxOutputTokens: 450,
              safetySettings: ROLEPLAY_SAFETY_SETTINGS,
            },
          });

          if (isSafetyRefusal(response)) {
            return res.json({ text: getNaturalSafetyRefusal(character.name), modelUsed: model });
          }

          const text = response.text || '';
          if (text.trim()) {
            return res.json({ text, modelUsed: model });
          }
        } catch (genError: any) {
          lastError = genError;
          console.warn(`Non-streaming generation failed on model ${model}:`, genError?.message || genError);

          if (isSafetyRefusal(genError)) {
            return res.json({ text: getNaturalSafetyRefusal(character.name), modelUsed: model });
          }

          if (i < FREE_TIER_MODELS.length - 1 && isTemporaryOrOverloadError(genError)) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
        }
      }

      if (isSafetyRefusal(lastError)) {
        return res.json({ text: getNaturalSafetyRefusal(character.name), modelUsed: 'safety-handling' });
      }

      throw lastError || new Error('Failed to generate response across candidate models');
    }
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    if (isSafetyRefusal(error)) {
      return res.json({
        text: getNaturalSafetyRefusal(req.body?.character?.name || 'Character'),
        modelUsed: 'safety-handling',
      });
    }
    return res.status(500).json({
      error: error.message || 'Failed to process character chat request',
    });
  }
});

// Endpoint to analyze dialogue and extract meaningful character-specific memories
app.post('/api/memories/extract', async (req: Request, res: Response) => {
  try {
    const { character, userProfile, recentMessages, existingMemories = [] } = req.body;

    if (!character?.name || !Array.isArray(recentMessages) || recentMessages.length === 0) {
      return res.json({ memories: [] });
    }

    const ai = getGenAI();
    const formattedConversation = recentMessages
      .map((m: any) => `${m.role === 'user' ? (userProfile?.name || 'User') : character.name}: ${m.content}`)
      .join('\n');

    const prompt = `You are an expert memory consolidation assistant for a character roleplay app.
Character: "${character.name}"
Personality: "${character.personality || ''}"
Background: "${character.background || ''}"
User Persona Name: "${userProfile?.name || 'User'}"

Existing memories for ${character.name}:
${existingMemories.length > 0 ? existingMemories.map((m: string) => `- ${m}`).join('\n') : '(None yet)'}

Recent dialogue exchange between User and ${character.name}:
${formattedConversation}

Task:
Determine if any NEW, MEANINGFUL, and SIGNIFICANT detail or event occurred that ${character.name} should remember for long-term continuity.
Focus specifically on these key pillars:
1. IMPORTANT EVENTS: Significant events or occurrences that happened between the user and ${character.name}.
2. RELATIONSHIP DEVELOPMENT & MEANINGFUL CHANGES: Progress in intimacy, vulnerability, confessions, shifts in dynamic, trust earned, or changes in how they treat each other.
3. USER PREFERENCES: Explicit likes, dislikes, habits, comforts, aesthetic tastes, or boundaries mentioned in conversation.
4. IMPORTANT FACTS: Personal facts, history, or secrets the user revealed about themselves.
5. PROMISES, CONFLICTS, JOKES & SHARED EXPERIENCES: Commitments made between ${character.name} and the user, inside jokes, lighthearted teasing, moments of conflict/tension or reconciliation, and memorable shared moments.

Rules:
- DO NOT PERMANENTLY SAVE EVERY MESSAGE: Prioritize meaningful, useful information that improves future conversations.
- STRICT FILTERING: Do NOT remember routine greetings, small talk, vague pleasantries, or generic dialogue (e.g. "User said hello", "User asked how character was doing").
- NO DUPLICATES: Do NOT re-extract anything already recorded in existing memories.
- PERSPECTIVE: Formulate each memory concisely from ${character.name}'s perspective (e.g., "The user dislikes crowded taverns and finds quiet cloisters soothing", "Shared a deeply vulnerable moment discussing old childhood memories during the midnight rain", "User is passionate about ancient star navigation").
- If nothing truly significant or memorable occurred, return an empty array.

Return ONLY a JSON object formatted strictly like this:
{"memories": [{"content": "concise description of the memory", "category": "preference"|"milestone"|"relationship"|"event"|"fact"|"promise"|"conflict"|"joke"|"other"}]}
`;

    let extracted: any[] = [];
    for (const model of FREE_TIER_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 350,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.memories)) {
          extracted = parsed.memories.filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 5);
          break;
        }
      } catch (err: any) {
        console.warn(`Memory extraction failed on model ${model}:`, err?.message || err);
      }
    }

    return res.json({ memories: extracted });
  } catch (error: any) {
    console.error('Error in /api/memories/extract:', error);
    return res.json({ memories: [] });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Veya server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
