'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (momentOrOpts?: (() => void) | { notification_open?: boolean; skip_prompt_cancel?: boolean }) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Google FedCM does not work on localhost — skip loading GSI script to prevent console errors
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>(isLocalhost() ? 'error' : 'idle');
  const { setUser, setToken } = useAuthStore();
  const router = useRouter();
  const initializedRef = useRef(false);

  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string; user: { id: string; email: string; first_name?: string; last_name?: string; avatar_url?: string } }>(
        '/auth/google',
        { id_token: response.credential }
      );
      setToken(res.access_token);
      setUser(res.user);
      api.setToken(res.access_token);
      toast.success('Signed in with Google!');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [setToken, setUser, router]);

  const handleClick = useCallback(() => {
    if (isLocalhost()) {
      toast.info('Google Sign-In is only available in production or staging deployments');
      return;
    }

    if (state === 'ready' && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    if (state === 'loading') return;
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google Sign-In is not configured');
      return;
    }

    setState('loading');

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (initializedRef.current) return;
      try {
        window.google?.accounts?.id?.initialize({
          client_id: GOOGLE_CLIENT_ID!,
          callback: handleCredentialResponse,
          auto_select: false,
        });
        initializedRef.current = true;
        setState('ready');
        window.google?.accounts?.id?.prompt();
      } catch {
        setState('error');
        toast.error('Failed to initialize Google Sign-In');
      }
    };
    script.onerror = () => {
      setState('error');
      toast.error('Failed to load Google Sign-In');
    };
    document.head.appendChild(script);
  }, [state, handleCredentialResponse]);

  const isDisabled = loading || state === 'loading';
  const buttonText = loading ? 'Signing in...' : state === 'loading' ? 'Loading...' : state === 'error' ? 'Google Sign-In unavailable' : 'Continue with Google';

  return (
    <Button
      variant="outline"
      className="w-full h-11 text-sm"
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
    >
      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {buttonText}
    </Button>
  );
}