import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard';
    const to = new URLSearchParams(window.location.search).get('to');
    return to && to.startsWith('/') ? to : '/dashboard';
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate({ to: redirectTo });
    }
  }, [authLoading, isAuthenticated, navigate, redirectTo]);

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
        <span className="text-[10px] font-black uppercase tracking-[0.3em] pr-2 italic">
          Back
        </span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#0a0f1a]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl text-left">
          <AnimatePresence mode="wait">
            {timedOut && !isAuthenticated && !authLoading ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold uppercase italic tracking-tight">
                  <AlertCircle size={16} />
                  Authentication did not complete. Please try again.
                </div>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                >
                  Return to Login
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="flex items-center gap-4">
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                  <div className="flex flex-col">
                    <p className="text-xs font-black uppercase tracking-[0.3em] italic text-white">
                      Completing Sign-In
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/20 mt-2 leading-relaxed">
                      Initializing your session and routing to the dashboard.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

