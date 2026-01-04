import { createClient } from '@supabase/supabase-js';
/// <reference path="../deno-shim.d.ts" />
// Provide a lightweight local declaration so TypeScript (non-Deno envs) won't error.
declare const Deno: any;

// Load local .env as fallback (Deno only) for local development.
let localEnv: Record<string, string> = {};
try {
  if (typeof Deno !== 'undefined' && typeof Deno.readTextFile === 'function') {
    const envPath = new URL('../../../.env', import.meta.url).pathname;
    const text = await Deno.readTextFile(envPath);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      localEnv[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
} catch (e) {
  // ignore
}

function env(name: string) {
  const denoVal = (typeof Deno !== 'undefined' && Deno.env && typeof Deno.env.get === 'function') ? Deno.env.get(name) : undefined;
  return denoVal || localEnv[name] || '';
}

const SUPABASE_URL = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_ROLE');
const GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID');
const GOOGLE_OAUTH_CALLBACK = env('GOOGLE_OAUTH_CALLBACK') || env('GOOGLE_OAUTH_REDIRECT_URI');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase env not set for google-oauth function');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function randState(len = 32) {
  const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) s += symbols[buf[i] % symbols.length];
  return s;
}

async function storeState(user_id: string, state: string) {
  await supabase.from('oauth_states').insert([{ user_id, state, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }]);
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const redirectTo = params.get('redirectTo') || '';
    const scopes = params.get('scopes') || 'https://www.googleapis.com/auth/calendar';

    if (!GOOGLE_CLIENT_ID || !GOOGLE_OAUTH_CALLBACK) {
      return new Response(JSON.stringify({ error: 'GOOGLE_CLIENT_ID or GOOGLE_OAUTH_CALLBACK not set' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    // Expect Authorization: Bearer <supabase_user_token>
    const authHeader = req.headers.get('Authorization') || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/);
    if (!m) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401, headers: { 'content-type': 'application/json' } });
    const userToken = m[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(userToken);
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Invalid user token' }), { status: 401, headers: { 'content-type': 'application/json' } });
    const user_id = userData.user.id;

    const state = randState();
    await storeState(user_id, state);

    const stateObj = { redirectTo };
    const stateParam = encodeURIComponent(btoa(JSON.stringify(stateObj)) + '::' + state);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GOOGLE_OAUTH_CALLBACK)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${stateParam}`;

    return Response.redirect(googleAuthUrl, 302);
  } catch (err) {
    console.error('google-oauth error', err);
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
