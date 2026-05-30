import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { 
  Crown,
  Flame, 
  Medal,
  ShieldCheck,
  Trophy, 
  ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const navigate = useNavigate();
  const { data: leaderboard } = useSuspenseQuery(convexQuery(api.users.getLeaderboard, {}));

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
                return;
              }
              navigate({ to: '/dashboard' });
            }}
            className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Protocol Ranking</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Integrity Board</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <header className="mb-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl mb-8">
                <div className="h-full w-full rounded-[2rem] bg-[#0a0f1a] flex items-center justify-center text-white">
                    <Trophy size={32} />
                </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-6xl text-center text-white leading-tight uppercase italic">
                Hall of <span className="text-blue-500">Integrity.</span>
            </h1>
            <p className="text-white/30 mt-6 text-lg max-w-2xl mx-auto leading-relaxed text-center font-medium italic">
                The top 50 high-performance individuals who have maintained absolute protocol adherence.
            </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {leaderboard.map((user, index) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 12) * 0.03 }}
              className={`group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all shadow-2xl ${
                index === 0
                  ? 'bg-blue-600/10 border-blue-500/30 shadow-blue-900/20'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
              }`}
            >
              <div className="absolute -right-8 -top-8 text-white/[0.02] group-hover:scale-110 transition-transform">
                {index === 0 ? <Crown size={180} /> : <Trophy size={180} />}
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 text-center">
                      {index === 0 ? (
                        <Medal size={22} className="text-yellow-500" />
                      ) : index === 1 ? (
                        <Medal size={22} className="text-gray-300" />
                      ) : index === 2 ? (
                        <Medal size={22} className="text-[#a3805d]" />
                      ) : (
                        <span className="text-xl font-black text-white/10 italic">#{index + 1}</span>
                      )}
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-black text-lg text-white uppercase italic">
                      {user.name?.[0] || '?'}
                    </div>
                  </div>

                  <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest italic text-white/40">
                    {user.tier}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-white uppercase italic text-xl leading-tight font-black tracking-tight">
                    {user.name || 'Anonymous Protocol'}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 shadow-inner">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/80 italic">Integrity</p>
                    <p className="mt-2 flex items-center gap-2 text-blue-500 text-sm font-black italic uppercase tracking-tight">
                      <ShieldCheck size={14} /> {user.integrityScore}%
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#ff7a00]/10 border border-[#ff7a00]/20 shadow-inner">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#ff7a00]/80 italic">Streak</p>
                    <p className="mt-2 flex items-center gap-2 text-[#ff7a00] text-sm font-black italic uppercase tracking-tight">
                      <Flame size={14} /> {user.streak_count}W
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Missions</p>
                  <p className="text-xl font-black text-white italic">{user.goals_completed}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 pt-10 border-t border-white/5 text-center">
             <p className="text-[9px] text-white/10 font-black uppercase tracking-[0.4em] italic leading-loose">
                System Ranking Protocol v1.0 <br /> Real-time Adherence Synchronization Active
             </p>
        </div>
      </main>
    </div>
  );
}
