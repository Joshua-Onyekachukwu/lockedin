import { createFileRoute } from '@tanstack/react-router';
import { useAuthActions } from "@convex-dev/auth/react";
import { Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuthActions();
  const [isPending, setIsPending] = useState(false);

  const handleSignIn = async (provider: string) => {
    setIsPending(true);
    try {
      await signIn(provider);
      // For OAuth, this will redirect. For password, we'd handle it here.
    } catch (error) {
      console.error(error);
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10% ] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-600 blur-md opacity-50" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-900/20 text-white">
              <Lock size={28} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Access Protocol</h1>
          <p className="text-white/40 mt-2">Initialize your commitment session</p>
        </div>

        <div className="space-y-4">
          <button 
            disabled={isPending}
            onClick={() => handleSignIn("google")}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 font-semibold hover:bg-white/10 transition-all active:scale-[0.98] group"
          >
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
              <LogIn size={20} className="text-white" />
            </div>
            Sign in with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-[#050810] px-4 text-white/20">The Protocol Standard</span>
            </div>
          </div>

          <p className="text-center text-xs text-white/20 leading-relaxed max-w-[280px] mx-auto">
            By accessing the protocol, you agree to our behavioral enforcement terms and capital stake mandates.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
