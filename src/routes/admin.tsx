import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { ConfirmModal } from '~/components/confirm-modal';
import { sanitizeMessage } from '~/lib/errors';
import { 
  Users, 
  Download, 
  TrendingUp, 
  ShieldCheck,
  MoreVertical,
  Wallet,
  Activity,
  ArrowLeft,
  Settings,
  Lock,
  Search,
  Database,
  ScrollText,
  ReceiptText,
  X
} from 'lucide-react';
import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMPTY_ARGS: Record<string, never> = {};

export const Route = createFileRoute('/admin')({
  component: AdminWrapper,
});

function AdminWrapper() {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    if (pathname !== "/admin") return <Outlet />;
    return (
        <ErrorBoundary>
            <Suspense fallback={<AdminLoading />}>
                <AdminDashboard />
            </Suspense>
        </ErrorBoundary>
    );
}

// Simple Error Boundary Component for Admin
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            const errorMsg = sanitizeMessage(this.state.error?.message || "", "Administrative interface failed to initialize.");
            const isAuthError = errorMsg.includes("UNAUTHORIZED") || errorMsg.includes("ACCESS DENIED") || errorMsg.includes("privileges required");
            
            return (
                <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center p-6 text-center">
                    <div className={`h-20 w-20 rounded-3xl ${isAuthError ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'} border flex items-center justify-center mb-8`}>
                        <Lock size={40} />
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">
                        {isAuthError ? "Access Denied" : "System Error"}
                    </h1>
                    <p className="text-white/40 font-black italic uppercase text-sm max-w-md leading-relaxed mb-10">
                        {isAuthError 
                            ? "Security Alert: This terminal is restricted to authorized protocol administrators only. Your identity hash has been logged."
                            : `Technical Breach: ${errorMsg}`}
                    </p>
                    <div className="flex gap-4">
                        <Link to="/login" className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all">
                            Verify Identity
                        </Link>
                        <Link to="/" className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all">
                            Return Home
                        </Link>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function AdminLoading() {
    return (
        <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white/20 italic font-black uppercase tracking-[0.5em]">
            <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-8" />
            Initializing Command Center...
        </div>
    );
}

function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const formatCompact = (n: number) =>
    new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  const userQuery = convexQuery(api.users.current, EMPTY_ARGS as any) as any;
  const { data: user, isFetching: userFetching }: { data: any; isFetching: boolean } = useSuspenseQuery({
    ...(userQuery as any),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  } as any);
  const isVerified = !!user?.emailVerificationTime;
  
  const adminStatusQuery = convexQuery(api.admin.checkAdminStatus, EMPTY_ARGS as any) as any;
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  } as any);

  const isAdmin = !!adminStatus?.isAdmin;

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'audit' | 'waitlist' | 'withdrawals' | 'breaches'>('overview');

  const statsQuery = convexQuery(api.admin.getSystemStats, EMPTY_ARGS as any) as any;
  const { data: stats }: { data: any } = useSuspenseQuery({
    ...statsQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  } as any);

  const waitlistQuery = convexQuery(api.waitlist.list, EMPTY_ARGS as any) as any;
  const { data: waitlist }: { data: any } = useSuspenseQuery({
    ...waitlistQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  } as any);
  const deleteWaitlistEntry = useMutation((api as any).admin.deleteWaitlistEntry);

  const pendingWithdrawalsQuery = convexQuery(api.admin.getPendingWithdrawals, EMPTY_ARGS as any) as any;
  const { data: pendingWithdrawals }: { data: any } = useSuspenseQuery({
    ...pendingWithdrawalsQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  } as any);

  const breachCandidatesQuery = convexQuery(api.admin.getBreachCandidates, EMPTY_ARGS as any) as any;
  const { data: breachCandidates }: { data: any } = useSuspenseQuery({
    ...breachCandidatesQuery,
    enabled: isAuthenticated && isVerified && isAdmin && activeTab === 'breaches',
  } as any);

  const overviewQuery = convexQuery(api.admin.getOverview, EMPTY_ARGS as any) as any;
  const { data: overview }: { data: any } = useSuspenseQuery({
    ...overviewQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  } as any);

  const auditQuery = convexQuery((api as any).admin.getAuditLog, { limit: 100 } as any) as any;
  const { data: auditLog }: { data: any } = useSuspenseQuery({
    ...auditQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  } as any);
  
  const sweep = useMutation(api.admin.triggerMidnightSweep);
  const distribute = useMutation(api.admin.triggerWeeklyDistribution);
  const approveWithdrawal = useAction(api.admin.approveWithdrawal);
  const enforceBreach = useMutation(api.admin.enforceProtocolBreach);
  const seedHistory = useAction((api as any).admin.seedDummyUserHistory);
  const populateExistingHistory = useAction((api as any).admin.populateExistingUserHistory);
  const previewPaystackTransaction = useAction((api as any).admin.previewPaystackTransaction);
  const recoverPaystackTransaction = useAction((api as any).admin.recoverPaystackTransaction);
  const paymentsExplorerLookup = useAction((api as any).admin.paymentsExplorerLookup);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description?: string; tone?: 'primary' | 'danger'; confirmLabel: string; run: (() => Promise<void>) | null }>({ open: false, title: '', confirmLabel: '', run: null });
  const [waitlistDetail, setWaitlistDetail] = useState<any>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedDomain, setSeedDomain] = useState('protocol.io');
  const [seedLimit, setSeedLimit] = useState(20);
  const [seedGoalsPerUser, setSeedGoalsPerUser] = useState(3);
  const [seedLogsPerGoal, setSeedLogsPerGoal] = useState(10);
  const [seedRunning, setSeedRunning] = useState<null | 'seed' | 'populate'>(null);
  const [seedFeedback, setSeedFeedback] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paystackReference, setPaystackReference] = useState('');
  const [paystackPreview, setPaystackPreview] = useState<any>(null);
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paymentsExplorerOpen, setPaymentsExplorerOpen] = useState(false);
  const [paymentsExplorerQuery, setPaymentsExplorerQuery] = useState('');
  const [paymentsExplorerLoading, setPaymentsExplorerLoading] = useState(false);
  const [paymentsExplorerResult, setPaymentsExplorerResult] = useState<any>(null);

  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [verifyLookup, setVerifyLookup] = useState('');
  const [verifyPicked, setVerifyPicked] = useState<any>(null);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<null | { tone: 'success' | 'error'; message: string }>(null);
  const [usersCursor, setUsersCursor] = useState<string | null>(null);
  const [usersCursorStack, setUsersCursorStack] = useState<Array<string | null>>([]);
  const usersPageSize = 25;
  const [txCursor, setTxCursor] = useState<string | null>(null);
  const [txCursorStack, setTxCursorStack] = useState<Array<string | null>>([]);
  const txPageSize = 25;
  const updateUserVerifications = useMutation((api as any).admin.updateUserVerifications);
  const markUserEmailVerified = useMutation((api as any).admin.markUserEmailVerified);
  const [userEditRunning, setUserEditRunning] = useState(false);
  const [statsDetail, setStatsDetail] = useState<null | 'revenue' | 'staked' | 'citizens' | 'health'>(null);

  const searchUsersQuery = convexQuery((api as any).admin.searchUsers, { q: userSearch, limit: 20 } as any) as any;
  const { data: searchedUsers } = useQuery({
    ...(searchUsersQuery as any),
    enabled: isAuthenticated && isVerified && isAdmin && userSearch.trim().length > 0,
  } as any);

  const allUsersQuery = convexQuery(
    (api as any).admin.listUsersPage,
    { cursor: usersCursor ?? undefined, limit: usersPageSize } as any,
  ) as any;
  const { data: allUsersPage } = useQuery({
    ...(allUsersQuery as any),
    enabled: isAuthenticated && isVerified && isAdmin && userSearch.trim().length === 0,
    placeholderData: { page: [], isDone: false, continueCursor: null },
  } as any);

  const transactionsPageQuery = convexQuery(
    (api as any).admin.listTransactionsPage,
    { cursor: txCursor ?? undefined, limit: txPageSize } as any,
  ) as any;
  const { data: transactionsPage } = useQuery({
    ...(transactionsPageQuery as any),
    enabled: isAuthenticated && isVerified && isAdmin && activeTab === 'transactions',
    placeholderData: { page: [], isDone: false, continueCursor: null },
  } as any);

  const emailPrefixQuery = convexQuery(
    (api as any).admin.searchUsersByEmailPrefix,
    { prefix: verifyLookup, limit: 10 } as any,
  ) as any;
  const { data: emailPrefixMatches } = useQuery({
    ...(emailPrefixQuery as any),
    enabled: isAuthenticated && isVerified && isAdmin && verifyLookup.trim().length > 0,
    placeholderData: [],
  } as any);

  const selectedUserProtocolsQuery = convexQuery(
    (api as any).admin.getUserProtocols,
    { userId: selectedUser?._id, limit: 50 } as any,
  ) as any;
  const { data: selectedUserProtocols } = useQuery({
    ...(selectedUserProtocolsQuery as any),
    enabled: isAuthenticated && isVerified && isAdmin && !!selectedUser?._id,
    placeholderData: [],
  } as any);

  useEffect(() => {
    if (userSearch.trim().length === 0) {
      setUsersCursor(null);
      setUsersCursorStack([]);
    }
  }, [userSearch]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !userFetching && !isVerified) {
      navigate({ to: '/verify-required' });
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user, userFetching]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && isVerified && adminStatus && !adminStatus.isAdmin) {
      return;
    }
  }, [adminStatus, authLoading, isAuthenticated, isVerified, navigate]);

  if (authLoading || !isAuthenticated || !user) return <AdminLoading />;
  if (!isVerified) return <AdminLoading />;
  if (adminStatus && !adminStatus.isAdmin) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white px-8">
        <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-blue-500" size={22} />
            <div className="font-black italic uppercase tracking-[0.2em] text-sm text-white/70">
              Admin Access Blocked
            </div>
          </div>
          <div className="text-white/40 text-xs font-bold italic uppercase tracking-widest leading-relaxed">
            Email: <span className="text-white/70">{adminStatus?.debug?.email ?? user?.email ?? '—'}</span>
          </div>
          <div className="mt-3 text-white/40 text-xs font-bold italic uppercase tracking-widest leading-relaxed">
            Reason: <span className="text-white/70">{adminStatus?.reason ?? 'Not authorized'}</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/40">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              Verified: <span className="text-white/70">{adminStatus?.debug?.isVerified ? 'yes' : 'no'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              Allowlist: <span className="text-white/70">{adminStatus?.debug?.isAllowlistAdmin ? 'yes' : 'no'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              DB Admin: <span className="text-white/70">{adminStatus?.debug?.isDbAdmin ? 'yes' : 'no'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              Signed In: <span className="text-white/70">{isAuthenticated ? 'yes' : 'no'}</span>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => queryClient.invalidateQueries()}
              className="flex-1 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all italic"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/10 text-white/70 font-black text-xs uppercase tracking-[0.2em] hover:text-white transition-all italic"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <AdminLoading />;

  const exportCSV = () => {
    const csv = [
      ['Email', 'Joined At'],
      ...waitlist.map((e: any) => [e.email, new Date(e._creationTime).toLocaleString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lockedin-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <Link to="/dashboard" className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Command Center</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Administrative Protocol</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 font-black uppercase tracking-widest text-[10px] italic">
                <ShieldCheck size={14} /> Root Access Active
            </div>
            <a
              href="/admin/settings"
              className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-white transition-all active:scale-95"
            >
              <Settings size={20} />
            </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-8 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <button
              type="button"
              onClick={() => setStatsDetail('revenue')}
              className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-blue-500/20 transition-all text-left w-full"
            >
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Protocol Revenue</span>
                    <TrendingUp size={18} className="text-blue-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">₦{(stats.revenue / 100).toLocaleString()}</p>
                <p className="mt-2 text-[10px] text-green-500 font-black uppercase tracking-widest italic">Captured Liquidity</p>
            </button>

            <button
              type="button"
              onClick={() => setStatsDetail('staked')}
              className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-[#ff7a00]/20 transition-all text-left w-full"
            >
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Active Stakes</span>
                    <Wallet size={18} className="text-[#ff7a00]" />
                </div>
                <p className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-black text-white italic tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                  ₦{formatCompact(stats.totalStaked / 100)}
                </p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">{stats.activeVaults} Active Goals</p>
            </button>

            <button
              type="button"
              onClick={() => setStatsDetail('citizens')}
              className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-blue-500/20 transition-all text-left w-full"
            >
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Total Citizens</span>
                    <Users size={18} className="text-blue-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">{stats.totalUsers}</p>
                <p className="mt-2 text-[10px] text-blue-500 font-black uppercase tracking-widest italic">Identity Anchored</p>
            </button>

            <button
              type="button"
              onClick={() => setStatsDetail('health')}
              className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-green-500/20 transition-all text-left w-full"
            >
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">System Health</span>
                    <Activity size={18} className="text-green-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">STABLE</p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">Crons Executing</p>
            </button>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
            {([
              { key: 'overview', label: 'Overview', count: null },
              { key: 'withdrawals', label: 'Extractions', count: pendingWithdrawals?.length || 0 },
              { key: 'breaches', label: 'Breaches', count: breachCandidates?.length || 0 },
              { key: 'users', label: 'Users', count: stats?.totalUsers || 0 },
              { key: 'transactions', label: 'Transactions', count: null },
              { key: 'audit', label: 'Audit', count: (auditLog?.length || 0) },
              { key: 'waitlist', label: 'Waitlist', count: waitlist?.length || 0 },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === (t.key as any)
                    ? 'bg-white text-black shadow-xl'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' ? (
                  <span className="ml-2 text-[9px] font-black uppercase tracking-widest italic opacity-70">
                    {t.count}
                  </span>
                ) : null}
              </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 rounded-[2.5rem] border border-white/5 bg-[#0a0f1a] overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div 
                            key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="p-6 sm:p-10 space-y-8"
                        >
                            <div className="text-left">
                              <h3 className="text-lg text-white font-black italic uppercase">Operational Overview</h3>
                              <p className="text-[10px] text-white/20 tracking-widest mt-2 font-black italic uppercase">Last 24 Hours</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 shadow-inner text-left">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic">Deposits</p>
                                <p className="mt-4 text-3xl font-black italic uppercase tracking-tight text-white">
                                  ₦{((overview?.depositVolume24h ?? 0) / 100).toLocaleString()}
                                </p>
                                <p className="mt-2 text-[10px] text-green-500 font-black uppercase tracking-widest italic">
                                  {overview?.deposits24h ?? 0} Completed
                                </p>
                              </div>
                              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 shadow-inner text-left">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic">Protocols Created</p>
                                <p className="mt-4 text-3xl font-black italic uppercase tracking-tight text-white">
                                  {overview?.protocols24h ?? 0}
                                </p>
                                <p className="mt-2 text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                                  Active vaults: {overview?.activeVaults ?? 0}
                                </p>
                              </div>
                              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 shadow-inner text-left">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic">Pending Extractions</p>
                                <p className="mt-4 text-3xl font-black italic uppercase tracking-tight text-white">
                                  {overview?.pendingWithdrawals ?? 0}
                                </p>
                                <p className="mt-2 text-[10px] text-[#ff7a00] font-black uppercase tracking-widest italic">
                                  ₦{((overview?.pendingWithdrawalAmount ?? 0) / 100).toLocaleString()} Pending
                                </p>
                              </div>
                              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 shadow-inner text-left">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic">Admin Signals</p>
                                <p className="mt-4 text-[10px] text-white/40 font-black uppercase tracking-widest italic leading-relaxed">
                                  {overview?.pendingWithdrawals ? 'Extraction queue pending. Review before EOD.' : 'No extraction queue backlog.'}
                                </p>
                                <p className="mt-3 text-[10px] text-white/20 font-black uppercase tracking-widest italic leading-relaxed">
                                  {breachCandidates?.length ? 'Active breach candidates require enforcement review.' : 'No breach enforcement flagged.'}
                                </p>
                              </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'withdrawals' && (
                        <motion.div 
                            key="withdrawals" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-4 sm:px-10 py-6 sm:py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Extraction Protocol</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">Pending Capital Transfers</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Citizen</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Amount</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Bank Specifications</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6 text-right">Goal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!pendingWithdrawals || pendingWithdrawals.length === 0 ? (
                                            <tr><td colSpan={4} className="px-4 sm:px-10 py-16 sm:py-20 text-center text-white/20 font-black italic uppercase tracking-widest">No pending extractions</td></tr>
                                        ) : (
                                            pendingWithdrawals.map((w: any) => (
                                                <tr key={w._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-4 sm:px-10 py-4 sm:py-6">
                                                        <p className="font-bold italic text-white text-sm">{w.user?.name}</p>
                                                        <p className="text-[10px] text-white/20 uppercase font-black">{w.user?.email}</p>
                                                    </td>
                                                    <td className="px-4 sm:px-10 py-4 sm:py-6 font-black italic text-blue-500 text-lg">₦{(w.amount/100).toLocaleString()}</td>
                                                    <td className="px-4 sm:px-10 py-4 sm:py-6">
                                                        <p className="text-xs text-white italic font-medium uppercase tracking-tight">{w.bank_details?.bank_name}</p>
                                                        <p className="text-[10px] text-white/40 font-black tracking-widest mt-1">{w.bank_details?.account_number}</p>
                                                    </td>
                                                    <td className="px-4 sm:px-10 py-4 sm:py-6 text-right">
                                                        <button 
                                                            onClick={() => setConfirm({
                                                              open: true,
                                                              title: 'Process extraction transfer?',
                                                              description: `This will initiate a Paystack transfer of ₦${(w.amount/100).toLocaleString()} to ${w.bank_details?.bank_name} (${w.bank_details?.account_number}).`,
                                                              confirmLabel: 'Process Transfer',
                                                              tone: 'primary',
                                                              run: async () => {
                                                                const res = await approveWithdrawal({ withdrawalId: w._id })
                                                                if (res?.success) {
                                                                  toast.success(res.message, { title: 'Transfer Initiated' })
                                                                } else {
                                                                  toast.error(res?.message || 'Transfer failed.', { title: 'Transfer Failed' })
                                                                }
                                                              }
                                                            })}
                                                            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            Process Transfer
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'breaches' && (
                        <motion.div 
                            key="breaches" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-4 sm:px-10 py-6 sm:py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Active Goal Monitor</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">High Risk Candidates</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Protocol Identity</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Staked Principal</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Integrity</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6 text-right">Enforcement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {breachCandidates.map((b: any) => (
                                            <tr key={b._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                                <td className="px-4 sm:px-10 py-4 sm:py-6">
                                                    <p className="font-bold italic text-white text-sm uppercase">{b.goal?.title}</p>
                                                    <p className="text-[10px] text-white/20 uppercase font-black italic tracking-widest">{b.user?.name}</p>
                                                </td>
                                                <td className="px-4 sm:px-10 py-4 sm:py-6 font-black italic text-white text-lg">₦{(b.amount/100).toLocaleString()}</td>
                                                <td className="px-4 sm:px-10 py-4 sm:py-6">
                                                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${b.user?.integrityScore || 100}%` }} />
                                                    </div>
                                                    <p className="text-[9px] text-white/20 mt-2 font-black uppercase tracking-widest">{b.user?.integrityScore || 100}% Score</p>
                                                </td>
                                                <td className="px-4 sm:px-10 py-4 sm:py-6 text-right">
                                                    <button 
                                                        onClick={() => setConfirm({
                                                          open: true,
                                                          title: 'Enforce forfeiture?',
                                                          description: `This will mark the vault as failed and forfeit ₦${(b.amount/100).toLocaleString()} for ${b.user?.name}.`,
                                                          confirmLabel: 'Enforce Forfeiture',
                                                          tone: 'danger',
                                                          run: async () => {
                                                            await enforceBreach({ vaultId: b._id })
                                                            toast.success('Forfeiture enforced.', { title: 'Enforcement Complete' })
                                                          }
                                                        })}
                                                        className="px-5 py-2 rounded-xl border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all active:scale-95"
                                                    >
                                                        Enforce Forfeiture
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'waitlist' && (
                        <motion.div 
                            key="waitlist" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-4 sm:px-10 py-6 sm:py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Waitlist Protocol</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">Pending Citizens</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={exportCSV} className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all active:scale-95 border border-white/5"><Download size={20} /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Identity</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6">Anchored At</th>
                                            <th className="px-4 sm:px-10 py-4 sm:py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlist.map((entry: any) => (
                                            <tr key={entry._id} className="group hover:bg-white/[0.01] transition-colors border-b border-white/[0.02]">
                                                <td className="px-4 sm:px-10 py-4 sm:py-6">
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                          type="button"
                                                          onClick={() => setWaitlistDetail(entry)}
                                                          className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 italic font-black border border-blue-500/10 shadow-xl text-xs active:scale-95 transition-all"
                                                        >
                                                          @
                                                        </button>
                                                        <span className="font-bold italic text-white text-sm">{entry.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-10 py-4 sm:py-6 text-white/30 text-xs font-black italic uppercase">
                                                    {new Date(entry._creationTime).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 sm:px-10 py-4 sm:py-6 text-right">
                                                    <button
                                                      type="button"
                                                      onClick={() => setWaitlistDetail(entry)}
                                                      className="p-2 text-white/30 hover:text-white transition-all active:scale-95"
                                                    >
                                                      <MoreVertical size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'audit' && (
                        <motion.div 
                            key="audit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white flex items-center gap-3"><ScrollText size={18} className="text-white/40" /> Audit Log</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">Administrative and system events</p>
                                </div>
                            </div>
                            <div className="p-10 space-y-4">
                              {(auditLog as any[])?.length ? (
                                (auditLog as any[]).map((row: any) =>
                                  row.kind === 'admin' ? (
                                    <Link
                                      key={row._id}
                                      to="/admin/audit/$auditId"
                                      params={{ auditId: row._id }}
                                      className="block p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left hover:bg-white/[0.04] hover:border-white/20 transition-all active:scale-[0.99]"
                                    >
                                      <div className="flex items-center justify-between gap-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/20">
                                          {row.action}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] italic text-white/10">
                                          {row._creationTime ? new Date(row._creationTime).toLocaleString() : ''}
                                        </p>
                                      </div>
                                      <p className="mt-4 text-xs text-white/40 italic font-medium leading-relaxed">
                                        {row.message}
                                      </p>
                                      <p className="mt-4 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                        {row.admin?.email || 'admin'}
                                      </p>
                                    </Link>
                                  ) : (
                                    <div
                                      key={row._id}
                                      className="block p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left"
                                    >
                                      <div className="flex items-center justify-between gap-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/20">
                                          {row.action}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] italic text-white/10">
                                          {row._creationTime ? new Date(row._creationTime).toLocaleString() : ''}
                                        </p>
                                      </div>
                                      <p className="mt-4 text-xs text-white/40 italic font-medium leading-relaxed">
                                        {row.message}
                                      </p>
                                      <p className="mt-4 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                        system
                                      </p>
                                    </div>
                                  ),
                                )
                              ) : (
                                <div className="text-center py-20 text-white/20 font-black italic uppercase tracking-widest">
                                  No audit records.
                                </div>
                              )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div 
                            key="users" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="p-10 space-y-8"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="text-left font-black italic uppercase">
                              <h3 className="text-lg text-white flex items-center gap-3"><Users size={18} className="text-blue-500" /> User Terminal</h3>
                              <p className="text-[10px] text-white/20 tracking-widest mt-1">Search and inspect citizens</p>
                            </div>
                          </div>

                          <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl shadow-2xl p-8 text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/20 italic">
                              Testing Tools
                            </p>
                            <p className="mt-4 text-[10px] text-white/40 font-black uppercase tracking-[0.28em] italic leading-relaxed">
                              For testing only. Search by email and mark a user as verified.
                            </p>

                            <div className="mt-6 relative">
                              <input
                                value={verifyLookup}
                                onChange={(e) => {
                                  setVerifyLookup(e.target.value)
                                  setVerifyPicked(null)
                                  setVerifyFeedback(null)
                                }}
                                placeholder="TYPE EMAIL..."
                                className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] px-6 py-5 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                              />

                              {(emailPrefixMatches as any[])?.length ? (
                                <div className="absolute left-0 right-0 mt-3 rounded-[2rem] border border-white/10 bg-[#0a0f1a] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden z-20">
                                  {(emailPrefixMatches as any[]).map((m: any) => (
                                    <button
                                      key={m._id}
                                      type="button"
                                      onClick={() => {
                                        setVerifyPicked(m)
                                        setVerifyLookup(m.email ?? '')
                                        setVerifyFeedback(null)
                                      }}
                                      className="w-full px-6 py-4 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition-all"
                                    >
                                      <p className="text-[10px] text-white font-black uppercase tracking-[0.25em] italic truncate">
                                        {m.email || '—'}
                                      </p>
                                      <p className="mt-2 text-[9px] text-white/30 font-black uppercase tracking-[0.3em] italic truncate">
                                        {m.name || 'Anonymous'} • {m.emailVerified ? 'Verified' : 'Unverified'} • BVN {m.bvn_verified ? 'Yes' : 'No'}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row gap-3">
                              <button
                                type="button"
                                disabled={verifyRunning || !verifyLookup.trim()}
                                onClick={async () => {
                                  setVerifyRunning(true)
                                  setVerifyFeedback(null)
                                  try {
                                    const res = await markUserEmailVerified({ email: verifyLookup.trim() } as any)
                                    setVerifyFeedback({
                                      tone: res?.success ? 'success' : 'error',
                                      message: res?.message ?? (res?.success ? 'Verified.' : 'Failed.'),
                                    })
                                    await queryClient.invalidateQueries()
                                  } catch (e: any) {
                                    setVerifyFeedback({ tone: 'error', message: sanitizeMessage(e?.message ?? '', 'Verification failed.') })
                                  } finally {
                                    setVerifyRunning(false)
                                  }
                                }}
                                className="px-8 py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {verifyRunning ? 'VERIFYING...' : 'MARK VERIFIED'}
                              </button>
                              <button
                                type="button"
                                disabled={!verifyPicked}
                                onClick={() => {
                                  if (!verifyPicked) return
                                  setSelectedUser(verifyPicked)
                                }}
                                className="px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest italic text-[10px] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
                              >
                                Open User
                              </button>
                            </div>

                            {verifyFeedback ? (
                              <div
                                className={`mt-6 rounded-2xl border px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] italic ${
                                  verifyFeedback.tone === 'success'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}
                              >
                                {verifyFeedback.message}
                              </div>
                            ) : null}
                          </div>

                          <div className="relative">
                            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="SEARCH NAME OR EMAIL..."
                              className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] pl-14 pr-6 py-5 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-3">
                            {userSearch.trim().length === 0 ? (
                              <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl shadow-2xl overflow-hidden text-left">
                                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                                  <div className="text-left font-black italic uppercase">
                                    <p className="text-[10px] text-white/20 tracking-widest">All Users</p>
                                    <p className="mt-2 text-xs text-white/40 tracking-tight">
                                      Showing {(allUsersPage as any)?.page?.length ?? 0} user(s)
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={usersCursorStack.length === 0}
                                      onClick={() => {
                                        setUsersCursorStack((s) => {
                                          const next = [...s]
                                          const prevCursor = next.pop() ?? null
                                          setUsersCursor(prevCursor)
                                          return next
                                        })
                                      }}
                                      className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest italic text-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                      Prev
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!((allUsersPage as any)?.continueCursor)}
                                      onClick={() => {
                                        const nextCursor = (allUsersPage as any)?.continueCursor as string | null
                                        if (!nextCursor) return
                                        setUsersCursorStack((s) => [...s, usersCursor])
                                        setUsersCursor(nextCursor)
                                      }}
                                      className="px-5 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic text-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[900px]">
                                    <thead>
                                      <tr className="text-[9px] font-black uppercase tracking-[0.3em] italic text-white/20 border-b border-white/5">
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Name</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Email</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Tier</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Integrity</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Balance</th>
                                        <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Joined</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {((allUsersPage as any)?.page as any[])?.map((u: any) => (
                                        <tr
                                          key={u._id}
                                          onClick={() => setSelectedUser(u)}
                                          className="hover:bg-white/[0.03] transition-all cursor-pointer"
                                        >
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-white font-black uppercase italic tracking-tight">
                                              {u.name || 'Anonymous'}
                                            </p>
                                          </td>
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em] italic truncate max-w-[320px]">
                                              {u.email || '—'}
                                            </p>
                                          </td>
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest italic text-white/50">
                                              {u.tier || 'bronze'}
                                            </span>
                                          </td>
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                                              {u.integrityScore}% 
                                            </p>
                                          </td>
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">
                                              ₦{((u.balance ?? 0) / 100).toLocaleString()}
                                            </p>
                                          </td>
                                          <td className="px-4 sm:px-8 py-4 sm:py-6">
                                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                              {new Date(u._creationTime).toLocaleDateString()}
                                            </p>
                                          </td>
                                        </tr>
                                      ))}
                                      {((allUsersPage as any)?.page as any[])?.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="px-4 sm:px-8 py-16 text-center text-white/20 font-black italic uppercase tracking-widest"
                                          >
                                            No users returned.
                                          </td>
                                        </tr>
                                      ) : null}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (searchedUsers as any[])?.length ? (
                              (searchedUsers as any[]).map((u: any) => (
                                <button
                                  type="button"
                                  key={u._id}
                                  onClick={() => setSelectedUser(u)}
                                  className="w-full p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20 transition-all text-left active:scale-[0.99]"
                                >
                                  <div className="flex items-center justify-between gap-6">
                                    <div>
                                      <p className="text-white font-black uppercase italic tracking-tight">{u.name || 'Anonymous'}</p>
                                      <p className="mt-2 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black truncate">
                                        {u.email}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                                        {u.integrityScore}% Integrity
                                      </p>
                                      <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                        ₦{((u.balance ?? 0) / 100).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="text-center py-20 text-white/20 font-black italic uppercase tracking-widest">
                                No matches.
                              </div>
                            )}
                          </div>
                        </motion.div>
                    )}

                    {activeTab === 'transactions' && (
                        <motion.div
                            key="transactions"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 sm:p-10 space-y-8"
                        >
                          <div className="flex items-center justify-between gap-6">
                            <div className="text-left font-black italic uppercase">
                              <h3 className="text-lg text-white flex items-center gap-3">
                                <ReceiptText size={18} className="text-green-500" /> Transactions
                              </h3>
                              <p className="text-[10px] text-white/20 tracking-widest mt-1">Ledger activity</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                disabled={txCursorStack.length === 0}
                                onClick={() => {
                                  setTxCursorStack((s) => {
                                    const next = [...s]
                                    const prevCursor = next.pop() ?? null
                                    setTxCursor(prevCursor)
                                    return next
                                  })
                                }}
                                className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest italic text-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 active:scale-95 transition-all"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                disabled={!((transactionsPage as any)?.continueCursor)}
                                onClick={() => {
                                  const nextCursor = (transactionsPage as any)?.continueCursor as string | null
                                  if (!nextCursor) return
                                  setTxCursorStack((s) => [...s, txCursor])
                                  setTxCursor(nextCursor)
                                }}
                                className="px-5 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic text-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[900px]">
                                <thead>
                                  <tr className="text-[9px] font-black uppercase tracking-[0.3em] italic text-white/20 border-b border-white/5">
                                    <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Type</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Amount</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Status</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">User</th>
                                    <th className="px-4 sm:px-8 py-4 sm:py-5 text-left">Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {(((transactionsPage as any)?.page as any[]) ?? []).map((t: any) => (
                                    <tr key={t._id} className="hover:bg-white/[0.03] transition-all">
                                      <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <Link
                                          to="/admin/tx/$txId"
                                          params={{ txId: t._id }}
                                          className="text-white font-black uppercase italic tracking-tight hover:text-blue-500 transition-colors"
                                        >
                                          {t.type}
                                        </Link>
                                      </td>
                                      <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <p className="text-[10px] text-white/50 font-black uppercase tracking-widest italic">
                                          ₦{((t.amount ?? 0) / 100).toLocaleString()}
                                        </p>
                                      </td>
                                      <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest italic text-white/50">
                                          {t.status}
                                        </span>
                                      </td>
                                      <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em] italic truncate max-w-[320px]">
                                          {t.userEmail || t.userId}
                                        </p>
                                      </td>
                                      <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                          {t._creationTime ? new Date(t._creationTime).toLocaleString() : ''}
                                        </p>
                                      </td>
                                    </tr>
                                  ))}
                                  {(((transactionsPage as any)?.page as any[]) ?? []).length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="px-4 sm:px-8 py-16 text-center text-white/20 font-black italic uppercase tracking-widest"
                                      >
                                        No transactions returned.
                                      </td>
                                    </tr>
                                  ) : null}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-4 space-y-8">
                 <div className="p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-8 italic">Manual Overrides</p>
                    <div className="space-y-4 font-black uppercase italic tracking-widest text-[10px]">
                        <button 
                            onClick={() => setConfirm({
                              open: true,
                              title: 'Trigger midnight sweep?',
                              description: 'This will run enforcement checks and apply penalties where required.',
                              confirmLabel: 'Trigger Sweep',
                              tone: 'primary',
                              run: async () => {
                                await sweep({})
                                toast.success('Midnight sweep protocol initialized.', { title: 'Command Executed' })
                              },
                            })}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all text-center active:scale-95"
                        >
                            Trigger Midnight Sweep
                        </button>
                        <button 
                            onClick={() => setConfirm({
                              open: true,
                              title: 'Distribute dividends?',
                              description: 'This triggers the weekly distribution protocol for eligible citizens.',
                              confirmLabel: 'Distribute',
                              tone: 'primary',
                              run: async () => {
                                await distribute({})
                                toast.success('Weekly distribution protocol initialized.', { title: 'Command Executed' })
                              },
                            })}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-orange-600/20 hover:border-orange-500/30 transition-all text-center active:scale-95"
                        >
                            Distribute Dividends
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                              setSeedFeedback(null)
                              setSeedRunning(null)
                              setSeedOpen(true)
                            }}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-center active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Database size={16} /> Seed Demo Logs
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                              setPaystackReference('');
                              setPaystackPreview(null);
                              setPaymentsOpen(true);
                            }}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-green-600/10 hover:border-green-500/30 transition-all text-center active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Wallet size={16} /> Payments Recovery
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                              setPaymentsExplorerQuery('');
                              setPaymentsExplorerResult(null);
                              setPaymentsExplorerOpen(true);
                            }}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-green-600/10 hover:border-green-500/30 transition-all text-center active:scale-95 flex items-center justify-center gap-3"
                        >
                            <ReceiptText size={16} /> Payments Explorer
                        </button>
                        <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/20 transition-all text-center border-dashed cursor-not-allowed opacity-60">
                          System Maintenance Mode
                        </button>
                    </div>
                </div>

                <div className="p-10 rounded-[3rem] bg-[#ff7a00]/5 border border-[#ff7a00]/20 text-left shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-[#ff7a00]/5">
                        <TrendingUp size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a00] mb-6 italic">Protocol Tip</p>
                        <p className="text-xs text-[#ff7a00]/60 leading-relaxed font-bold italic tracking-tight uppercase">High protocol breaches detected in 'Fitness' category. Consider adjusting pain tier defaults to increase revenue capture.</p>
                    </div>
                </div>
            </div>
        </div>
      </main>

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        tone={confirm.tone}
        onConfirm={async () => {
          if (confirm.run) await confirm.run()
        }}
        onClose={() =>
          setConfirm({ open: false, title: '', confirmLabel: '', run: null })
        }
      />

      <AnimatePresence>
        {waitlistDetail ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWaitlistDetail(null)}
              className="fixed inset-0 z-[90] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            >
              <div className="w-full max-w-xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-6 sm:p-10 border-b border-white/10 flex items-start justify-between gap-6">
                  <div className="text-left">
                    <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                      Pending Citizen
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      {waitlistDetail.email}
                    </p>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      {waitlistDetail._creationTime
                        ? new Date(waitlistDetail._creationTime).toLocaleString()
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWaitlistDetail(null)}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 sm:p-10 flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(waitlistDetail.email)
                        toast.success('Copied to clipboard.', { title: 'Waitlist' })
                      } catch {
                        toast.error('Could not copy email.', { title: 'Waitlist' })
                      }
                    }}
                    className="flex-1 px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
                  >
                    Copy Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWaitlistDetail(null)
                      setConfirm({
                        open: true,
                        title: 'Remove from waitlist?',
                        description: `This will delete ${waitlistDetail.email} from the waitlist.`,
                        tone: 'danger',
                        confirmLabel: 'Remove',
                        run: async () => {
                          const res = await deleteWaitlistEntry({ waitlistId: waitlistDetail._id } as any)
                          toast.success(res?.message || 'Removed.', { title: 'Waitlist' })
                          await queryClient.invalidateQueries()
                        },
                      })
                    }}
                    className="flex-1 px-10 py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-red-600 active:scale-95 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {seedOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => (seedRunning ? null : setSeedOpen(false))}
              className="fixed inset-0 z-[90] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-10 border-b border-white/10 flex items-start justify-between gap-6">
                  <div className="text-left">
                    <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                      Seed Dummy Historical Logs
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      Seed new demo protocols, or populate existing protocols with logs for the Vault Specification historical view.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (seedRunning ? null : setSeedOpen(false))}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                        Email Domain
                      </p>
                      <input
                        value={seedDomain}
                        onChange={(e) => setSeedDomain(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                        Limit Users
                      </p>
                      <input
                        value={seedLimit}
                        onChange={(e) => setSeedLimit(Number(e.target.value))}
                        type="number"
                        min={1}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                        Goals Per User
                      </p>
                      <input
                        value={seedGoalsPerUser}
                        onChange={(e) => setSeedGoalsPerUser(Number(e.target.value))}
                        type="number"
                        min={1}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                        Logs Per Goal
                      </p>
                      <input
                        value={seedLogsPerGoal}
                        onChange={(e) => setSeedLogsPerGoal(Number(e.target.value))}
                        type="number"
                        min={1}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {seedFeedback ? (
                    <div
                      className={`p-6 rounded-[2rem] border text-left ${
                        seedFeedback.tone === 'success'
                          ? 'bg-green-600/10 border-green-500/20'
                          : seedFeedback.tone === 'error'
                            ? 'bg-red-600/10 border-red-500/20'
                            : 'bg-white/[0.02] border-white/10'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/30">
                        {seedFeedback.tone === 'success'
                          ? 'Completed'
                          : seedFeedback.tone === 'error'
                            ? 'Failed'
                            : 'Running'}
                      </p>
                      <p className="mt-4 text-xs text-white/50 italic leading-relaxed font-medium">
                        {seedFeedback.message}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      type="button"
                      disabled={seedRunning !== null}
                      onClick={async () => {
                        try {
                          setSeedRunning('seed')
                          setSeedFeedback({ tone: 'info', message: 'Generating demo vaults, goals, and historical logs…' })
                          const res = await seedHistory({
                            domain: seedDomain,
                            limit: seedLimit,
                            goalsPerUser: seedGoalsPerUser,
                            logsPerGoal: seedLogsPerGoal,
                          })
                          toast.success(res?.message || 'Seed complete.', { title: 'Seed Executed' })
                          setSeedFeedback({ tone: 'success', message: res?.message || 'Seed complete.' })
                        } catch (e: any) {
                          toast.error(e?.message || 'Seed failed.', { title: 'Seed Failed' })
                          setSeedFeedback({ tone: 'error', message: e?.message || 'Seed failed.' })
                        } finally {
                          setSeedRunning(null)
                        }
                      }}
                      className="flex-1 py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {seedRunning === 'seed' ? 'Seeding…' : 'Seed New Logs'}
                    </button>
                    <button
                      type="button"
                      disabled={seedRunning !== null}
                      onClick={async () => {
                        try {
                          setSeedRunning('populate')
                          setSeedFeedback({ tone: 'info', message: 'Populating logs for existing protocols…' })
                          const res = await populateExistingHistory({
                            domain: seedDomain,
                            limit: seedLimit,
                            logsPerGoal: seedLogsPerGoal,
                          })
                          toast.success(res?.message || 'Populate complete.', { title: 'Populate Executed' })
                          setSeedFeedback({ tone: 'success', message: res?.message || 'Populate complete.' })
                        } catch (e: any) {
                          toast.error(e?.message || 'Populate failed.', { title: 'Populate Failed' })
                          setSeedFeedback({ tone: 'error', message: e?.message || 'Populate failed.' })
                        } finally {
                          setSeedRunning(null)
                        }
                      }}
                      className="flex-1 py-5 rounded-2xl bg-green-500 text-black font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {seedRunning === 'populate' ? 'Populating…' : 'Populate Existing'}
                    </button>
                    <button
                      type="button"
                      disabled={seedRunning !== null}
                      onClick={() => setSeedOpen(false)}
                      className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {paymentsOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => (paystackLoading ? null : setPaymentsOpen(false))}
              className="fixed inset-0 z-[80] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[85] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-10 border-b border-white/10 flex items-start justify-between gap-6">
                  <div className="text-left">
                    <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                      Payments Recovery
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      Paste a Paystack reference, preview the transaction, then credit the wallet if needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (paystackLoading ? null : setPaymentsOpen(false))}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-10 space-y-6">
                  <div>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                      Paystack Reference
                    </p>
                    <input
                      value={paystackReference}
                      onChange={(e) => setPaystackReference(e.target.value)}
                      placeholder="E.G. 1780134111263"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.35em] italic text-white/70 outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      disabled={paystackLoading}
                      onClick={async () => {
                        const ref = paystackReference.trim()
                        if (!ref) {
                          toast.error('Enter a Paystack reference.', { title: 'Missing Reference' })
                          return
                        }
                        try {
                          setPaystackLoading(true)
                          const res = await previewPaystackTransaction({ reference: ref })
                          if (!res?.success) {
                            setPaystackPreview(null)
                            toast.error(res?.message || 'Preview failed.', { title: 'Preview Failed' })
                            return
                          }
                          setPaystackPreview(res)
                        } catch (e: any) {
                          setPaystackPreview(null)
                          toast.error(e?.message || 'Preview failed.', { title: 'Preview Failed' })
                        } finally {
                          setPaystackLoading(false)
                        }
                      }}
                      className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all ${
                        paystackLoading ? 'opacity-60 pointer-events-none' : 'bg-white text-black'
                      }`}
                    >
                      {paystackLoading ? 'Previewing...' : 'Preview'}
                    </button>

                    <button
                      type="button"
                      disabled={paystackLoading}
                      onClick={() => (paystackLoading ? null : setPaymentsOpen(false))}
                      className={`flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all ${
                        paystackLoading ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      Close
                    </button>
                  </div>

                  {paystackPreview ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                            Status
                          </p>
                          <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                            {String(paystackPreview.paystackStatus ?? '')}
                          </p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                            Amount
                          </p>
                          <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                            ₦{(((paystackPreview.amountKobo ?? 0) as number) / 100).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                            Email
                          </p>
                          <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg break-all">
                            {String(paystackPreview.customerEmail ?? '')}
                          </p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                            Credited
                          </p>
                          <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                            {paystackPreview.alreadyCredited ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button
                          type="button"
                          disabled={
                            paystackLoading ||
                            paystackPreview.alreadyCredited ||
                            paystackPreview.paystackStatus !== 'success'
                          }
                          onClick={() => {
                            const ref = paystackReference.trim()
                            const amountKobo = (paystackPreview.amountKobo ?? 0) as number
                            const customerEmail = paystackPreview.customerEmail as string | undefined
                            setConfirm({
                              open: true,
                              title: 'Credit wallet?',
                              description: `Reference ${ref} • ₦${(amountKobo / 100).toLocaleString()} • ${customerEmail || 'Unknown email'}`,
                              confirmLabel: 'Credit Wallet',
                              tone: 'primary',
                              run: async () => {
                                try {
                                  const res = await recoverPaystackTransaction({ reference: ref })
                                  if (res?.success) {
                                    toast.success(res.message || 'Wallet credited.', { title: 'Recovery Complete' })
                                    setPaystackPreview((p: any) => (p ? { ...p, alreadyCredited: true } : p))
                                  } else {
                                    toast.error(res?.message || 'Recovery failed.', { title: 'Recovery Failed' })
                                  }
                                } catch (e: any) {
                                  toast.error(e?.message || 'Recovery failed.', { title: 'Recovery Failed' })
                                }
                              },
                            })
                          }}
                          className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all ${
                            paystackPreview.alreadyCredited || paystackPreview.paystackStatus !== 'success'
                              ? 'bg-white/5 border border-white/10 text-white/30 pointer-events-none'
                              : 'bg-green-500 text-black shadow-xl shadow-green-900/20'
                          }`}
                        >
                          Credit Wallet
                        </button>
                        <button
                          type="button"
                          disabled={paystackLoading}
                          onClick={() => {
                            setPaystackPreview(null)
                            setPaystackReference('')
                          }}
                          className={`flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all ${
                            paystackLoading ? 'opacity-60 pointer-events-none' : ''
                          }`}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {paymentsExplorerOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => (paymentsExplorerLoading ? null : setPaymentsExplorerOpen(false))}
              className="fixed inset-0 z-[70] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[75] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-3xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-10 border-b border-white/10 flex items-start justify-between gap-6">
                  <div className="text-left">
                    <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                      Payments Explorer
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      Search by Paystack reference, customer email, or payout identifiers (transfer code / transfer ID / transfer reference).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (paymentsExplorerLoading ? null : setPaymentsExplorerOpen(false))}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic mb-3">
                        Reference or Email
                      </p>
                      <input
                        value={paymentsExplorerQuery}
                        onChange={(e) => setPaymentsExplorerQuery(e.target.value)}
                        placeholder="E.G. 1780134111263 OR semekjoshua@gmail.com"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] italic text-white/70 outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="md:col-span-4 flex items-end">
                      <button
                        type="button"
                        disabled={paymentsExplorerLoading}
                        onClick={async () => {
                          const q = paymentsExplorerQuery.trim()
                          if (!q) {
                            toast.error('Enter a reference or email.', { title: 'Missing Query' })
                            return
                          }
                          try {
                            setPaymentsExplorerLoading(true)
                            const res = await paymentsExplorerLookup({ query: q })
                            if (!res?.success) {
                              setPaymentsExplorerResult(null)
                              toast.error(res?.message || 'Lookup failed.', { title: 'Lookup Failed' })
                              return
                            }
                            setPaymentsExplorerResult(res)
                          } catch (e: any) {
                            setPaymentsExplorerResult(null)
                            toast.error(e?.message || 'Lookup failed.', { title: 'Lookup Failed' })
                          } finally {
                            setPaymentsExplorerLoading(false)
                          }
                        }}
                        className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all ${
                          paymentsExplorerLoading ? 'opacity-60 pointer-events-none' : 'bg-green-500 text-black'
                        }`}
                      >
                        {paymentsExplorerLoading ? 'Searching…' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {paymentsExplorerResult ? (
                    <div className="space-y-4">
                      {paymentsExplorerResult.mode === 'payout' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Payout</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                                {paymentsExplorerResult.withdrawal?.status || 'unknown'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black break-all">
                                {paymentsExplorerResult.withdrawal?.paystack_reference || ''}
                              </p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Amount</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                                ₦{(((paymentsExplorerResult.withdrawal?.amount ?? 0) as number) / 100).toLocaleString()}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black">
                                {paymentsExplorerResult.withdrawal?.bank_details?.bank_name || ''}
                              </p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Transfer</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg break-all">
                                {paymentsExplorerResult.withdrawal?.paystack_transfer_code || '—'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black">
                                {paymentsExplorerResult.withdrawal?.paystack_transfer_id
                                  ? String(paymentsExplorerResult.withdrawal?.paystack_transfer_id)
                                  : ''}
                              </p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Linked User</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg break-all">
                                {paymentsExplorerResult.user?.email || 'unknown'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black">
                                {paymentsExplorerResult.withdrawal?.paystack_status || ''}
                              </p>
                            </div>
                          </div>

                          {Array.isArray(paymentsExplorerResult.recentTransactions) ? (
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                Recent Ledger Activity
                              </p>
                              <div className="mt-4 space-y-2">
                                {paymentsExplorerResult.recentTransactions.slice(0, 8).map((t: any) => (
                                  <div key={t._id} className="flex items-center justify-between gap-6">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">
                                      {t.type} • {t.status}
                                    </p>
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">
                                      ₦{((t.amount ?? 0) / 100).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : paymentsExplorerResult.mode === 'reference' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Paystack</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                                {paymentsExplorerResult.paystackOk === false
                                  ? 'unverified'
                                  : paymentsExplorerResult.paystack?.status || 'unknown'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black break-all">
                                {paymentsExplorerResult.paystack?.customer?.email || ''}
                              </p>
                              {paymentsExplorerResult.paystackOk === false ? (
                                <p className="mt-3 text-[10px] text-red-400/70 uppercase tracking-[0.25em] italic font-black">
                                  {paymentsExplorerResult.paystackMessage || 'Verification failed.'}
                                </p>
                              ) : null}
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Amount</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                                ₦{(((paymentsExplorerResult.paystack?.amount ?? paymentsExplorerResult.deposit?.amount ?? 0) as number) / 100).toLocaleString()}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black">
                                {paymentsExplorerResult.paystack?.paid_at || ''}
                              </p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Deposit</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                                {paymentsExplorerResult.deposit?.status || 'none'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black break-all">
                                {paymentsExplorerResult.deposit?.reference || ''}
                              </p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Linked User</p>
                              <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg break-all">
                                {paymentsExplorerResult.user?.email || 'unknown'}
                              </p>
                              <p className="mt-3 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black">
                                {paymentsExplorerResult.reconciliation?.status || ''}
                              </p>
                            </div>
                          </div>

                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                            <div className="flex items-start justify-between gap-6">
                              <div>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                  Reconciliation
                                </p>
                                <p className="mt-3 text-xs text-white/50 italic font-medium leading-relaxed">
                                  {paymentsExplorerResult.reconciliation
                                    ? 'This reference has a reconciliation record (already credited or recorded).'
                                    : paymentsExplorerResult.unmatched
                                      ? `Unmatched (${paymentsExplorerResult.unmatched.reason})`
                                      : 'No reconciliation record found.'}
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  paymentsExplorerLoading ||
                                  paymentsExplorerResult.reconciliation ||
                                  paymentsExplorerResult.paystackOk === false ||
                                  paymentsExplorerResult.paystack?.status !== 'success'
                                }
                                onClick={() => {
                                  const ref = paymentsExplorerResult.query as string
                                  const amountKobo = (paymentsExplorerResult.paystack?.amount ?? 0) as number
                                  const customerEmail = paymentsExplorerResult.paystack?.customer?.email as string | undefined
                                  setConfirm({
                                    open: true,
                                    title: 'Credit wallet?',
                                    description: `Reference ${ref} • ₦${(amountKobo / 100).toLocaleString()} • ${customerEmail || 'Unknown email'}`,
                                    confirmLabel: 'Credit Wallet',
                                    tone: 'primary',
                                    run: async () => {
                                      try {
                                        const res = await recoverPaystackTransaction({ reference: ref })
                                        if (res?.success) {
                                          toast.success(res.message || 'Wallet credited.', { title: 'Recovery Complete' })
                                          const refreshed = await paymentsExplorerLookup({ query: ref })
                                          setPaymentsExplorerResult(refreshed)
                                        } else {
                                          toast.error(res?.message || 'Recovery failed.', { title: 'Recovery Failed' })
                                        }
                                      } catch (e: any) {
                                        toast.error(e?.message || 'Recovery failed.', { title: 'Recovery Failed' })
                                      }
                                    },
                                  })
                                }}
                                className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic transition-all ${
                                  paymentsExplorerResult.reconciliation ||
                                  paymentsExplorerResult.paystackOk === false ||
                                  paymentsExplorerResult.paystack?.status !== 'success'
                                    ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                                    : 'bg-green-500 text-black hover:scale-105 active:scale-95'
                                }`}
                              >
                                Fix / Credit
                              </button>
                            </div>
                          </div>

                          {Array.isArray(paymentsExplorerResult.recentTransactions) ? (
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                Recent Ledger Activity
                              </p>
                              <div className="mt-4 space-y-2">
                                {paymentsExplorerResult.recentTransactions.slice(0, 8).map((t: any) => (
                                  <div key={t._id} className="flex items-center justify-between gap-6">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">
                                      {t.type} • {t.status}
                                    </p>
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">
                                      ₦{((t.amount ?? 0) / 100).toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">User</p>
                            <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg break-all">
                              {paymentsExplorerResult.user?.email || 'Not found'}
                            </p>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">Unmatched</p>
                            <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                              {(paymentsExplorerResult.unmatchedByEmail?.length ?? 0).toLocaleString()}
                            </p>
                          </div>
                          {Array.isArray(paymentsExplorerResult.withdrawalsByEmail) ? (
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left md:col-span-2">
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                                Recent Withdrawals
                              </p>
                              <div className="mt-4 space-y-2">
                                {(paymentsExplorerResult.withdrawalsByEmail ?? []).slice(0, 6).map((w: any) => (
                                  <button
                                    key={w._id}
                                    type="button"
                                    onClick={() =>
                                      setPaymentsExplorerQuery(
                                        w.paystack_reference || w.paystack_transfer_code || String(w.paystack_transfer_id || ''),
                                      )
                                    }
                                    className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-all"
                                  >
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic break-all">
                                      ₦{(((w.amount ?? 0) as number) / 100).toLocaleString()} • {w.status} •{' '}
                                      {w.paystack_reference || w.paystack_transfer_code || ''}
                                    </p>
                                  </button>
                                ))}
                                {(paymentsExplorerResult.withdrawalsByEmail ?? []).length === 0 ? (
                                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                    None.
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 text-left md:col-span-2">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                              Unmatched References
                            </p>
                            <div className="mt-4 space-y-2">
                              {(paymentsExplorerResult.unmatchedByEmail ?? []).slice(0, 8).map((r: any) => (
                                <button
                                  key={r._id}
                                  type="button"
                                  onClick={() => setPaymentsExplorerQuery(r.reference)}
                                  className="w-full text-left p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-all"
                                >
                                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic break-all">
                                    {r.reference} • ₦{((r.amount ?? 0) / 100).toLocaleString()} • {r.reason}
                                  </p>
                                </button>
                              ))}
                              {(paymentsExplorerResult.unmatchedByEmail ?? []).length === 0 ? (
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                  None.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {statsDetail ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatsDetail(null)}
              className="fixed inset-0 z-[60] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-[65] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-2xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-10 flex items-start justify-between gap-6">
                  <div className="text-left">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                      Detail View
                    </p>
                    <p className="mt-3 text-white font-black uppercase italic tracking-tight text-2xl">
                      {statsDetail === 'revenue'
                        ? 'Protocol Revenue'
                        : statsDetail === 'staked'
                          ? 'Active Stakes'
                          : statsDetail === 'citizens'
                            ? 'Total Citizens'
                            : 'System Health'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatsDetail(null)}
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-10 pb-10 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {statsDetail === 'revenue' ? (
                    <>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Total Revenue
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.revenue ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Total Penalties
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.totalPenaltiesCollected ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Distributed (30%)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.distributed ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Reward Pool Balance
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.rewardPoolBalanceAllTime ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Reward Pool (This Week)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.rewardPoolWeek ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Pool Contributed (All Time)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.totalRewardPoolContributed ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Deposits (24H)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {overview?.deposits24h ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Deposit Volume (24H)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{((overview?.depositVolume24h ?? 0) / 100).toLocaleString()}
                        </p>
                      </div>
                    </>
                  ) : null}

                  {statsDetail === 'staked' ? (
                    <>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Total Staked
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{formatCompact((stats?.totalStaked ?? 0) / 100)}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Active Goals
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {stats?.activeVaults ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Protocols (24H)
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {overview?.protocols24h ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Active Vaults
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {overview?.activeVaults ?? 0}
                        </p>
                      </div>
                    </>
                  ) : null}

                  {statsDetail === 'citizens' ? (
                    <>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Total Users
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {stats?.totalUsers ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Verified Users
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {stats?.verifiedUsers ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Unverified Users
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {stats?.unverifiedUsers ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Admin Users
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {stats?.adminUsers ?? 0}
                        </p>
                      </div>
                    </>
                  ) : null}

                  {statsDetail === 'health' ? (
                    <>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Pending Extractions
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {overview?.pendingWithdrawals ?? 0}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Pending Amount
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          ₦{((overview?.pendingWithdrawalAmount ?? 0) / 100).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          System Status
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          Stable
                        </p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Last 24H Deposits
                        </p>
                        <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                          {overview?.deposits24h ?? 0}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-[#050810]/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 14 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            >
              <div className="w-full max-w-5xl bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden">
                <div className="p-6 sm:p-10 border-b border-white/5 flex items-start justify-between gap-6">
                  <div className="text-left min-w-0">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                      User Detail
                    </p>
                    <p className="mt-2 text-white font-black uppercase italic tracking-tight text-2xl truncate">
                      {selectedUser.name || 'Anonymous'}
                    </p>
                    <p className="mt-2 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black truncate">
                      {selectedUser.email || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 sm:p-10 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { k: 'Tier', v: selectedUser.tier },
                          { k: 'Integrity', v: `${selectedUser.integrityScore}%` },
                          { k: 'Streak', v: `${selectedUser.streak_count}W` },
                          { k: 'Missions', v: selectedUser.goals_completed },
                          { k: 'Balance', v: `₦${((selectedUser.balance ?? 0) / 100).toLocaleString()}` },
                          { k: 'BVN Verified', v: selectedUser.bvn_verified ? 'Yes' : 'No' },
                          { k: 'Discoverable', v: selectedUser.is_discoverable ? 'Yes' : 'No' },
                          { k: 'Witness Pool', v: selectedUser.witness_discoverable ? 'Yes' : 'No' },
                          { k: 'Admin', v: selectedUser.isAdmin ? 'Yes' : 'No' },
                        ].map((row) => (
                          <div key={row.k} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                              {row.k}
                            </p>
                            <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                              {String(row.v ?? '')}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                          Verification Controls
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            disabled={userEditRunning}
                            onClick={async () => {
                              setUserEditRunning(true);
                              try {
                                const res = await updateUserVerifications({
                                  userId: selectedUser._id,
                                  emailVerified: true,
                                });
                                if (res?.user) setSelectedUser(res.user);
                                await queryClient.invalidateQueries();
                                toast.success(res?.message ?? "Updated.");
                              } catch (e: any) {
                                toast.error(sanitizeMessage(e?.message ?? "", "Update failed."));
                              } finally {
                                setUserEditRunning(false);
                              }
                            }}
                            className="px-5 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                          >
                            Mark Email Verified
                          </button>
                          <button
                            type="button"
                            disabled={userEditRunning}
                            onClick={async () => {
                              setUserEditRunning(true);
                              try {
                                const res = await updateUserVerifications({
                                  userId: selectedUser._id,
                                  emailVerified: false,
                                });
                                if (res?.user) setSelectedUser(res.user);
                                await queryClient.invalidateQueries();
                                toast.success(res?.message ?? "Updated.");
                              } catch (e: any) {
                                toast.error(sanitizeMessage(e?.message ?? "", "Update failed."));
                              } finally {
                                setUserEditRunning(false);
                              }
                            }}
                            className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest italic text-[10px] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
                          >
                            Clear Email Verified
                          </button>
                          <button
                            type="button"
                            disabled={userEditRunning}
                            onClick={async () => {
                              setUserEditRunning(true);
                              try {
                                const res = await updateUserVerifications({
                                  userId: selectedUser._id,
                                  bvn_verified: !selectedUser.bvn_verified,
                                });
                                if (res?.user) setSelectedUser(res.user);
                                await queryClient.invalidateQueries();
                                toast.success(res?.message ?? "Updated.");
                              } catch (e: any) {
                                toast.error(sanitizeMessage(e?.message ?? "", "Update failed."));
                              } finally {
                                setUserEditRunning(false);
                              }
                            }}
                            className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest italic text-[10px] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
                          >
                            Toggle BVN
                          </button>
                          <button
                            type="button"
                            disabled={userEditRunning}
                            onClick={async () => {
                              setUserEditRunning(true);
                              try {
                                const res = await updateUserVerifications({
                                  userId: selectedUser._id,
                                  isAdmin: !selectedUser.isAdmin,
                                });
                                if (res?.user) setSelectedUser(res.user);
                                await queryClient.invalidateQueries();
                                toast.success(res?.message ?? "Updated.");
                              } catch (e: any) {
                                toast.error(sanitizeMessage(e?.message ?? "", "Update failed."));
                              } finally {
                                setUserEditRunning(false);
                              }
                            }}
                            className="px-5 py-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 font-black uppercase tracking-widest italic text-[10px] hover:bg-blue-600/20 active:scale-95 transition-all disabled:opacity-40"
                          >
                            Toggle Admin
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                        User Protocols
                      </p>
                      <div className="mt-6 space-y-4">
                        {(selectedUserProtocols as any[])?.length ? (
                          (selectedUserProtocols as any[]).map((v: any) => (
                            <Link
                              key={v._id}
                              to="/vault/$id"
                              params={{ id: v._id }}
                              className="block p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20 transition-all"
                            >
                              <div className="flex items-start justify-between gap-6">
                                <div className="min-w-0">
                                  <p className="text-white font-black uppercase italic tracking-tight truncate">
                                    {v.goal?.title || 'Untitled'}
                                  </p>
                                  <p className="mt-2 text-[10px] text-white/30 font-black uppercase tracking-[0.25em] italic truncate">
                                    {v.goal?.category} • {v.goal?.frequency_type || 'daily'} • {v.goal?.target_count ?? 1}/period
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                                    {v.status}
                                  </p>
                                  <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                                    ₦{((v.amount ?? 0) / 100).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="p-10 rounded-[2rem] bg-white/[0.01] border border-white/10 text-white/20 font-black uppercase tracking-widest italic text-center">
                            No protocols found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
