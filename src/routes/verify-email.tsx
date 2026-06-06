import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useConvexAuth } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../convex/_generated/api';

const EMPTY_ARGS: Record<string, never> = {};

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmEmailVerification = useAction(api.emailVerification.confirmEmailVerification);

  const userQuery = useMemo(
    () => convexQuery(api.users.current, EMPTY_ARGS as any) as any,
    [],
  );

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('token');
  }, []);

  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      if (token) {
        try {
          localStorage.setItem('pendingEmailVerificationToken', token);
        } catch {}
      }
      navigate({ to: '/login' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isAuthenticated) return;
      try {
        localStorage.removeItem('pendingEmailVerificationToken');
      } catch {}
      if (!token) {
        setState('error');
        setMessage('Missing verification token.');
        return;
      }
      try {
        const res = await confirmEmailVerification({ token });
        if (cancelled) return;
        if (res?.success) {
          setState('success');
          setMessage(res?.message ?? 'Email verified.');
          await queryClient.invalidateQueries({ queryKey: userQuery.queryKey });
          await queryClient.refetchQueries({ queryKey: userQuery.queryKey, exact: true });
          setTimeout(() => navigate({ to: '/dashboard' }), 800);
        } else {
          setState('error');
          setMessage(res?.message ?? 'Verification failed.');
        }
      } catch (e: any) {
        if (cancelled) return;
        setState('error');
        setMessage(e?.message ?? 'Verification failed.');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [confirmEmailVerification, isAuthenticated, navigate, token]);

  return (
    <div className="min-h-screen bg-[#020408] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Link
        to="/verify-required"
        className="absolute top-10 left-10 p-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 z-50 flex items-center gap-2 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] pr-2 italic">Back</span>
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="bg-[#0a0f1a]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl text-left">
          <p className="text-xs font-black uppercase tracking-[0.3em] italic text-white">Email Verification</p>

          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-6 p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold uppercase italic tracking-tight ${
                state === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-500'
                  : state === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              {state === 'success' ? (
                <CheckCircle2 size={16} />
              ) : state === 'error' ? (
                <AlertCircle size={16} />
              ) : (
                <Loader2 size={16} className="animate-spin" />
              )}
              {message}
            </motion.div>
          </AnimatePresence>

          {state === 'error' ? (
            <div className="mt-6">
              <Link
                to="/verify-required"
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
              >
                Return to Verification
              </Link>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
