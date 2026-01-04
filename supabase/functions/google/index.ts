/// <reference path="../deno-shim.d.ts" />
// Provide a lightweight local declaration so TypeScript (non-Deno envs) won't error.
declare const Deno: any;
import { createClient } from '@supabase/supabase-js';


// Load local .env as fallback for local development only.
// SECURITY: never rely on this for production — secrets must be set in the Function's environment.
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
      // remove optional wrapping quotes
      localEnv[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
} catch (e) {
  // ignore if file not found or unreadable
}

function env(name: string) {
  const denoVal = (typeof Deno !== 'undefined' && Deno.env && typeof Deno.env.get === 'function') ? Deno.env.get(name) : undefined;
  return denoVal || localEnv[name] || '';
}

const SUPABASE_URL = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_ROLE');
const GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET');
const GOOGLE_OAUTH_CALLBACK = env('GOOGLE_OAUTH_CALLBACK');
const FRONTEND_BASE_URL = env('FRONTEND_BASE_URL') || '/';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase env not set. Ensure SUPABASE_SERVICE_ROLE_KEY is configured for this function.');
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

async function getAndDeleteState(state: string) {
  const { data } = await supabase.from('oauth_states').select('user_id').eq('state', state).limit(1).single();
  if (!data) return null;
  await supabase.from('oauth_states').delete().eq('state', state);
  return data.user_id;
}

async function upsertTokens(user_id: string, tokenResp: any) {
  const expires_at = tokenResp.expires_in ? new Date(Date.now() + tokenResp.expires_in * 1000).toISOString() : null;
  await supabase.from('google_integrations').upsert({
    user_id,
    provider: 'google',
    access_token: tokenResp.access_token,
    refresh_token: tokenResp.refresh_token ?? null,
    scope: tokenResp.scope ?? null,
    token_type: tokenResp.token_type ?? null,
    expires_at,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' });
}

async function refreshAccessTokenIfNeeded(user_id: string, row: any) {
  if (!row) return null;
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 30_000) return row.access_token;
  if (!row.refresh_token) throw new Error('No refresh token available');
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: row.refresh_token,
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Token refresh failed: ${JSON.stringify(tokenJson)}`);
  await upsertTokens(user_id, tokenJson);
  return tokenJson.access_token;
}

async function extractTokenAndBody(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/);
  if (m) {
    const body = await req.json().catch(() => ({}));
    return { token: m[1], body };
  }
  // No Authorization header — try to read body as text. If it's JSON, parse it.
  const text = await req.text().catch(() => '');
  if (!text) return { token: null, body: {} };
  try {
    const parsed = JSON.parse(text);
    return { token: parsed.token || parsed.access_token || null, body: parsed };
  } catch (e) {
    // Raw text — assume it's the token string
    return { token: text.trim(), body: {} };
  }
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/$/, '');
    // CORS preflight handling
    const origin = (FRONTEND_BASE_URL && FRONTEND_BASE_URL !== '/') ? FRONTEND_BASE_URL : '*';
    const corsHeaders = {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // /google/start
    if (pathname.endsWith('/google/start')) {
      const { token: userToken, body: reqBody } = await extractTokenAndBody(req);
      if (!userToken) return new Response(JSON.stringify({ error: 'Missing Authorization or token in body' }), { status: 401, headers: corsHeaders });
      let userData, userErr;
      try {
        const resp = await supabase.auth.getUser(userToken);
        userData = resp.data;
        userErr = resp.error;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to validate user token', detail: String(e) }), { status: 500, headers: corsHeaders });
      }
      if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Invalid user token', detail: userErr?.message }), { status: 401, headers: corsHeaders });
      const user_id = userData.user.id;
      const state = randState();
      await storeState(user_id, state);
      const scopes = (reqBody.scopes || url.searchParams.get('scopes') || 'https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/spreadsheets.readonly').trim();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GOOGLE_OAUTH_CALLBACK)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
      return new Response(JSON.stringify({ url: authUrl }), { status: 200, headers: corsHeaders });
    }

    // /google/callback
    if (pathname.endsWith('/google/callback')) {
      const params = url.searchParams;
      const code = params.get('code');
      const state = params.get('state');
      if (!code || !state) return new Response(JSON.stringify({ error: 'Missing code or state' }), { status: 400, headers: corsHeaders });
      const user_id = await getAndDeleteState(state);
      if (!user_id) return new Response(JSON.stringify({ error: 'Invalid state' }), { status: 400, headers: corsHeaders });
      const body = new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_OAUTH_CALLBACK,
        grant_type: 'authorization_code',
      });
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return new Response(JSON.stringify({ error: 'Token exchange failed', detail: tokenJson }), { status: 500, headers: corsHeaders });
      await upsertTokens(user_id, tokenJson);
      const redirectUrl = new URL(FRONTEND_BASE_URL);
      redirectUrl.searchParams.set('google_connected', '1');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // /google/sheets (handled below)

    // /google/sheets
    if (pathname.endsWith('/google/sheets')) {
      const { token: userToken, body: reqBody } = await extractTokenAndBody(req);
      if (!userToken) return new Response(JSON.stringify({ error: 'Missing Authorization or token in body' }), { status: 401, headers: corsHeaders });
      let userData, userErr;
      try {
        const resp = await supabase.auth.getUser(userToken);
        userData = resp.data;
        userErr = resp.error;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to validate user token', detail: String(e) }), { status: 500, headers: corsHeaders });
      }
      if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Invalid user token', detail: userErr?.message }), { status: 401, headers: corsHeaders });
      const user_id = userData.user.id;
      const { data: row } = await supabase.from('google_integrations').select('*').eq('user_id', user_id).single();
      if (!row) return new Response(JSON.stringify({ error: 'No integration' }), { status: 404, headers: corsHeaders });
      let access_token;
      try {
        access_token = await refreshAccessTokenIfNeeded(user_id, row);
      } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Token refresh failed', detail: String(e) }), { status: 500, headers: corsHeaders });
      }
      const reqJson = reqBody || {};
      const sheetId = reqJson.sheetId || row.sheet_id;
      if (!sheetId) return new Response(JSON.stringify({ error: 'Missing sheetId' }), { status: 400, headers: corsHeaders });
      const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A:Z`, { headers: { Authorization: `Bearer ${access_token}` } });
      const sheetJson = await sheetRes.json();
      return new Response(JSON.stringify(sheetJson), { status: 200, headers: corsHeaders });
    }

    // fallthrough to other handlers below
  } catch (err) {
    console.error('Unexpected error in google function handler', err);
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(err) }), { status: 500, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  // removed duplicate /google/sheets block (moved inside try)

  return new Response('Not found', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
}
