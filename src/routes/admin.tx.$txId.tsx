import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth } from 'convex/react'
import { ArrowLeft, ReceiptText } from 'lucide-react'
import { useEffect } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/admin/tx/$txId')({
  component: TransactionDetail,
})

function formatTransactionTypeLabel(type?: string) {
  switch (type) {
    case 'wallet_withdrawal':
      return 'Wallet Withdrawal'
    case 'dividend':
      return 'Reward Distribution'
    case 'platform_fee':
      return 'Platform Fee'
    case 'deposit':
      return 'Wallet Deposit'
    case 'stake':
      return 'Stake Locked'
    case 'refund':
      return 'Refund'
    default:
      return type ? type.replace(/_/g, ' ') : 'Unknown'
  }
}

function TransactionDetail() {
  const { txId } = Route.useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()

  const userQuery = convexQuery(api.users.current, {} as any) as any
  const { data: user, isFetching: userFetching }: { data: any; isFetching: boolean } = useSuspenseQuery({
    ...(userQuery),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const isVerified = !!user?.emailVerificationTime

  const adminStatusQuery = convexQuery(api.admin.checkAdminStatus, {} as any) as any
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  })

  const txQuery = convexQuery((api as any).admin.getTransactionById, { transactionId: txId } as any) as any
  const { data: tx }: { data: any } = useSuspenseQuery({
    ...(txQuery),
    enabled: isAuthenticated && isVerified && adminStatus?.isAdmin,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !userFetching && !isVerified) {
      navigate({ to: '/verify-required' })
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user, userFetching])

  useEffect(() => {
    if (!authLoading && isAuthenticated && isVerified && adminStatus && !adminStatus.isAdmin) {
      navigate({ to: '/login' })
    }
  }, [adminStatus, authLoading, isAuthenticated, isVerified, navigate])

  if (authLoading || !isAuthenticated || !user || !isVerified || !adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white/20 italic font-black uppercase tracking-[0.5em]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-8" />
        Loading Transaction...
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
        <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
          <div className="flex items-center gap-4 text-left">
            <Link
              to="/admin"
              className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex flex-col text-left">
              <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">
                Transaction Detail
              </span>
              <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">
                Record not found
              </span>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto p-8">
          <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
            <p className="text-white/40 text-xs italic font-bold uppercase tracking-tight">
              This transaction record no longer exists.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <Link
            to="/admin"
            className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">
              Transaction Detail
            </span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">
              Ledger Record
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic flex items-center gap-3">
            <ReceiptText size={16} className="text-white/20" />
            {formatTransactionTypeLabel(tx.type)} • {tx.status}
          </p>
          <p className="mt-6 text-[clamp(1.25rem,2vw,1.75rem)] font-black text-white italic tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            ₦{((tx.amount ?? 0) / 100).toLocaleString()}
          </p>
          <p className="mt-4 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            {tx._creationTime ? new Date(tx._creationTime).toLocaleString() : ''}
          </p>
          <p className="mt-4 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            User: <span className="text-white/60">{tx.user?.email || tx.userId}</span>
          </p>
          <p className="mt-4 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            Vault: <span className="text-white/60">{tx.vaultId || '—'}</span>
          </p>
          <p className="mt-4 text-xs text-white/50 italic leading-relaxed font-medium">
            {tx.description || '—'}
          </p>
        </div>

        <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
            Metadata
          </p>
          <pre className="mt-6 text-xs text-white/50 leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(tx.metadata ?? {}, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  )
}
