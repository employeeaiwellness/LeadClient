import { useEffect, useState } from 'react';

export default function GoogleOAuthCallback() {
  const [message, setMessage] = useState('Processing Google sign-in...');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!state) {
          setMessage('Missing state parameter.');
          return;
        }

        // decode state (was base64-encoded JSON)
        let stateObj: any = {};
        try {
          const decoded = atob(decodeURIComponent(state));
          stateObj = JSON.parse(decoded || '{}');
        } catch (e) {
          // ignore parse errors
        }

        const redirectTo = stateObj?.redirectTo || '/';

        // Option A (quick): forward user back to the app path with code + state so a server can exchange it.
        const forwardUrl = new URL(redirectTo, window.location.origin);
        if (code) forwardUrl.searchParams.set('code', code);
        forwardUrl.searchParams.set('from', 'google-oauth');

        // Give the user a short moment to read the message.
        setMessage('Redirecting back to app...');
        window.location.replace(forwardUrl.toString());
      } catch (err) {
        setMessage('An error occurred during Google sign-in callback.');
        console.error(err);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-lg shadow">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}
