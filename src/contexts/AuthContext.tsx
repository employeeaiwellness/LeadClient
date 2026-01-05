import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInWithPopup, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderComponent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    // Try to get token from localStorage on initial load
    return localStorage.getItem('googleAccessToken');
  });

  useEffect(() => {
    // Process redirect result first, before setting up auth listener
    const initAuth = async () => {
      try {
        // Check if user was redirected back from Google
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult) {
          console.log('Successfully signed in via redirect:', redirectResult.user.email);
          setUser(redirectResult.user);
        }
      } catch (error: any) {
        if (error.code !== 'auth/cancelled-popup-request') {
          console.error('Redirect result error:', error);
        }
      }

      // Now set up the auth state listener
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        setUser(authUser);
        setLoading(false);
      });

      return () => unsubscribe();
    };

    const unsubscribePromise = initAuth();
    return () => {
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, []);

  const signInWithGoogle = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isSigningIn) {
      throw new Error('Sign-in already in progress');
    }

    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // Add scopes with proper error handling
      const scopes = [
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/forms.body.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/calendar.readonly'
      ];
      
      scopes.forEach(scope => {
        try {
          provider.addScope(scope);
        } catch (scopeError) {
          console.warn(`Could not add scope ${scope}:`, scopeError);
        }
      });
      
      // Use popup for immediate auth (avoids domain verification issues)
      const result = await signInWithPopup(auth, provider);
      console.log('Successfully signed in:', result.user.email);
      setUser(result.user);
      
      // Store the Google access token from the credential
      try {
        console.log('Full sign-in result:', result);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        console.log('Credential object:', credential);
        
        if (credential) {
          // The access token should be in credential.accessToken
          const token = (credential as any).accessToken;
          console.log('Extracted access token:', token ? '✅ Found' : '❌ Not found');
          
          if (token) {
            setGoogleAccessToken(token);
            localStorage.setItem('googleAccessToken', token);
            console.log('✅ Google access token stored successfully');
          } else {
            console.warn('⚠️ Credential found but no accessToken property');
            console.log('Credential keys:', Object.keys(credential));
          }
        } else {
          console.warn('❌ No credential found in result. Check if scopes were properly added.');
          // Try alternative method - check if token is in the result object
          console.log('Result keys:', Object.keys(result));
        }
      } catch (error) {
        console.error('Error extracting Google credential:', error);
      }
      
      setIsSigningIn(false);
    } catch (error: any) {
      // Handle specific Firebase auth errors
      if (error.code === 'auth/cancelled-popup-request') {
        console.error('Sign-in was cancelled.');
      } else if (error.code === 'auth/popup-blocked') {
        console.error('Popup was blocked by the browser. Please allow popups for this site.');
      } else {
        console.error('Google sign-in error:', error);
      }
      setIsSigningIn(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clear the stored access token
      localStorage.removeItem('googleAccessToken');
      setGoogleAccessToken(null);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleAccessToken, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the provider component
export const AuthProvider = AuthProviderComponent;
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
