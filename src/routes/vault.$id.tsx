import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { 
  ShieldCheck, 
  Clock
} from 'lucide-react';

export const Route = createFileRoute('/vault/$id')({
  component: VaultPage,
});

function VaultPage() {
  const { id: vaultId } = Route.useParams();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}));
  const userId = user?._id ?? ("" as any);
  
  const { data: vault }: { data: any } = useSuspenseQuery(convexQuery(api.goals.getFullContext, { 
    vaultId: vaultId as any, 
    userId: userId
  }));

  if (!vault) return <div>Vault not found</div>;

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left">
            <div className="flex items-center gap-4 text-left">
                <a href="/dashboard" className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg active:scale-95 transition-transform uppercase italic">L</a>
                <div className="flex flex-col text-left">
                    <span className="font-bold tracking-tight text-lg leading-none text-white">Vault Specification</span>
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Asset Protocol</span>
                </div>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left">
            <header className="mb-16 text-left">
                <div className="flex items-center gap-4 mb-8 text-left">
                    <span className="px-4 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Active Mandate</span>
                    <span className="text-white/10 uppercase tracking-widest text-[10px] font-black">Ref: {vaultId.slice(0, 8)}</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight font-black uppercase italic">
                    {vault.goal?.title}
                </h1>
                <p className="mt-6 text-white/40 text-lg leading-relaxed text-left font-medium max-w-2xl">{vault.goal?.description}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                <div className="lg:col-span-4 space-y-8 text-left">
                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Staked Principal</p>
                        <p className="text-5xl font-black text-white text-left italic tracking-tighter">₦{(vault.amount / 100).toLocaleString()}</p>
                        <div className="mt-8 flex items-center gap-3 text-[#ff7a00] font-black text-[10px] uppercase tracking-widest italic">
                            <ShieldCheck size={18} /> Escrowed in Protocol
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Pain Tier</p>
                        <p className="text-2xl font-bold mt-2 text-[#ff7a00] text-left uppercase italic font-black tracking-tight">{vault.painTier || 'Serious Mode'}</p>
                        <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">Missed check-ins trigger an immediate 2% principal deduction and distribution to the reward pool.</p>
                    </div>
                </div>

                <div className="lg:col-span-8 text-left">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black">
                        <div className="h-px flex-1 bg-white/5 text-left" />
                        Historical Logs
                        <div className="h-px flex-1 bg-white/5 text-left" />
                    </h3>

                    <div className="space-y-4 text-left">
                        {vault.logs?.length === 0 ? (
                             <div className="p-20 rounded-[3rem] border border-white/5 bg-white/[0.01] text-center shadow-inner group transition-all">
                                <Clock size={40} className="mx-auto text-white/5 mb-6 opacity-20" />
                                <p className="text-sm text-white/20 italic font-medium">No behavioral logs recorded for this protocol cycle.</p>
                             </div>
                        ) : (
                            vault.logs?.map((log: any) => (
                                <div key={log._id} className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all text-left shadow-xl">
                                    <div className="flex items-center gap-6 text-left">
                                        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-xl group-hover:scale-110 transition-transform">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-white italic text-left">Week {log.week_number} Check-in</p>
                                            <p className="text-xs text-white/30 mt-1 text-left font-medium">{new Date(log._creationTime).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-2 rounded-xl bg-green-600/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest italic">
                                        Verified
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
}
