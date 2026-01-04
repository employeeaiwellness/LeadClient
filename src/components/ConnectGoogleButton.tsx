import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ConnectGoogleButton() {
  const { session } = useAuth();

  const handleConnect = async () => {
    try {
      // Use local functions gateway when running in development (supabase CLI)
      const functionsBase = import.meta.env.DEV
        ? 'http://127.0.0.1:54321/functions/v1'
        : (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`);
      // const functionsBase = import.meta.env.FRONTEND_BASE_URL;
      const sessionResp = await supabase.auth.getSession();
      const token = sessionResp.data.session?.access_token;
      console.log('Current session token:', token);
      if (!token) {
        alert('You must be signed in to connect Google.');
        return;
      }

      const scopes = [
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
      ].join(' ');

      // Send as text/plain with the token in the body to avoid CORS preflight
      const payload = JSON.stringify({ token, scopes });
      const res = await fetch(`${functionsBase}/google/start`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: payload,
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Start OAuth failed:', res.status, txt);
        alert('Failed to start OAuth. Check console.');
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error starting Google OAuth:', err);
      alert('Error starting Google OAuth. See console.');
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={!session}
      className={`mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-150 ${session ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
    >
      Connect Google Account
    </button>
  );
}
