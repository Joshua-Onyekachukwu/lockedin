import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'

const EMPTY_ARGS: Record<string, never> = {}

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

function AdminSettings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()

  const adminStatusQuery = convexQuery(api.admin.checkAdminStatus, EMPTY_ARGS as any) as any
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  } as any)

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !adminStatus?.isAdmin)) {
      navigate({ to: '/login' })
    }
  }, [adminStatus, authLoading, isAuthenticated, navigate])

  if (authLoading || !isAuthenticated || !adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center text-white/20 italic font-black uppercase tracking-[0.5em]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-8" />
        Initializing Settings...
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

      <main className="max-w-5xl mx-auto p-8">
        <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
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
          <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
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

          <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
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
      </main>
    </div>
  )
}

