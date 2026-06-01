import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmModal } from '~/components/confirm-modal'
import { useToast } from '~/components/toast'

const EMPTY_ARGS: Record<string, never> = {}

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

function AdminSettings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const userQuery = convexQuery(api.users.current, EMPTY_ARGS as any) as any
  const { data: user, isFetching: userFetching }: { data: any; isFetching: boolean } = useSuspenseQuery({
    ...(userQuery as any),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  } as any)
  const isVerified = !!user?.emailVerificationTime

  const recomputeSystemAccounting = useMutation((api as any).admin.recomputeSystemAccounting)
  const [recomputeRunning, setRecomputeRunning] = useState(false)

  const purgeSeedDataByDomain = useAction((api as any).admin.purgeSeedDataByDomain)
  const [purgeDomain, setPurgeDomain] = useState('protocol.io')
  const [purgeLimit, setPurgeLimit] = useState('200')
  const [purgeRunning, setPurgeRunning] = useState(false)
  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    description?: string
    tone?: 'primary' | 'danger'
    confirmLabel: string
    run: (() => Promise<void>) | null
  }>({ open: false, title: '', confirmLabel: '', run: null })

  const adminStatusQuery = convexQuery(api.admin.checkAdminStatus, EMPTY_ARGS as any) as any
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  } as any)

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
      return
    }
  }, [adminStatus, authLoading, isAuthenticated, isVerified, navigate])

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white/20 italic font-black uppercase tracking-[0.5em]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-8" />
        Initializing Settings...
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white/20 italic font-black uppercase tracking-[0.5em]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-8" />
        Verification Required...
      </div>
    )
  }

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
    )
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
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

      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <Link
            to="/admin"
            className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">
              Settings
            </span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">
              Command Center Configuration
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 font-black uppercase tracking-widest text-[10px] italic">
          <ShieldCheck size={14} /> Root Access Active
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
            Admin Access
          </p>
          <p className="mt-4 text-sm text-white/60 font-bold italic leading-relaxed uppercase tracking-tight">
            Admin access is enforced on the backend via ADMIN_EMAIL_ALLOWLIST (Convex env) or user.isAdmin.
          </p>
          <p className="mt-4 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            Example allowlist format:
            <span className="ml-2 text-white/60">onyekachukwujoshua1@gmail.com,admin@lockedin.io</span>
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
              Operations
            </p>
            <p className="mt-4 text-xs text-white/40 italic font-bold leading-relaxed uppercase tracking-tight">
              Use the main Command Center for seeding, payments recovery, and manual protocol overrides.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/admin"
                className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
              >
                Back to Admin
              </Link>
              <Link
                to="/dashboard"
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-white/10 active:scale-95 transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
              Environment
            </p>
            <p className="mt-4 text-xs text-white/40 italic font-bold leading-relaxed uppercase tracking-tight">
              Do not store secrets in repo files. Configure secrets in Convex and client keys in Vercel/local env.
            </p>
            <div className="mt-6 space-y-2 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
              <p>Convex: PAYSTACK_SECRET_KEY, ADMIN_EMAIL_ALLOWLIST</p>
              <p>Client: VITE_PAYSTACK_PUBLIC_KEY, VITE_CONVEX_URL</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
            Accounting Tools
          </p>
          <p className="mt-4 text-[10px] text-white/40 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            If Protocol Revenue/Pool totals look wrong (e.g. older test data), recompute accounting from existing penalty and pool records.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              disabled={recomputeRunning}
              onClick={() =>
                setConfirm({
                  open: true,
                  title: 'Recompute system accounting?',
                  description:
                    'This will recalculate revenue (70%), reward pool contributions (30%), and distributions from recorded data.',
                  tone: 'primary',
                  confirmLabel: 'Recompute',
                  run: async () => {
                    setRecomputeRunning(true)
                    try {
                      const res = await recomputeSystemAccounting({})
                      toast.success(res?.message ?? 'Accounting recomputed.')
                      await queryClient.invalidateQueries()
                    } catch (e: any) {
                      toast.error(e?.message ?? 'Recompute failed.')
                    } finally {
                      setRecomputeRunning(false)
                    }
                  },
                })
              }
              className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {recomputeRunning ? 'RECOMPUTING...' : 'RECOMPUTE ACCOUNTING'}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[2.5rem] sm:rounded-[3rem] border border-red-500/20 bg-red-500/5 backdrop-blur-3xl p-6 sm:p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300 italic">
            Danger Zone
          </p>
          <p className="mt-4 text-[10px] text-red-200/70 font-black uppercase tracking-[0.28em] italic leading-relaxed">
            Purge seeded dummy users and all linked records for an email domain (e.g. protocol.io). Use dry run first.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={purgeDomain}
              onChange={(e) => setPurgeDomain(e.target.value)}
              placeholder="DOMAIN (e.g. protocol.io)"
              className="bg-white/[0.02] border border-red-500/20 rounded-2xl px-6 py-4 text-xs font-black italic uppercase tracking-widest text-white/70 outline-none focus:border-red-400"
            />
            <input
              value={purgeLimit}
              onChange={(e) => setPurgeLimit(e.target.value)}
              placeholder="LIMIT (e.g. 200)"
              className="bg-white/[0.02] border border-red-500/20 rounded-2xl px-6 py-4 text-xs font-black italic uppercase tracking-widest text-white/70 outline-none focus:border-red-400"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={purgeRunning || !purgeDomain.trim()}
                onClick={async () => {
                  setPurgeRunning(true)
                  try {
                    const limit = purgeLimit.trim() ? Number(purgeLimit) : undefined
                    const res = await purgeSeedDataByDomain({
                      domain: purgeDomain.trim(),
                      limit: Number.isFinite(limit) ? limit : undefined,
                      dryRun: true,
                    } as any)
                    toast.info(res?.message ?? 'Dry run completed.')
                  } catch (e: any) {
                    toast.error(e?.message ?? 'Dry run failed.')
                  } finally {
                    setPurgeRunning(false)
                  }
                }}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-red-500/30 text-red-200 font-black uppercase tracking-widest text-[10px] italic hover:bg-white/15 active:scale-95 transition-all disabled:opacity-50"
              >
                {purgeRunning ? 'RUNNING...' : 'DRY RUN'}
              </button>
              <button
                type="button"
                disabled={purgeRunning || !purgeDomain.trim()}
                onClick={() =>
                  setConfirm({
                    open: true,
                    title: 'Purge seeded data?',
                    description: `This will delete seeded users and linked data for @${purgeDomain.trim()}. This cannot be undone.`,
                    tone: 'danger',
                    confirmLabel: 'Purge',
                    run: async () => {
                      setPurgeRunning(true)
                      try {
                        const limit = purgeLimit.trim() ? Number(purgeLimit) : undefined
                        const res = await purgeSeedDataByDomain({
                          domain: purgeDomain.trim(),
                          limit: Number.isFinite(limit) ? limit : undefined,
                          dryRun: false,
                        } as any)
                        toast.success(res?.message ?? 'Purge complete.')
                        await queryClient.invalidateQueries()
                      } catch (e: any) {
                        toast.error(e?.message ?? 'Purge failed.')
                      } finally {
                        setPurgeRunning(false)
                      }
                    },
                  })
                }
                className="flex-1 px-6 py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50"
              >
                Purge
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
