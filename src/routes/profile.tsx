import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useAction, useConvexAuth, useMutation } from 'convex/react';
import { 
  ArrowLeft, 
  Camera, 
  Eye, 
  EyeOff, 
  Globe, 
  Landmark,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  User,
  Wallet
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';

export const Route = createFileRoute('/profile')({
  component: ProfileSettings,
});

function ProfileSettings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const userQuery = convexQuery(api.users.current, {}) as any;
  const { data: user }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
  });
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl as any);
  const setProfileImage = useMutation(api.users.setProfileImage as any);
  const requestWithdrawal = useMutation(api.payments.requestWithdrawal);
  const listPaystackBanks = useAction(api.payments.listPaystackBanks);
  const resolvePaystackAccount = useAction(api.payments.resolvePaystackAccount);
  const walletTransactionsQuery = convexQuery(api.payments.getTransactionsPage, { limit: 8 } as any) as any;
  const { data: walletTransactions } = useQuery({
    ...walletTransactionsQuery,
    enabled: isAuthenticated,
    placeholderData: { page: [], isDone: true, continueCursor: null },
  }) as any;
  const withdrawalRequestsQuery = convexQuery(api.payments.getWithdrawalRequests, { limit: 5 } as any) as any;
  const { data: withdrawalRequests } = useQuery({
    ...withdrawalRequestsQuery,
    enabled: isAuthenticated,
    placeholderData: [],
  }) as any;
  
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
    is_discoverable: user?.is_discoverable ?? true,
    witness_discoverable: user?.witness_discoverable ?? true,
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    amountNgn: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    if (isEditing) return;
    setFormData({
      name: user?.name || '',
      city: user?.city || '',
      bio: user?.bio || '',
      is_discoverable: user?.is_discoverable ?? true,
      witness_discoverable: user?.witness_discoverable ?? true,
    });
  }, [isEditing, user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const isVerified = !!user?.emailVerificationTime;

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isVerified) {
      navigate({ to: '/verify-required' });
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user]);

  useEffect(() => {
    if (!withdrawalOpen || banks.length > 0 || loadingBanks) return;
    let cancelled = false;
    void (async () => {
      setLoadingBanks(true);
      try {
        const result = await listPaystackBanks({});
        if (cancelled) return;
        if (!result.success) {
          toast.error(result.message || 'Failed to load banks.', { title: 'Bank List Unavailable' });
          return;
        }
        setBanks(result.banks);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(toUserMessage(err, 'Failed to load banks.'), { title: 'Bank List Unavailable' });
        }
      } finally {
        if (!cancelled) setLoadingBanks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [banks.length, listPaystackBanks, loadingBanks, toast, withdrawalOpen]);

  if (authLoading || !isAuthenticated || !user || !isVerified) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  const formatMoney = (amountKobo: number) => `₦${(amountKobo / 100).toLocaleString()}`;
  const pendingWithdrawals = ((withdrawalRequests ?? []) as Array<any>).filter(
    (row) => row.status === 'pending' || row.status === 'processing' || row.status === 'approved',
  );
  const pendingWithdrawalTotal = pendingWithdrawals.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  const recentTransactions = ((walletTransactions?.page ?? []) as Array<any>).slice(0, 6);

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      amountNgn: '',
      bankCode: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
    });
  };

  const resolveAccountDetails = async () => {
    if (!withdrawalForm.bankCode || withdrawalForm.accountNumber.trim().length !== 10) {
      toast.warning('Select a bank and enter a valid 10-digit account number first.', {
        title: 'Account Details Needed',
      });
      return;
    }
    setResolvingAccount(true);
    try {
      const result = await resolvePaystackAccount({
        bankCode: withdrawalForm.bankCode,
        accountNumber: withdrawalForm.accountNumber.trim(),
      });
      if (!result.success || !result.accountName) {
        toast.error(result.message || 'Unable to resolve account.', { title: 'Account Resolution Failed' });
        return;
      }
      setWithdrawalForm((current) => ({ ...current, accountName: result.accountName ?? '' }));
      toast.success('Account name resolved successfully.', { title: 'Account Verified' });
    } catch (err: any) {
      toast.error(toUserMessage(err, 'Unable to resolve account.'), { title: 'Account Resolution Failed' });
    } finally {
      setResolvingAccount(false);
    }
  };

  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNgn = Number(withdrawalForm.amountNgn);
    if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
      toast.warning('Enter a valid amount in naira.', { title: 'Invalid Amount' });
      return;
    }
    if (!withdrawalForm.accountName) {
      toast.warning('Resolve the destination account before requesting a withdrawal.', {
        title: 'Account Verification Required',
      });
      return;
    }
    setWithdrawing(true);
    try {
      const result = await requestWithdrawal({
        amount: Math.round(amountNgn * 100),
        accountNumber: withdrawalForm.accountNumber.trim(),
        bankCode: withdrawalForm.bankCode,
        bankName: withdrawalForm.bankName,
        accountName: withdrawalForm.accountName,
      });
      if (!result.success) {
        toast.error(result.message, { title: 'Withdrawal Blocked' });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: userQuery.queryKey });
      await queryClient.invalidateQueries({ queryKey: walletTransactionsQuery.queryKey });
      await queryClient.invalidateQueries({ queryKey: withdrawalRequestsQuery.queryKey });
      toast.success(result.message, { title: 'Withdrawal Requested' });
      resetWithdrawalForm();
      setWithdrawalOpen(false);
    } catch (err: any) {
      toast.error(toUserMessage(err, 'Failed to request withdrawal.'), { title: 'Withdrawal Failed' });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      await queryClient.invalidateQueries({ queryKey: userQuery.queryKey });
      toast.success('Identity synchronized.', { title: 'Synchronization Complete' });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      toast.error(toUserMessage(err, 'Failed to update identity protocol.'), {
        title: 'Synchronization Failed',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAndCloseEdit = () => {
    setFormData({
      name: user?.name || '',
      city: user?.city || '',
      bio: user?.bio || '',
      is_discoverable: user?.is_discoverable ?? true,
      witness_discoverable: user?.witness_discoverable ?? true,
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <button onClick={() => navigate({ to: '/dashboard' })} className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-tight text-lg leading-none text-white uppercase italic">Identity Protocol</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black italic">Configuration Session</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all border ${
            isEditing
              ? 'bg-white/5 text-white/30 border-white/10'
              : 'bg-white text-black border-white/10 hover:scale-[1.02] active:scale-95'
          }`}
          disabled={isEditing}
        >
          Edit
        </button>
      </nav>

      <main className="max-w-3xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <form onSubmit={handleSave} className="space-y-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative h-32 w-32 rounded-[3rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl">
                <div className="h-full w-full rounded-[3rem] bg-[#0a0f1a] overflow-hidden flex items-center justify-center font-black text-4xl text-white uppercase italic">
                  {user?.image ? (
                    <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0] || <User size={40} />
                  )}
                </div>
                <button
                  type="button"
                  disabled={!isEditing || avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-[#050810] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {avatarUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setAvatarUploading(true)
                  const uploadUrl = await generateUploadUrl({})
                  const headers: Record<string, string> = {}
                  if (file.type) headers['Content-Type'] = file.type
                  const res = await fetch(uploadUrl, {
                    method: 'POST',
                    headers,
                    body: file,
                  })
                  if (!res.ok) throw new Error('Upload failed.')
                  let json: any = null
                  try {
                    json = await res.json()
                  } catch {
                    json = null
                  }
                  const storageId = json?.storageId
                  if (!storageId) throw new Error('Upload failed.')
                  await setProfileImage({ storageId })
                  await queryClient.invalidateQueries({ queryKey: userQuery.queryKey })
                  toast.success('Profile image updated.', { title: 'Synchronization Complete' })
                } catch (err: any) {
                  console.error(err)
                  toast.error(toUserMessage(err, 'Failed to update profile image.'), { title: 'Upload Failed' })
                } finally {
                  setAvatarUploading(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            />
            <h2 className="mt-8 text-3xl font-black italic uppercase tracking-tight">{user?.name}</h2>
            <p className="mt-3 text-[10px] text-white/20 uppercase tracking-[0.3em] font-black italic">{user?.email}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-black text-blue-500 uppercase tracking-widest italic shadow-xl">
                <ShieldCheck size={14} /> Integrity Score: {user?.integrityScore}%
              </div>
              {user?.bvn_verified && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-600/10 border border-green-500/20 text-[10px] font-black text-green-500 uppercase tracking-widest italic shadow-xl">
                   KYC Verified
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Email</p>
              <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">{user?.email || '—'}</p>
              <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                {user?.emailVerificationTime ? `Verified: ${new Date(user.emailVerificationTime).toLocaleDateString()}` : 'Not verified'}
              </p>
            </div>
            {user?.bvn_verified || user?.bvn_last4 ? (
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">BVN</p>
                <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">
                  {user?.bvn_last4 ? `•••• ${user.bvn_last4}` : 'Linked'}
                </p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                  {user?.bvn_verified ? 'Verified' : 'Pending verification'}
                </p>
              </div>
            ) : null}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Tier</p>
              <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">{user?.tier || 'bronze'}</p>
              <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                Shields: {user?.shields ?? 0} • Credits: {user?.credits ?? 0}
              </p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Wallet</p>
              <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">
                {formatMoney(user?.balance ?? 0)}
              </p>
              <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                Streak: {user?.streak_count ?? 0}W • Activated: {user?.goals_completed ?? 0}
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Wallet Operations</p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                  Visibility for balance, pending withdrawals, and recent ledger events.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWithdrawalOpen((current) => !current);
                  if (withdrawalOpen) resetWithdrawalForm();
                }}
                className="px-5 py-3 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest italic hover:scale-[1.02] active:scale-95 transition-all"
              >
                {withdrawalOpen ? 'Close Withdrawal' : 'Request Withdrawal'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 text-white/30">
                  <Wallet size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Available Balance</p>
                </div>
                <p className="mt-4 text-2xl text-white font-black italic tracking-tight">
                  {formatMoney(user?.balance ?? 0)}
                </p>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 text-white/30">
                  <Landmark size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Pending Withdrawal</p>
                </div>
                <p className="mt-4 text-2xl text-white font-black italic tracking-tight">
                  {formatMoney(pendingWithdrawalTotal)}
                </p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                  {pendingWithdrawals.length} request(s) currently in review
                </p>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-white/30">Last Ledger Event</p>
                <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">
                  {recentTransactions[0]?.description || 'No wallet activity yet'}
                </p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                  {recentTransactions[0]?._creationTime
                    ? new Date(recentTransactions[0]._creationTime).toLocaleString()
                    : 'Awaiting first wallet event'}
                </p>
              </div>
            </div>

            {withdrawalOpen ? (
              <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
                <form onSubmit={submitWithdrawal} className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/20 italic">Withdrawal Request</p>
                    <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                      Funds move from your available balance into escrow until admin disbursement is completed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Amount (NGN)</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={withdrawalForm.amountNgn}
                        onChange={(e) => setWithdrawalForm((current) => ({ ...current, amountNgn: e.target.value }))}
                        className="w-full rounded-2xl bg-white/[0.02] border border-white/10 px-6 py-4 text-white font-black italic outline-none focus:border-blue-500"
                        placeholder="5000"
                      />
                    </label>
                    <label className="space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Bank</span>
                      <select
                        value={withdrawalForm.bankCode}
                        onChange={(e) => {
                          const selected = banks.find((bank) => bank.code === e.target.value);
                          setWithdrawalForm((current) => ({
                            ...current,
                            bankCode: e.target.value,
                            bankName: selected?.name ?? '',
                            accountName: '',
                          }));
                        }}
                        className="w-full rounded-2xl bg-[#0a0f1a] border border-white/10 px-6 py-4 text-white font-black italic outline-none focus:border-blue-500"
                        disabled={loadingBanks}
                      >
                        <option value="">{loadingBanks ? 'Loading banks...' : 'Select bank'}</option>
                        {banks.map((bank) => (
                          <option key={bank.code} value={bank.code}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Account Number</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        value={withdrawalForm.accountNumber}
                        onChange={(e) =>
                          setWithdrawalForm((current) => ({
                            ...current,
                            accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                            accountName: '',
                          }))
                        }
                        className="w-full rounded-2xl bg-white/[0.02] border border-white/10 px-6 py-4 text-white font-black italic outline-none focus:border-blue-500"
                        placeholder="0123456789"
                      />
                    </label>
                    <div className="space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Account Name</span>
                      <div className="rounded-2xl bg-white/[0.02] border border-white/10 px-6 py-4 text-white font-black italic min-h-[56px] flex items-center">
                        {withdrawalForm.accountName || 'Resolve account to confirm the beneficiary name'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      type="button"
                      onClick={resolveAccountDetails}
                      disabled={resolvingAccount || loadingBanks}
                      className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-white font-black uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {resolvingAccount ? 'Resolving...' : 'Resolve Account'}
                    </button>
                    <button
                      type="submit"
                      disabled={withdrawing}
                      className="flex-1 rounded-2xl bg-white text-black px-6 py-4 font-black uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {withdrawing ? 'Submitting...' : 'Submit Withdrawal'}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/20 italic">Recent Wallet Activity</p>
                <div className="mt-6 space-y-4">
                  {recentTransactions.length ? recentTransactions.map((tx: any) => (
                    <div key={tx._id} className="rounded-2xl border border-white/5 bg-[#0a0f1a]/70 px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-black italic uppercase tracking-tight text-white">
                          {tx.description || tx.type}
                        </p>
                        <p className={`text-sm font-black italic ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-[#ff7a00]'}`}>
                          {Number(tx.amount) >= 0 ? '+' : '-'}{formatMoney(Math.abs(Number(tx.amount ?? 0)))}
                        </p>
                      </div>
                      <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                        {tx.type} • {tx.status} • {new Date(tx._creationTime).toLocaleString()}
                      </p>
                    </div>
                  )) : (
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                      No wallet transactions recorded yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/20 italic">Withdrawal Queue</p>
                <div className="mt-6 space-y-4">
                  {((withdrawalRequests ?? []) as Array<any>).length ? ((withdrawalRequests ?? []) as Array<any>).map((row: any) => (
                    <div key={row._id} className="rounded-2xl border border-white/5 bg-[#0a0f1a]/70 px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-black italic uppercase tracking-tight text-white">
                          {formatMoney(Number(row.amount ?? 0))}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest italic text-white/30">
                          {row.status}
                        </p>
                      </div>
                      <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                        {row.bank_details?.bank_name || 'Bank pending'} • {row.bank_details?.account_number || '—'} • {new Date(row.requested_at).toLocaleString()}
                      </p>
                    </div>
                  )) : (
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                      No withdrawal requests yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Form Fields */}
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Public Identity (Alias)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg transition-all placeholder:text-white/5 font-black uppercase italic tracking-widest text-white shadow-inner ${
                    isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                  }`}
                />
                <User className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
              <p className="text-[9px] text-white/10 ml-6 uppercase tracking-widest italic font-black">This name will be visible on the Leaderboard and Community Feed.</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Operational Sector (City)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.city}
                  placeholder="e.g. LAGOS, NIGERIA"
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg transition-all placeholder:text-white/10 font-black uppercase italic tracking-widest text-white shadow-inner ${
                    isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                  }`}
                />
                <MapPin className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Behavioral Goal (Bio)</label>
              <textarea 
                value={formData.bio}
                placeholder="Describe your commitment protocol..."
                onChange={e => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                className={`w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] px-8 py-8 text-lg transition-all h-40 resize-none placeholder:text-white/10 font-medium italic text-white shadow-inner ${
                  isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                }`}
              />
            </div>

            {/* Visibility Protocols */}
            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Privacy Protocols</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={() => {
                          if (!isEditing) return;
                          setFormData({...formData, is_discoverable: !formData.is_discoverable});
                        }}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left group relative overflow-hidden ${formData.is_discoverable ? 'bg-blue-600/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${formData.is_discoverable ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-900/40' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                {formData.is_discoverable ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                            <p className={`font-black italic uppercase text-xs tracking-tight ${formData.is_discoverable ? 'text-white' : 'text-white/20'}`}>Community Feed</p>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold italic uppercase leading-relaxed font-black">
                            {formData.is_discoverable ? 'Goals are visible in the Community Hub.' : 'Goals are private and hidden from public feeds.'}
                        </p>
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                          if (!isEditing) return;
                          setFormData({...formData, witness_discoverable: !formData.witness_discoverable});
                        }}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left group relative overflow-hidden ${formData.witness_discoverable ? 'bg-[#ff7a00]/5 border-[#ff7a00]/20' : 'bg-white/[0.02] border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${formData.witness_discoverable ? 'bg-[#ff7a00] text-white border-[#ff9d47] shadow-xl shadow-orange-900/40' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                <Globe size={18} />
                            </div>
                            <p className={`font-black italic uppercase text-xs tracking-tight ${formData.witness_discoverable ? 'text-white' : 'text-white/20'}`}>Witness Directory</p>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold italic uppercase leading-relaxed font-black">
                            {formData.witness_discoverable ? 'Visible as an active verifier in the witness pool.' : 'Only people with your link can request your oversight.'}
                        </p>
                    </button>
                </div>
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={resetAndCloseEdit}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 rounded-3xl bg-white/5 border border-white/10 text-white py-6 font-black uppercase tracking-[0.3em] hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 transition-all text-xs italic"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-4 rounded-3xl bg-white text-black py-6 font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.05)] text-xs italic"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Synchronize Identity</>}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-4 rounded-3xl bg-white/5 border border-white/10 text-white py-6 font-black uppercase tracking-[0.3em] hover:bg-white/10 active:scale-[0.98] transition-all text-xs italic"
            >
              Edit Identity
            </button>
          )}
        </form>
      </main>

      <footer className="py-20 text-center opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic font-black">Secure Identity Synchronization Module v2.0.4</p>
      </footer>
    </div>
  );
}
