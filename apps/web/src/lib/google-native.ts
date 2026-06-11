import { signIn } from 'next-auth/react';

interface CustomWindow extends Window {
  AndroidGoogleAuth?: {
    startGoogleSignIn: () => void;
  };
  onGoogleSignInSuccess?: (idToken: string) => void;
  onGoogleSignInFailure?: (error: string) => void;
  _googleCallbackUrl?: string;
}

export function isAndroidNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const customWin = window as unknown as CustomWindow;
  return !!customWin.AndroidGoogleAuth;
}

export function startGoogleLogin(callbackUrl: string = '/feed') {
  if (typeof window !== 'undefined') {
    const customWin = window as unknown as CustomWindow;
    if (customWin.AndroidGoogleAuth) {
      console.log("[Native Auth] Triggering Android native Google account picker");
      customWin._googleCallbackUrl = callbackUrl;
      customWin.AndroidGoogleAuth.startGoogleSignIn();
      return true;
    }
  }
  
  // Web fallback
  console.log("[Native Auth] Falling back to NextAuth standard Google Sign-In redirect");
  signIn('google', { callbackUrl });
  return false;
}

export function setupNativeGoogleCallbacks(
  onSuccess?: () => void,
  onFailure?: (error: string) => void
) {
  if (typeof window === 'undefined') return () => {};
  
  const customWin = window as unknown as CustomWindow;
  
  customWin.onGoogleSignInSuccess = async (idToken: string) => {
    console.log("[Native Auth] Received Google ID token from Native Android");
    const callbackUrl = customWin._googleCallbackUrl || '/feed';
    
    try {
      const result = await signIn('credentials', {
        googleIdToken: idToken,
        redirect: false,
        callbackUrl
      });
      
      if (result?.error) {
        console.error("[Native Auth] NextAuth Credentials sign-in failed:", result.error);
        if (onFailure) {
          onFailure(result.error);
        } else {
          alert("Login failed: " + result.error);
        }
      } else {
        console.log("[Native Auth] NextAuth Login successful, redirecting to:", callbackUrl);
        if (onSuccess) {
          onSuccess();
        }
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      console.error("[Native Auth] Error logging in via Credentials Provider:", err);
      if (onFailure) {
        onFailure(err.message || String(err));
      } else {
        alert("Login failed: " + (err.message || String(err)));
      }
    }
  };

  customWin.onGoogleSignInFailure = (error: string) => {
    console.error("[Native Auth] Google Sign-In failed on Android device:", error);
    if (onFailure) {
      onFailure(error);
    } else {
      alert("Google Sign-In failed: " + error);
    }
  };

  return () => {
    try {
      customWin.onGoogleSignInSuccess = undefined;
      customWin.onGoogleSignInFailure = undefined;
    } catch (e) {
      console.warn("Failed to clear native window callbacks", e);
    }
  };
}
