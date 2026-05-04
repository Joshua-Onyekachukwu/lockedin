import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { 
  Trophy, 
  ShieldCheck, 
  Flame, 
  ArrowLeft,
  Medal
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
});

function LeaderboardPage() {
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
          <a href="/dashboard" className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
            <ArrowLeft size={20} />
          </a>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Protocol Ranking</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Integrity Board</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 lg:p-12 text-left relative z-10">
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

        <div className="space-y-4">
            {leaderboard.map((user, index) => (
                <motion.div 
                    key={user._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative rounded-[2rem] border p-6 flex items-center justify-between transition-all ${
                        index === 0 
                        ? 'bg-blue-600/10 border-blue-500/30 shadow-2xl shadow-blue-900/20' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    }`}
                >
                    <div className="flex items-center gap-6">
                        <div className="flex items-center justify-center w-12 text-center">
                            {index === 0 ? <Medal size={24} className="text-yellow-500" /> : 
                             index === 1 ? <Medal size={24} className="text-gray-400" /> :
                             index === 2 ? <Medal size={24} className="text-[#a3805d]" /> :
                             <span className="text-xl font-black text-white/10 italic">#{index + 1}</span>}
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-black text-lg text-white uppercase italic">
                            {user.name?.[0] || '?'}
                        </div>
                        <div className="text-left font-bold">
                            <p className="text-white uppercase italic text-lg leading-tight">{user.name || 'Anonymous Protocol'}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500 italic">
                                    <ShieldCheck size={12} /> {user.integrityScore}% Integrity
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#ff7a00] italic">
                                    <Flame size={12} /> {user.streak_count}W Streak
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Missions</p>
                        <p className="text-xl font-black text-white italic">{user.goals_completed}</p>
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
