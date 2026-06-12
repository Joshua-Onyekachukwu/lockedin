import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvexAuth, useMutation } from 'convex/react';
import { 
  AlertCircle, 
  Camera,
  Clock,
  CreditCard,
  Eye,
  Plus,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  X
} from 'lucide-react';

import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../convex/_generated/api';
import { AppTopNav } from '~/components/app-top-nav';
import { FundNowModal } from '~/components/fund-now-modal';
import { toUserMessage } from '~/lib/errors';
import { SharePromptModal } from '~/components/share-prompt-modal';
import { useToast } from '~/components/toast';

const EMPTY_ARGS: Record<string, never> = {};

const CreateVaultModal = lazy(() => import('~/components/dashboard/create-vault-modal'));
const CheckInModal = lazy(() => import('~/components/dashboard/check-in-modal'));
const FundProtocolModal = lazy(() => import('~/components/dashboard/fund-protocol-modal'));

export const Route = createFileRoute('/dashboard')({
  validateSearch: (search: Record<string, unknown>) => {
    const fundVaultId =
      typeof search.fundVaultId === 'string' ? search.fundVaultId : undefined;
    return { fundVaultId };
  },
  component: Dashboard,
});

function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const userQuery = convexQuery(api.users.current, EMPTY_ARGS as any) as any;
  const { data: user }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
  });
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !(user).emailVerificationTime) {
      navigate({ to: '/verify-required' });
    }
  }, [authLoading, isAuthenticated, navigate, user]);

  if (authLoading || !isAuthenticated || !user || !(user).emailVerificationTime) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return <DashboardContent user={user} />;
}

function DashboardContent({ user }: { user: any }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { fundVaultId } = Route.useSearch();
  
  const [isCreating, setIsCreating] = useState(false);
  const [fundingVaultId, setFundingVaultId] = useState<string | null>(null);
  const [checkingInGoal, setCheckingInGoal] = useState<any>(null);
  const [fundPrompt, setFundPrompt] = useState<{
    open: boolean;
    vaultId: string | null;
    url: string;
  }>({ open: false, vaultId: null, url: '' });
  const [shareAfterFunding, setShareAfterFunding] = useState<{
    title: string;
    status?: string;
    url: string;
  } | null>(null);
  const [sharePrompt, setSharePrompt] = useState<{
    open: boolean;
    title: string;
    status?: string;
    url: string;
  }>({ open: false, title: '', url: '' });
  const [activationDismissed, setActivationDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'protocols' | 'witnessing'>('protocols');
  const [activeEvidenceLog, setActiveEvidenceLog] = useState<any>(null);
  const [verificationComment, setVerificationComment] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('activationChecklistDismissed');
      if (raw === 'true') setActivationDismissed(true);
    } catch {}
  }, []);
  
  useEffect(() => {
    if (!fundVaultId) return;
    setFundingVaultId(fundVaultId);
  }, [fundVaultId]);

  const { data: vaults } = useQuery({
    ...(convexQuery(api.goals.listByUser, EMPTY_ARGS as any) as any),
    enabled: true,
    placeholderData: [],
    staleTime: 1000 * 15,
  })

  const { data: activationStatus }: { data: any } = useQuery({
    ...(convexQuery((api as any).growth.getActivationStatus, EMPTY_ARGS as any) as any),
    enabled: true,
    placeholderData: {
      hasVault: false,
      hasFundedVault: false,
      hasCheckIn: false,
      hasWitness: false,
      firstVaultId: null,
      firstAwaitingFundingVaultId: null,
      firstActiveVaultId: null,
    },
    staleTime: 1000 * 15,
  })

  useEffect(() => {
    if (activationStatus?.hasFundedVault) {
      try {
        localStorage.setItem('activationChecklistDismissed', 'true');
      } catch {}
      setActivationDismissed(true);
    }
  }, [activationStatus?.hasFundedVault]);

  const { data: discoverableVaults } = useQuery({
    ...(convexQuery(api.goals.listDiscoverable, EMPTY_ARGS as any) as any),
    enabled: activeTab === 'witnessing',
    placeholderData: [],
    staleTime: 1000 * 15,
  })

  const { data: pendingVerifications } = useQuery({
    ...(convexQuery(api.verifications.getPendingVerifications, EMPTY_ARGS as any) as any),
    enabled: activeTab === 'witnessing',
    placeholderData: [],
    staleTime: 1000 * 10,
  })

  const { data: myWitnessProtocols } = useQuery({
    ...(convexQuery((api as any).partners.listMyWitnessProtocols, EMPTY_ARGS as any) as any),
    enabled: activeTab === 'witnessing',
    placeholderData: [],
    staleTime: 1000 * 10,
  })

  const { data: incomingRequests } = useQuery({
    ...(convexQuery(api.partners.listIncomingRequests, EMPTY_ARGS as any) as any),
    enabled: activeTab === 'witnessing',
    placeholderData: [],
    staleTime: 1000 * 10,
  })

  const { data: incomingApplications } = useQuery({
    ...(convexQuery((api as any).partners.listIncomingApplications, EMPTY_ARGS as any) as any),
    enabled: activeTab === 'witnessing',
    placeholderData: [],
    staleTime: 1000 * 10,
  })
  
  const verifyLog = useMutation(api.verifications.verifyLog);
  const acceptPartnerRequest = useMutation(api.partners.acceptRequest);
  const acceptApplication = useMutation((api as any).partners.acceptApplication);
  const applyToWitness = useMutation((api as any).partners.applyToWitness);

  const handleVerify = async (logId: any, status: 'approved' | 'rejected', comment?: string) => {
      try {
          await verifyLog({ logId, status, comment });
          toast.success('Evidence processed.', { title: status === 'approved' ? 'Authorized' : 'Rejected' });
          await queryClient.invalidateQueries();
      } catch (err: any) {
          toast.error(toUserMessage(err, 'Failed to process evidence.'), { title: 'Verification Failed' });
      }
  };

  const handleRequestWitness = async (vaultId: any) => {
      try {
          await applyToWitness({ vaultId } as any);
          toast.success('Application transmitted.', { title: 'Witness Applied' });
          await queryClient.invalidateQueries();
      } catch (err: any) {
          toast.error(toUserMessage(err, 'Failed to transmit request.'), { title: 'Request Blocked' });
      }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden pb-20">
      <AppTopNav
        variant="dashboard"
        title="Lockedin"
        subtitle="Operational Protocol"
        contextLinks={[
          { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={14} className="text-yellow-500" /> },
          { to: '/community', label: 'Community' },
        ]}
        user={user}
      />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12 text-left relative z-10">
        <header className="mb-10 sm:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 text-left">
          <div className="text-left">
            <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight uppercase italic">
              {activeTab === 'protocols' ? 'Operational ' : 'Witness '}
              <span className="text-blue-500 text-left">{activeTab === 'protocols' ? 'Intelligence.' : 'Authority.'}</span>
            </h1>
            <p className="text-white/30 mt-6 text-lg max-w-2xl leading-relaxed text-left font-medium italic">
                {activeTab === 'protocols' 
                    ? `Integrity Score: ${user.integrityScore || 100}%. Adherence to active goals is non-negotiable.`
                    : activeTab === 'witnessing'
                    ? `Review protocol evidence and authorize goal compliance for your peers.`
                    : ''
                }
            </p>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-white/10">
             {(['protocols', 'witnessing'] as const).map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'}`}
                >
                    {tab}
                </button>
             ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
            {activeTab === 'protocols' ? (
                <motion.div 
                    key="protocols"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                >
                    {activationDismissed || activationStatus?.hasFundedVault ? null : (
                      <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 shadow-2xl">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                          <div className="text-left">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                              Activation Checklist
                            </p>
                            <p className="mt-4 text-white font-black uppercase italic tracking-tight text-2xl">
                              First Protocol Win
                            </p>
                            <p className="mt-4 text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic leading-relaxed max-w-2xl">
                              Complete the steps below to activate your first protocol and unlock the full enforcement loop.
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10">
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">
                                Progress
                              </p>
                              <p className="mt-2 text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                                {[
                                  activationStatus?.hasVault,
                                  activationStatus?.hasFundedVault,
                                  activationStatus?.hasCheckIn,
                                  activationStatus?.hasWitness,
                                ].filter(Boolean).length}
                                /4
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  localStorage.setItem('activationChecklistDismissed', 'true');
                                } catch {}
                                setActivationDismissed(true);
                              }}
                              className="h-12 w-12 rounded-2xl bg-white/[0.02] border border-white/10 text-white/30 hover:text-white transition-colors active:scale-95"
                            >
                              <X size={18} className="mx-auto" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <ChecklistRow
                            done={!!activationStatus?.hasVault}
                            label="Create your first protocol"
                            ctaLabel="Create"
                            onCta={() => setIsCreating(true)}
                          />
                          <ChecklistRow
                            done={!!activationStatus?.hasFundedVault}
                            label="Fund your protocol"
                            ctaLabel="Fund"
                            disabled={!activationStatus?.firstAwaitingFundingVaultId}
                            onCta={() => {
                              if (!activationStatus?.firstAwaitingFundingVaultId) return
                              setFundingVaultId(activationStatus.firstAwaitingFundingVaultId)
                            }}
                          />
                          <ChecklistRow
                            done={!!activationStatus?.hasCheckIn}
                            label="Submit your first check-in"
                            ctaLabel="Check-in"
                            disabled={!activationStatus?.firstActiveVaultId}
                            onCta={() => {
                              const v = (vaults as Array<any>).find((x) => x._id === activationStatus?.firstActiveVaultId)
                              if (!v) return
                              setCheckingInGoal(v)
                            }}
                          />
                          <ChecklistRow
                            done={!!activationStatus?.hasWitness}
                            label="Invite a witness"
                            ctaLabel="Invite"
                            disabled={!(activationStatus?.firstActiveVaultId || activationStatus?.firstVaultId)}
                            onCta={() => {
                              const vaultId = activationStatus?.firstActiveVaultId || activationStatus?.firstVaultId
                              if (!vaultId) return
                              navigate({
                                to: '/community',
                                search: { view: 'witnesses', vaultId: String(vaultId) } as any,
                              })
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        {(vaults as Array<any>).map((vault: any) => (
                            <VaultCard
                              key={vault._id}
                              vault={vault}
                              onCheckIn={() => setCheckingInGoal(vault)}
                              onFund={() => setFundingVaultId(vault._id)}
                            />
                        ))}
                        
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="group relative rounded-[4rem] border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center p-12 hover:bg-white/[0.03] hover:border-blue-500/20 transition-all min-h-[350px] shadow-inner"
                        >
                            <Plus size={48} className="text-white/5 mb-8 group-hover:scale-110 group-hover:text-blue-500 transition-all" />
                            <p className="text-white/30 font-black uppercase tracking-[0.3em] text-xs italic">Initiate New Protocol</p>
                            <p className="text-[9px] text-white/10 uppercase tracking-widest mt-3 italic font-black">Stake capital to enforce discipline</p>
                        </button>
                    </div>
                </motion.div>
            ) : activeTab === 'witnessing' ? (
                <motion.div 
                    key="witnessing"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="space-y-16"
                >
                    <AnimatePresence>
                        {activeEvidenceLog ? (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                        setVerificationComment('')
                                        setActiveEvidenceLog(null)
                                    }}
                                    className="fixed inset-0 z-[90] bg-[#050810]/70 backdrop-blur-xl"
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.98 }}
                                    transition={{ duration: 0.18 }}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                                >
                                    <div className="w-full max-w-2xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                                        <div className="p-6 sm:p-10 border-b border-white/10 flex items-start justify-between gap-6">
                                            <div className="text-left">
                                                <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                                                    Evidence Log
                                                </p>
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                                                    Participant: {activeEvidenceLog.userName}
                                                </p>
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-2 leading-relaxed">
                                                    Goal: {activeEvidenceLog.goalTitle}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVerificationComment('')
                                                    setActiveEvidenceLog(null)
                                                }}
                                                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="p-6 sm:p-10 space-y-6">
                                            {activeEvidenceLog.proofUrl ? (
                                                <div className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-inner">
                                                    <img
                                                        src={activeEvidenceLog.proofUrl}
                                                        className="w-full max-h-[520px] object-contain"
                                                        alt="Execution Evidence"
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/10">
                                                <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                                    Log Note
                                                </p>
                                                <p className="mt-4 text-xs text-white/50 italic font-medium leading-relaxed">
                                                    {activeEvidenceLog.note || 'No specification provided with this log.'}
                                                </p>
                                            </div>

                                            <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/10">
                                                <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                                    Witness Report
                                                </p>
                                                <textarea
                                                    value={verificationComment}
                                                    onChange={(e) => setVerificationComment(e.target.value)}
                                                    placeholder="Write why you are approving or rejecting this evidence."
                                                    className="mt-4 h-32 w-full resize-none rounded-2xl border border-white/10 bg-[#050810]/80 px-5 py-4 text-xs text-white outline-none transition-all focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await handleVerify(activeEvidenceLog._id, 'rejected', verificationComment)
                                                        setVerificationComment('')
                                                        setActiveEvidenceLog(null)
                                                    }}
                                                    className="py-5 rounded-2xl border border-red-500/20 text-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl active:scale-95"
                                                    disabled={!verificationComment.trim()}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await handleVerify(activeEvidenceLog._id, 'approved', verificationComment)
                                                        setVerificationComment('')
                                                        setActiveEvidenceLog(null)
                                                    }}
                                                    className="py-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-blue-900/40 active:scale-95"
                                                    disabled={!verificationComment.trim()}
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        ) : null}
                    </AnimatePresence>

                    {((incomingApplications as Array<any>)?.length || 0) > 0 && (
                        <section className="text-left">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                                Incoming Witness Applications
                                <div className="h-px flex-1 bg-white/5 text-left" />
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                {(incomingApplications as Array<any>).map((req: any) => (
                                    <div key={req._id} className="p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:border-blue-500/20 transition-all text-left shadow-2xl">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                                <Users size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 italic">{req.partner?.name} Applied To Witness</p>
                                                <p className="font-black italic uppercase text-lg text-white">{req.goal?.title}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                              await acceptApplication({ partnerShipId: req._id } as any)
                                              toast.success('Witness activated.', { title: 'Accepted' })
                                              await queryClient.invalidateQueries()
                                            }}
                                            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest italic shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {((incomingRequests as Array<any>)?.length || 0) > 0 && (
                        <section className="text-left">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                                Incoming Witness Requests
                                <div className="h-px flex-1 bg-white/5 text-left" />
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                {(incomingRequests as Array<any>).map((req: any) => (
                                    <div key={req._id} className="p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:border-blue-500/20 transition-all text-left shadow-2xl">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                                <Users size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 italic">{req.requester?.name} Requests Oversight</p>
                                                <p className="font-black italic uppercase text-lg text-white">{req.goal?.title}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => acceptPartnerRequest({ partnerShipId: req._id })}
                                            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest italic shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Accept Role
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {((myWitnessProtocols as Array<any>)?.length || 0) > 0 && (
                        <section className="text-left">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                                Your Witness Assignments
                                <div className="h-px flex-1 bg-white/5 text-left" />
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                {(myWitnessProtocols as Array<any>).map((row: any) => (
                                    <div key={row?.partnership?._id ?? row?.vault?._id} className="p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] text-left shadow-2xl">
                                        <div className="flex items-center justify-between gap-6">
                                            <div className="flex items-center gap-6 min-w-0">
                                                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                                    {row?.owner?.image ? (
                                                        <img src={row.owner.image} className="w-full h-full object-cover" alt="Owner" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20">
                                                            <Users size={18} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic truncate">
                                                        Owner: {row?.owner?.name || 'Unknown'}
                                                    </p>
                                                    <p className="font-black italic uppercase text-lg text-white truncate">
                                                        {row?.goal?.title || 'Protocol'}
                                                    </p>
                                                    <p className="mt-2 text-[9px] text-white/30 font-black uppercase tracking-[0.3em] italic truncate">
                                                        Status: {row?.vault?.status || '—'} • Integrity {row?.owner?.integrityScore ?? 0}%
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/vault/$id"
                                                params={{ id: row?.vault?._id }}
                                                className="px-6 py-3 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest italic shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0"
                                            >
                                                Open Spec
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                            Evidence Authorization Terminal
                            <div className="h-px flex-1 bg-white/5 text-left" />
                        </h3>
                        
                        {(pendingVerifications as Array<any>).length === 0 ? (
                            <div className="p-24 rounded-[4rem] border border-white/5 bg-white/[0.01] text-center shadow-inner group">
                                <ShieldCheck size={60} className="mx-auto text-white/5 mb-8 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-sm text-white/20 italic font-black uppercase tracking-widest">No evidence logs awaiting authorization</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                {(pendingVerifications as Array<any>).map((log: any) => (
                                    <div
                                        key={log._id}
                                        onClick={() => {
                                            setVerificationComment('')
                                            setActiveEvidenceLog(log)
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        className="p-10 rounded-[3.5rem] border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-3xl overflow-hidden group hover:border-blue-500/20 transition-all text-left shadow-[0_20px_60px_rgba(0,0,0,0.4)] cursor-pointer active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-xl">
                                                <Eye size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Participant: {log.userName}</p>
                                                <p className="font-black italic uppercase text-lg text-white">{log.goalTitle}</p>
                                            </div>
                                        </div>

                                        {log.proofUrl && (
                                            <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-8 border border-white/5 shadow-inner bg-black">
                                                <img src={log.proofUrl} className="w-full h-full object-cover" alt="Execution Evidence" />
                                            </div>
                                        )}

                                        <p className="p-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-white/40 italic font-medium mb-10 leading-relaxed line-clamp-3">
                                            {log.note || 'No specification provided with this log.'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setVerificationComment('')
                                                    setActiveEvidenceLog(log)
                                                }}
                                                className="py-5 rounded-2xl border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl"
                                            >
                                                Reject Log
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setVerificationComment('')
                                                    setActiveEvidenceLog(log)
                                                }}
                                                className="py-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-blue-900/40"
                                            >
                                                Authorize
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                            Explore Protocols & Offer Witnessing
                            <div className="h-px flex-1 bg-white/5 text-left" />
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                            {(discoverableVaults as Array<any>)
                                .filter((v: any) => v.userId !== user._id)
                                .map((v: any) => (
                                <div key={v._id} className="p-10 rounded-[3.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 text-white/[0.02] group-hover:scale-110 transition-transform">
                                        <Users size={120} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-orange-500 p-0.5">
                                                <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-[8px] font-black uppercase italic overflow-hidden">
                                                    {v.user?.image ? (
                                                      <img src={v.user.image} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                      v.user?.name?.[0]
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[9px] font-black text-white italic uppercase tracking-widest">{v.user?.name}</p>
                                                <p className="text-[8px] text-white/20 uppercase font-black italic">Integrity: {v.user?.integrityScore}%</p>
                                            </div>
                                        </div>

                                        <h4 className="text-xl font-black italic uppercase text-white mb-2">{v.goal?.title}</h4>
                                        <p className="text-[10px] text-white/20 mb-8 italic font-medium uppercase tracking-tighter line-clamp-2">{v.goal?.description}</p>
                                        
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="text-left">
                                                <p className="text-[8px] font-black uppercase text-white/10 italic">Stake</p>
                                                <p className="text-sm font-black italic text-blue-500">₦{(v.amount / 100).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase text-white/10 italic">Frequency</p>
                                                <p className="text-sm font-black italic text-white uppercase">{v.goal?.frequency_type}</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleRequestWitness(v._id)}
                                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all font-black text-[9px] uppercase tracking-widest italic"
                                        >
                                            Apply as Witness
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </motion.div>
            ) : null}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isCreating && (
          <Suspense fallback={null}>
            <CreateVaultModal
              onClose={() => setIsCreating(false)}
              onCreated={(vaultId) => {
                setIsCreating(false)
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                const url = `${origin}/vault/${vaultId}`
                setFundPrompt({ open: true, vaultId, url })
              }}
            />
          </Suspense>
        )}
        {fundingVaultId ? (
          <Suspense fallback={null}>
            <FundProtocolModal
              vaultId={fundingVaultId}
              user={user}
              onClose={() => setFundingVaultId(null)}
              onSuccess={() => {
                if (!shareAfterFunding) return
                setSharePrompt({ open: true, ...shareAfterFunding })
                setShareAfterFunding(null)
              }}
            />
          </Suspense>
        ) : null}
        {checkingInGoal && (
          <Suspense fallback={null}>
            <CheckInModal
              vault={checkingInGoal}
              onClose={() => setCheckingInGoal(null)}
              onSuccess={() => {
                const origin =
                  typeof window !== 'undefined' ? window.location.origin : ''
                const url = `${origin}/vault/${checkingInGoal?._id}`
                setSharePrompt({
                  open: true,
                  title: String(checkingInGoal?.goal?.title ?? 'Protocol'),
                  status: String(checkingInGoal?.status ?? ''),
                  url,
                })
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <SharePromptModal
        open={sharePrompt.open}
        title={sharePrompt.title}
        status={sharePrompt.status}
        url={sharePrompt.url}
        onClose={() => {
          setSharePrompt({ open: false, title: '', url: '' })
        }}
      />

      <FundNowModal
        open={fundPrompt.open}
        onFundNow={() => {
          const id = fundPrompt.vaultId
          const url = fundPrompt.url
          setFundPrompt({ open: false, vaultId: null, url: '' })
          if (id) setFundingVaultId(id)
          setShareAfterFunding({ title: 'New Protocol', status: 'active', url })
        }}
        onLater={() => {
          const url = fundPrompt.url
          setFundPrompt({ open: false, vaultId: null, url: '' })
          setSharePrompt({ open: true, title: 'New Protocol', status: 'awaiting_funding', url })
        }}
      />
    </div>
  );
}

function ChecklistRow({
  done,
  label,
  ctaLabel,
  disabled,
  onCta,
}: {
  done: boolean;
  label: string;
  ctaLabel: string;
  disabled?: boolean;
  onCta: () => void;
}) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all ${
            done ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/30'
          }`}
        >
          <ShieldCheck size={18} />
        </div>
        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.28em] italic truncate">
          {label}
        </p>
      </div>
      <button
        type="button"
        disabled={done || disabled}
        onClick={onCta}
        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic transition-all active:scale-95 ${
          done
            ? 'bg-white/5 border border-white/10 text-white/20 pointer-events-none'
            : disabled
              ? 'bg-white/5 border border-white/10 text-white/20 opacity-60 pointer-events-none'
              : 'bg-white text-black hover:scale-[1.02]'
        }`}
      >
        {done ? 'Done' : ctaLabel}
      </button>
    </div>
  )
}

function VaultCard({ vault, onCheckIn, onFund }: { vault: any, onCheckIn: () => void, onFund: () => void }) {
  const isFailed = vault.status === 'failed';
  const isAwaitingFunding = vault.status === 'awaiting_funding';
  const [timeLeft, setTimeLeft] = useState<string>('');
  const principalKoboRaw = Number((vault)?.amount)
  const principalKobo = Number.isFinite(principalKoboRaw) ? principalKoboRaw : 0

  useEffect(() => {
    if (isFailed || isAwaitingFunding) return;
    
    const interval = setInterval(() => {
        const now = Date.now();
        const end = vault.endDate;
        if (!end) {
          setTimeLeft('');
          return;
        }
        const diff = end - now;

        if (diff <= 0) {
            setTimeLeft('PROTOCOL EXPIRED');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        
        setTimeLeft(`${days}D ${hours}H ${minutes}M REMAINING`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAwaitingFunding, vault.endDate, isFailed]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: isFailed ? [0, -2, 2, -2, 2, 0] : 0,
      }}
      transition={{ 
        duration: isFailed ? 0.4 : 0.5,
        x: isFailed ? { repeat: Infinity, repeatType: "mirror", duration: 0.1 } : undefined
      }}
      className={`group relative rounded-[3.5rem] border transition-all text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ${
        isFailed 
          ? 'border-red-500/30 bg-red-950/10' 
          : 'border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl hover:bg-[#0a0f1a] hover:border-blue-500/20'
      }`}
    >
      {isFailed && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0.05, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-red-600 pointer-events-none z-0"
        />
      )}

      <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
        <Target size={180} strokeWidth={1} />
      </div>

      <div className="relative z-10 text-left p-12">
        <div className="flex items-center justify-between mb-10 text-left font-black">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest italic shadow-xl ${
            isFailed 
                ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                : isAwaitingFunding
                  ? 'bg-white/5 border-white/10 text-white/40'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
          }`}>
            {isFailed ? 'Protocol Breach' : isAwaitingFunding ? 'Awaiting Funding' : 'Active Goal'}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest italic ${isFailed ? 'text-red-500/40' : 'text-white/10'}`}>Ref: {vault._id.slice(0,6)}</span>
        </div>

        <h3 className={`text-3xl font-black mb-3 italic tracking-tight uppercase leading-tight ${isFailed ? 'text-red-500' : 'text-white'}`}>
            {vault.goal.title}
        </h3>
        
        {!isFailed && !isAwaitingFunding ? (
            <div className="flex items-center gap-2 mb-6">
                <Clock size={12} className="text-[#ff7a00]" />
                <p className="text-[10px] font-black text-[#ff7a00] uppercase tracking-widest italic">{timeLeft}</p>
            </div>
        ) : null}

        <p className={`text-sm mb-12 line-clamp-2 italic font-medium leading-relaxed uppercase tracking-tighter ${isFailed ? 'text-red-500/40' : 'text-white/30'}`}>
            {vault.goal.description}
        </p>

        <div className="space-y-4 mb-12 text-left font-black italic">
          <div
            className={`p-6 rounded-[2rem] border text-left transition-colors shadow-inner flex items-center justify-between gap-6 ${
              isFailed
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-white/[0.02] border-white/5 group-hover:border-blue-500/20'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 italic">
              Principal
            </p>
            <p
              className={`text-xl font-black italic tracking-tighter uppercase leading-none text-right ${
                isFailed ? 'text-red-500 line-through' : 'text-white'
              }`}
            >
              ₦{(principalKobo / 100).toLocaleString()}
            </p>
          </div>

          <div
            className={`p-6 rounded-[2rem] border text-left transition-colors shadow-inner flex items-center justify-between gap-6 ${
              isFailed
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-white/[0.02] border-white/5 group-hover:border-[#ff7a00]/20'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 italic">
              Pain Tier
            </p>
            <p
              className={`text-sm sm:text-xl font-black italic tracking-tighter uppercase leading-none text-right ${
                isFailed ? 'text-red-500' : 'text-[#ff7a00]'
              }`}
            >
              {vault.painTier || 'Serious'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 font-black uppercase tracking-widest text-[10px] italic">
            {isFailed ? (
                <div className="w-full py-6 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center gap-3 shadow-xl font-black">
                    <AlertCircle size={18} /> Forfeiture Processed
                </div>
            ) : isAwaitingFunding ? (
                <button
                    onClick={onFund}
                    className="w-full py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-white text-black hover:scale-[1.02] shadow-white/5"
                >
                    <CreditCard size={18} /> Fund & Activate
                </button>
            ) : (
                <button 
                    onClick={onCheckIn}
                    className="w-full py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-white text-black hover:scale-[1.02] shadow-white/5"
                >
                    <Camera size={18} /> Execute Log
                </button>
            )}
            <Link 
                to="/vault/$id"
                params={{ id: vault._id }}
                className={`w-full py-6 rounded-2xl border transition-all text-center ${isFailed ? 'border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/5' : 'border-white/5 text-white/20 hover:text-white hover:bg-white/5'}`}
            >
                Specification
            </Link>
        </div>
      </div>
    </motion.div>
  );
}
