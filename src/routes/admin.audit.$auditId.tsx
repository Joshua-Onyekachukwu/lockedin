import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/admin/audit/$auditId')({
  component: AuditDetail,
})

function AuditDetail() {
  const { auditId } = Route.useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()

  const adminStatusQuery = convexQuery(api.admin.checkAdminStatus, {} as any) as any
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  } as any)

  const auditQuery = convexQuery((api as any).admin.getAuditById, { auditId } as any) as any
  const { data: audit }: { data: any } = useSuspenseQuery({
    ...(auditQuery as any),
    enabled: isAuthenticated && adminStatus?.isAdmin,
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
        Loading Audit...
      </div>
    )
  }

  if (!audit) {
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
                Audit Detail
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
              This audit record no longer exists.
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
              Audit Detail
            </span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">
              Administrative Record
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic flex items-center gap-3">
                <ScrollText size={16} className="text-white/20" />
                {audit.action}
              </p>
              <p className="mt-4 text-sm text-white/60 font-bold italic leading-relaxed">
                {audit.message}
              </p>
              <p className="mt-6 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
                {audit._creationTime ? new Date(audit._creationTime).toLocaleString() : ''}
              </p>
              <p className="mt-3 text-[10px] text-white/30 font-black uppercase tracking-[0.28em] italic leading-relaxed">
                Admin: <span className="text-white/60">{audit.admin?.email || 'admin'}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">Target</p>
              <p className="mt-2 text-[10px] text-white/50 font-black uppercase tracking-[0.28em] italic">
                {audit.targetType || '—'}
              </p>
              <p className="mt-2 text-[10px] text-white/50 font-black uppercase tracking-[0.28em] italic">
                {audit.targetId || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 shadow-2xl text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
            Metadata
          </p>
          <pre className="mt-6 text-xs text-white/50 leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(audit.metadata ?? {}, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  )
}

