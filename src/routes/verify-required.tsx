import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useAuthActions } from '@convex-dev/auth/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../convex/_generated/api';

const EMPTY_ARGS: Record<string, never> = {};

export const Route = createFileRoute('/verify-required')({
  component: VerifyRequiredPage,
});

function VerifyRequiredPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const userQuery = useMemo(
    () => convexQuery(api.users.current, EMPTY_ARGS as any) as any,
    [],
  );
  const { data: user }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.emailVerificationTime) {
      navigate({ to: '/dashboard' });
    }
  }, [authLoading, isAuthenticated, navigate, user]);

  const checkAgain = async () => {
    setChecking(true);
    setMessage(null);
    try {
      await queryClient.invalidateQueries({ queryKey: userQuery.queryKey });
      await queryClient.refetchQueries({ queryKey: userQuery.queryKey, exact: true });
      const refreshed = queryClient.getQueryData<any>(userQuery.queryKey);
      if (refreshed?.emailVerificationTime) {
        navigate({ to: '/dashboard' });
        return;
      }
      setStatus('error');
      setMessage('Still unverified. An admin needs to mark this account as verified from the admin panel.');
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message ?? 'Failed to refresh verification status.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Link
        to="/login"
        className="absolute top-10 left-10 p-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 z-50 flex items-center gap-2 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] pr-2 italic">Back</span>
      </Link>
      {isAuthenticated ? (
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate({ to: '/login' });
          }}
          className="absolute top-10 right-10 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 z-50 text-[10px] font-black uppercase tracking-[0.3em] italic"
        >
          Log Out
        </button>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="bg-[#0a0f1a]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ShieldCheck size={18} className="text-blue-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-black uppercase tracking-[0.3em] italic text-white">Verification Required</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/20 mt-2">
                Activate your identity to access the terminal.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-white/40">Account Email</p>
            <p className="text-xs font-black italic text-white mt-2 break-all">{user?.email ?? '—'}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] italic text-white/40">How Verification Works</p>
            <div className="mt-4 space-y-2 text-xs text-white/40 font-bold italic tracking-tight uppercase">
              <p>1) Sign in with the email you want to use on Lockedin.</p>
              <p>2) An admin reviews and verifies the account from the admin panel.</p>
              <p>3) Return here and press “Check Again” after the admin confirms verification.</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {message ? (
              <motion.div
                key="msg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold uppercase italic tracking-tight ${
                  status === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-green-500/10 border-green-500/20 text-green-500'
                }`}
              >
                {status === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mb-6 p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs font-bold uppercase italic tracking-tight">
            Email verification is currently manual. Only an admin can verify your account from the admin panel right now.
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={checkAgain}
              disabled={checking}
              className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white py-5 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all disabled:opacity-60"
            >
              {checking ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {checking ? 'Checking…' : 'Check Again'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
