import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvexAuth, useMutation } from 'convex/react';
import { 
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock, 
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { ConfirmModal } from '~/components/confirm-modal';
import { SharePromptModal } from '~/components/share-prompt-modal';
import { useToast } from '~/components/toast';
import { useBodyScrollLock } from '~/lib/useBodyScrollLock';

const EMPTY_ARGS: Record<string, never> = {};
const CheckInModal = lazy(() => import('~/components/dashboard/check-in-modal'));

export const Route = createFileRoute('/vault/$id')({
  component: VaultPage,
});

function VaultPage() {
  const { id: vaultId } = Route.useParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user }: { data: any } = useSuspenseQuery({
    ...(convexQuery(api.users.current, EMPTY_ARGS as any) as any),
    enabled: isAuthenticated,
  });
  const isVerified = !!user?.emailVerificationTime;
  
  const vaultQuery = convexQuery(api.goals.getFullContext, {
    vaultId: vaultId,
  }) as any;
  const { data: vault }: { data: any } = useSuspenseQuery({
    ...vaultQuery,
    enabled: isAuthenticated && isVerified,
  });

  const partnersQuery = convexQuery(api.partners.getPartners as any, { vaultId: vaultId }) as any;
  const { data: witnesses } = useQuery({
    ...(partnersQuery),
    enabled: isAuthenticated && isVerified && vault?.access === 'full',
    placeholderData: [],
    staleTime: 1000 * 15,
  });

  const removeWitness = useMutation((api as any).partners.removeWitness);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const [witnessEditOpen, setWitnessEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description?: string;
    tone?: 'primary' | 'danger';
    confirmLabel: string;
    run: null | (() => Promise<void>);
  }>({ open: false, title: '', confirmLabel: '', run: null });

  useBodyScrollLock(!!activeLog);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShareUrl(`${window.location.origin}/share/${vaultId}`);
  }, [vaultId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isVerified) {
      navigate({ to: '/verify-required' });
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user]);

  if (authLoading || !isAuthenticated || !user || !isVerified || !vault) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  const access = vault?.access === 'full' ? 'full' : 'preview'

  const isOwner = vault?.userId === user?._id;
  const witnessRows: Array<any> = (Array.isArray(witnesses) ? witnesses : []).filter(
    (w) => w?.status !== 'ended',
  );
  const status = String(vault?.status ?? '')
  const isAwaitingFunding = status === 'awaiting_funding'
  const penaltyEvents: Array<any> = Array.isArray(vault?.penaltyEvents) ? vault.penaltyEvents : []

  const frequency = (vault.goal?.frequency_type as 'daily' | 'weekly' | 'monthly' | undefined) ?? 'daily'
  const targetCount = Number(vault.goal?.target_count ?? 1) || 1
  const now = Date.now()
  const startDate = Number(vault.fundedAt ?? vault.startDate ?? vault._creationTime ?? now)
  const todayStr = new Date(now).toISOString().split('T')[0]
  const currentWeekNumber = Math.max(1, Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1)
  const currentMonthKey = new Date(now).toISOString().slice(0, 7)

  const logs: Array<any> = Array.isArray(vault.logs) ? vault.logs : []
  const completedThisPeriod = logs.filter((l) => {
    if ((l.status) !== 'completed') return false
    const dateStr = (l.date as string | undefined) ?? ''
    if (frequency === 'daily') return dateStr === todayStr
    if (frequency === 'weekly') return Number(l.week_number ?? 0) === currentWeekNumber
    return dateStr.slice(0, 7) === currentMonthKey
  }).length

  const remainingThisPeriod = Math.max(0, targetCount - completedThisPeriod)
  const canExecuteLog = isOwner && !isAwaitingFunding && remainingThisPeriod > 0

  const endOfToday = () => {
    const d = new Date(now)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }

  const endOfTomorrow = () => {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }

  const endOfWeek = () => startDate + currentWeekNumber * 7 * 24 * 60 * 60 * 1000 - 1

  const endOfMonth = () => {
    const d = new Date(now)
    d.setMonth(d.getMonth() + 1, 1)
    d.setHours(0, 0, 0, 0)
    return d.getTime() - 1
  }

  const deadline =
    frequency === 'daily'
      ? (remainingThisPeriod > 0 ? endOfToday() : endOfTomorrow())
      : frequency === 'weekly'
        ? endOfWeek()
        : endOfMonth()

  const msLeft = isAwaitingFunding ? 0 : Math.max(0, deadline - now)
  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / (3600 * 24))
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${Math.max(0, mins)}m`
  }

  const principalKoboRaw = Number((vault)?.amount)
  const principalKobo = Number.isFinite(principalKoboRaw) ? principalKoboRaw : 0
  const penaltyAccruedKoboRaw = Number(vault?.penaltyAccrued ?? 0)
  const penaltyAccruedKobo = Number.isFinite(penaltyAccruedKoboRaw) ? penaltyAccruedKoboRaw : 0
  const principalRemainingKobo = Math.max(0, principalKobo - penaltyAccruedKobo)

  if (access !== 'full') {
    return (
      <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left">
          <div className="flex items-center gap-4 text-left">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back()
                  return
                }
                navigate({ to: '/community' })
              }}
              className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col text-left">
              <span className="font-bold tracking-tight text-lg leading-none text-white">
                Vault Specification
              </span>
              <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">
                Preview Only
              </span>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto p-6 lg:p-12 text-left">
          <header className="mb-12 text-left">
            <div className="flex items-center gap-4 mb-8 text-left">
              <span className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase tracking-widest italic">
                Access Restricted
              </span>
              <span className="text-white/10 uppercase tracking-widest text-[10px] font-black">
                Ref: {vaultId.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-left text-white leading-tight font-black uppercase italic">
              {vault.goal?.title}
            </h1>
            <p className="mt-6 text-white/40 text-lg leading-relaxed text-left font-medium max-w-2xl">
              {vault.goal?.description}
            </p>
          </header>

          <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left">
              Visibility Rule
            </p>
            <p className="mt-4 text-sm text-white/40 leading-relaxed italic font-medium">
              Full specification is only visible to the protocol owner and assigned active witnesses.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Category</p>
                <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                  {vault.goal?.category}
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Status</p>
                <p className="mt-3 text-blue-500 font-black uppercase italic tracking-tight text-lg">
                  {vault.status}
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Frequency</p>
                <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                  {vault.goal?.frequency_type || 'daily'}
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Target</p>
                <p className="mt-3 text-[#ff7a00] font-black uppercase italic tracking-tight text-lg">
                  {vault.goal?.target_count ?? 1}/period
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate({ to: '/community' })}
                className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
              >
                Back To Community
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <ConfirmModal
            open={confirm.open}
            title={confirm.title}
            description={confirm.description}
            tone={confirm.tone}
            confirmLabel={confirm.confirmLabel}
            onClose={() => setConfirm({ open: false, title: '', confirmLabel: '', run: null })}
            onConfirm={async () => {
                if (!confirm.run) return
                await confirm.run()
            }}
        />

        <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left">
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
                  className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col text-left">
                    <span className="font-bold tracking-tight text-lg leading-none text-white">Vault Specification</span>
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Asset Protocol</span>
                </div>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left">
            <header className="mb-16 text-left">
                <div className="flex items-center gap-4 mb-8 text-left">
                    <span
                      className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest italic ${
                        status === 'active'
                          ? 'bg-blue-600/10 border-blue-500/20 text-blue-500'
                          : status === 'awaiting_funding'
                            ? 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400'
                            : status === 'completed'
                              ? 'bg-green-600/10 border-green-500/20 text-green-500'
                              : 'bg-red-600/10 border-red-500/20 text-red-500'
                      }`}
                    >
                      {status === 'awaiting_funding'
                        ? 'Awaiting Funding'
                        : status === 'active'
                          ? 'Active'
                          : status === 'completed'
                            ? 'Completed'
                            : status === 'failed'
                              ? 'Failed'
                              : status || 'Unknown'}
                    </span>
                    <span className="text-white/10 uppercase tracking-widest text-[10px] font-black">Ref: {vaultId.slice(0, 8)}</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight font-black uppercase italic">
                    {vault.goal?.title}
                </h1>
                <p className="mt-6 text-white/40 text-lg leading-relaxed text-left font-medium max-w-2xl">{vault.goal?.description}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                <div className="lg:col-span-4 space-y-8 text-left">
                    {isOwner && isAwaitingFunding ? (
                      <div className="p-8 rounded-[3rem] bg-yellow-600/10 border border-yellow-500/20 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200/80 text-left mb-4">
                          Activation Required
                        </p>
                        <p className="text-xs text-yellow-200/70 leading-relaxed font-medium italic">
                          This protocol is created but not active yet. Fund it to start the clock and enable check-ins.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: '/dashboard',
                              search: { fundVaultId: vaultId } as any,
                            })
                          }
                          className="mt-6 w-full px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
                        >
                          Fund & Activate
                        </button>
                      </div>
                    ) : null}
                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">
                          {isAwaitingFunding ? 'Stake Amount' : 'Staked Principal'}
                        </p>
                        <p className="text-5xl font-black text-white text-left italic tracking-tighter">₦{(principalKobo / 100).toLocaleString()}</p>
                        {isAwaitingFunding ? (
                          <div className="mt-8 flex items-center gap-3 text-yellow-300 font-black text-[10px] uppercase tracking-widest italic">
                            <AlertTriangle size={18} /> Not funded yet
                          </div>
                        ) : (
                          <div className="mt-8 flex items-center gap-3 text-[#ff7a00] font-black text-[10px] uppercase tracking-widest italic">
                              <ShieldCheck size={18} /> Escrowed in Protocol
                          </div>
                        )}
                    </div>

                    {!isAwaitingFunding ? (
                      <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">
                          Penalty Accounting
                        </p>
                        <div className="flex items-baseline justify-between gap-6">
                          <div className="min-w-0">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                              Accrued Penalties
                            </p>
                            <p className="mt-3 text-3xl font-black text-red-400 italic tracking-tight">
                              ₦{(penaltyAccruedKobo / 100).toLocaleString()}
                            </p>
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                              Remaining Principal
                            </p>
                            <p className="mt-3 text-3xl font-black text-white italic tracking-tight">
                              ₦{(principalRemainingKobo / 100).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="mt-6 text-xs text-white/30 leading-relaxed font-medium italic">
                          Penalties accrue during the vault and are settled when the vault ends.
                        </p>
                      </div>
                    ) : null}

                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Next Check-in</p>
                        {isAwaitingFunding ? (
                          <>
                            <div className="flex items-center gap-3 text-left text-white">
                              <Clock size={18} className="text-yellow-400" />
                              <p className="text-2xl font-black italic tracking-tight">Not started</p>
                            </div>
                            <p className="text-[10px] text-white/30 mt-4 uppercase tracking-widest font-black italic">
                              Fund this protocol to begin the first cycle.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 text-left text-white">
                              <Clock size={18} className="text-blue-500" />
                              <p className="text-2xl font-black italic tracking-tight">
                                {formatCountdown(msLeft)}
                              </p>
                            </div>
                            <p className="text-[10px] text-white/30 mt-4 uppercase tracking-widest font-black italic">
                              {frequency.toUpperCase()} • {remainingThisPeriod}/{targetCount} remaining
                            </p>
                            <p className="text-[10px] text-white/20 mt-3 uppercase tracking-widest font-black italic">
                              Deadline: {new Date(deadline).toLocaleString()}
                            </p>
                          </>
                        )}
                    </div>

                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Witness Protocol</p>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest italic mb-6">
                          Max 3 witnesses per goal.
                        </p>
                        {witnessRows.length === 0 ? (
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                    No witnesses attached yet.
                                </p>
                                {isOwner ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate({
                                        to: '/community',
                                        search: { view: 'witnesses', vaultId } as any,
                                      })
                                    }
                                    className="mt-6 px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
                                  >
                                    Request A Witness
                                  </button>
                                ) : null}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isOwner && witnessRows.filter((w) => w.status === 'active').length < 3 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate({
                                        to: '/community',
                                        search: { view: 'witnesses', vaultId } as any,
                                      })
                                    }
                                    className="w-full px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
                                  >
                                    Request A Witness
                                  </button>
                                ) : null}
                                {witnessRows.map((w) => (
                                    <div key={w._id} className="p-6 rounded-[2.5rem] bg-[#050810]/40 border border-white/5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                {w.user?.image ? (
                                                    <img src={w.user.image} alt="Witness" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users size={18} className="text-white/30" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-white font-black uppercase tracking-widest italic truncate">
                                                    {w.user?.name || 'Unknown'}
                                                </p>
                                                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest italic truncate mt-2">
                                                    {w.user?.city ? `${w.user.city} • ` : ''}Integrity: {w.user?.integrityScore ?? 0}%
                                                </p>
                                                <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic mt-2">
                                                    Status: {w.status}
                                                </p>
                                            </div>
                                        </div>

                                        {isOwner && witnessEditOpen && w.status !== 'ended' ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirm({
                                                        open: true,
                                                        title: 'Remove witness?',
                                                        description: `This will end witness access for ${w.user?.name || 'this user'}.`,
                                                        tone: 'danger',
                                                        confirmLabel: 'Remove',
                                                        run: async () => {
                                                            await removeWitness({ partnerShipId: w._id } as any)
                                                            toast.success('Witness removed.', { title: 'Witness Protocol' })
                                                            await queryClient.invalidateQueries({ queryKey: vaultQuery.queryKey })
                                                            await queryClient.invalidateQueries({ queryKey: partnersQuery.queryKey })
                                                        },
                                                    })
                                                }
                                                className="h-10 w-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/15 active:scale-95 transition-all shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                                {isOwner ? (
                                  <button
                                    type="button"
                                    onClick={() => setWitnessEditOpen((v) => !v)}
                                    className="w-full px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-white/10 transition-all"
                                  >
                                    {witnessEditOpen ? 'Done Editing' : 'Edit Witnesses'}
                                  </button>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Pain Tier</p>
                        <p className="text-2xl font-bold mt-2 text-[#ff7a00] text-left uppercase italic font-black tracking-tight">{vault.painTier || 'Serious Mode'}</p>
                        <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">
                          Missed requirements accrue penalties based on your tier and settle when the vault ends.
                        </p>
                    </div>

                    {canExecuteLog ? (
                      <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">
                          Enforcement
                        </p>
                        <p className="text-xs text-white/40 italic leading-relaxed font-medium">
                          Submit evidence for this cycle. This is the only action that updates your protocol performance.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCheckInOpen(true)}
                          className="mt-8 w-full px-8 py-4 rounded-2xl bg-[#ff7a00] text-white font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
                        >
                          Execute Log
                        </button>
                      </div>
                    ) : null}
                </div>

                <div className="lg:col-span-8 text-left">
                    {penaltyEvents.length > 0 ? (
                      <div className="mb-12 p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-8 text-left">
                          Penalty Timeline
                        </p>
                        <div className="space-y-4">
                          {penaltyEvents.slice(0, 10).map((e: any) => {
                            const shielded = !!e.shield_used
                            const when = new Date(Number(e.createdAt ?? 0)).toLocaleString()
                            const label = shielded ? 'Shielded breach' : 'Penalty accrued'
                            const amountKobo = Number(e.penalty_amount ?? 0)
                            return (
                              <div
                                key={e._id}
                                className="p-6 rounded-[2.5rem] bg-[#050810]/40 border border-white/5 flex items-start justify-between gap-6"
                              >
                                <div className="min-w-0">
                                  <p className="text-[10px] text-white font-black uppercase tracking-widest italic">
                                    {label} • {String(e.frequency_type ?? '').toUpperCase()}
                                  </p>
                                  <p className="mt-2 text-[10px] text-white/30 font-black uppercase tracking-widest italic">
                                    {when}
                                  </p>
                                  <p className="mt-3 text-xs text-white/40 italic leading-relaxed">
                                    Completed {Number(e.completed_count ?? 0)}/{Number(e.target_count ?? 0)}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p
                                    className={`text-sm font-black uppercase tracking-widest italic ${
                                      shielded ? 'text-yellow-300' : 'text-red-400'
                                    }`}
                                  >
                                    {shielded ? '₦0' : `₦${(amountKobo / 100).toLocaleString()}`}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
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
                            vault.logs?.map((log: any) => {
                              const status = log.status as 'pending' | 'completed' | 'missed' | 'disputed' | undefined
                              const isPending = status === 'pending'
                              const isCompleted = status === 'completed'
                              const isMissed = status === 'missed'
                              const dateStr = (log.date as string | undefined) ?? ''

                              const badge = isPending
                                ? {
                                    label: 'Pending Approval',
                                    wrap: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
                                    icon: <Clock size={14} />,
                                    iconWrap: 'bg-blue-600/10 text-blue-400 border-blue-500/20',
                                  }
                                : isCompleted
                                ? {
                                    label: 'Completed',
                                    wrap: 'bg-green-600/10 border-green-500/20 text-green-500',
                                    icon: <CheckCircle2 size={14} />,
                                    iconWrap: 'bg-green-600/10 text-green-500 border-green-500/20',
                                  }
                                : isMissed
                                  ? {
                                      label: 'Missed',
                                      wrap: 'bg-red-600/10 border-red-500/20 text-red-500',
                                      icon: <AlertTriangle size={14} />,
                                      iconWrap: 'bg-red-600/10 text-red-500 border-red-500/20',
                                    }
                                  : {
                                      label: 'Rejected',
                                      wrap: 'bg-yellow-600/10 border-yellow-500/20 text-yellow-500',
                                      icon: <ShieldCheck size={14} />,
                                      iconWrap: 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20',
                                    }

                              return (
                                <div
                                  key={log._id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setActiveLog(log)}
                                  className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] group hover:bg-white/[0.04] transition-all text-left shadow-xl"
                                >
                                  <div className="flex items-start justify-between gap-6">
                                    <div className="flex items-start gap-6 text-left">
                                      <div
                                        className={`h-12 w-12 rounded-2xl border flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform shrink-0 ${badge.iconWrap}`}
                                      >
                                        {badge.icon}
                                      </div>
                                      <div className="text-left">
                                        <p className="font-black text-white italic text-left uppercase tracking-tight">
                                          {dateStr ? `Check-in • ${dateStr}` : `Week ${log.week_number} Check-in`}
                                        </p>
                                        <p className="text-[10px] text-white/30 mt-2 text-left font-black uppercase tracking-widest italic">
                                          Week {log.week_number}
                                          {isPending ? ' • Awaiting Approval' : log.confirmed_by ? ' • Verified' : ''}
                                        </p>
                                      </div>
                                    </div>

                                    <div
                                      className={`px-6 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2 ${badge.wrap}`}
                                    >
                                      {badge.icon} {badge.label}
                                    </div>
                                  </div>

                                  {(log.proofUrl || log.note) ? (
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                                      {log.proofUrl ? (
                                        <div className="md:col-span-4">
                                          <div className="w-full aspect-square rounded-[2rem] overflow-hidden border border-white/5 bg-black shadow-inner">
                                            <img src={log.proofUrl} className="w-full h-full object-cover" alt="Evidence" />
                                          </div>
                                        </div>
                                      ) : null}
                                      {log.note ? (
                                        <div className={log.proofUrl ? 'md:col-span-8' : 'md:col-span-12'}>
                                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 shadow-inner">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Evidence Note</p>
                                            <p className="mt-4 text-xs text-white/40 italic leading-relaxed">{log.note}</p>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {Array.isArray(log.verificationReports) && log.verificationReports.length > 0 ? (
                                    <div className="mt-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 shadow-inner">
                                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
                                        Decision Reports
                                      </p>
                                      <div className="mt-4 space-y-3">
                                        {log.verificationReports.map((report: any, index: number) => (
                                          <div key={`${report.reviewerId}-${index}`} className="rounded-2xl border border-white/10 bg-[#050810]/70 p-4">
                                            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30 italic">
                                              {report.actorRole === 'owner' ? 'Owner' : report.reviewerName || 'Witness'} • {report.verdict}
                                            </p>
                                            <p className="mt-3 text-xs text-white/45 italic leading-relaxed">
                                              {report.comment}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })
                        )}
                    </div>
                </div>
            </div>
            {activeLog ? (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
                <div
                  className="absolute inset-0 bg-[#050810]/75 backdrop-blur-xl"
                  onClick={() => setActiveLog(null)}
                />
                <div className="relative w-full max-w-3xl rounded-[3rem] bg-[#0a0f1a]/95 border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-10 border-b border-white/10 flex items-start justify-between gap-6 shrink-0">
                    <div className="text-left">
                      <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                        {activeLog.date ? `Check-in • ${activeLog.date}` : `Week ${activeLog.week_number} Check-in`}
                      </p>
                      <p className="mt-3 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic">
                        Status: {String(activeLog.status ?? '').toUpperCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveLog(null)}
                      className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar">
                    {(
                      Array.isArray(activeLog.proofUrls)
                        ? activeLog.proofUrls
                        : activeLog.proofUrl
                          ? [activeLog.proofUrl]
                          : []
                    ).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(
                          Array.isArray(activeLog.proofUrls)
                            ? activeLog.proofUrls
                            : activeLog.proofUrl
                              ? [activeLog.proofUrl]
                              : []
                        ).map((u: string) => (
                          <div
                            key={u}
                            className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-black"
                          >
                            <img src={u} className="w-full h-full object-contain" alt="Evidence" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.02]">
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic">
                          No image attached.
                        </p>
                      </div>
                    )}
                    <div className="mt-8 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
                        Evidence Note
                      </p>
                      <p className="mt-4 text-xs text-white/40 italic leading-relaxed">
                        {activeLog.note || 'No note provided.'}
                      </p>
                    </div>
                    {Array.isArray(activeLog.verificationReports) && activeLog.verificationReports.length > 0 ? (
                      <div className="mt-8 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
                          Verification Reports
                        </p>
                        <div className="mt-4 space-y-4">
                          {activeLog.verificationReports.map((report: any, index: number) => (
                            <div key={`${report.reviewerId}-${index}`} className="rounded-[2rem] border border-white/10 bg-[#050810]/70 p-5">
                              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/30 italic">
                                {report.actorRole === 'owner' ? 'Owner' : report.reviewerName || 'Witness'} • {report.verdict}
                              </p>
                              <p className="mt-3 text-xs text-white/45 italic leading-relaxed">
                                {report.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {checkInOpen ? (
              <Suspense fallback={null}>
                <CheckInModal
                  vault={vault}
                  onClose={() => setCheckInOpen(false)}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: vaultQuery.queryKey })
                    setSharePromptOpen(true)
                  }}
                />
              </Suspense>
            ) : null}

            <SharePromptModal
              open={sharePromptOpen}
              title={String(vault.goal?.title ?? '')}
              status={status}
              url={shareUrl}
              onClose={() => setSharePromptOpen(false)}
            />
        </main>
    </div>
  );
}
