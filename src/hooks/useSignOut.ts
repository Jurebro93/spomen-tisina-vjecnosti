import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/** Shared logout flow: real Supabase signOut, state cleanup, redirect to home. */
export const useSignOut = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(
    async (onDone?: () => void) => {
      if (signingOut) return;
      setSigningOut(true);
      try {
        await signOut();
        onDone?.();
        navigate('/', { replace: true });
      } catch {
        toast({
          title: 'Odjava nije uspjela',
          description: 'Odjava trenutno nije uspjela. Pokušajte ponovno.',
          variant: 'destructive',
        });
      } finally {
        setSigningOut(false);
      }
    },
    [signOut, navigate, toast, signingOut]
  );

  return { handleSignOut, signingOut };
};
