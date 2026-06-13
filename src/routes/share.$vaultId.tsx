import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ArrowRight, ShieldCheck, Target, Trophy, User } from 'lucide-react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/share/$vaultId')({
  component: PublicSharePage,
  head: () => ({
    meta: [
      { title: 'Lockedin | Public Protocol Preview' },
      {
        name: 'description',
        content: 'Preview a public Lockedin protocol share link.',
      },
    ],
  }),
})

function PublicSharePage() {
  const { vaultId } = Route.useParams()
  const { data: preview }: { data: any } = useSuspenseQuery(
    convexQuery((api as any).goals.getPublicSharePreview, { vaultId }) as any,
  )

  if (!preview) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-[2.5rem] border border-white/10 bg-[#0a0f1a]/80 p-10 text-center">
          <p className="text-xl font-black uppercase italic text-white">Protocol not found</p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/30 italic">
            This share link is no longer active.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-black italic"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const ownerName = preview.owner?.name || 'Anonymous Operator'
  const title = preview.goal?.title || 'Commitment Protocol'

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl p-6 md:p-12">
        <div className="rounded-[3rem] border border-white/10 bg-[#0a0f1a]/80 p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-400 italic">
                Public Protocol Preview
              </p>
              <h1 className="mt-5 text-4xl font-black uppercase italic leading-tight text-white md:text-6xl">
                {title}
              </h1>
              <p className="mt-5 text-sm leading-relaxed text-white/45 italic uppercase tracking-[0.16em]">
                {preview.goal?.description || 'A visible commitment protocol running on Lockedin.'}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  icon={<Target size={16} />}
                  label="Frequency"
                  value={String(preview.goal?.frequency_type || 'daily')}
                />
                <MetricCard
                  icon={<ShieldCheck size={16} />}
                  label="Pain Tier"
                  value={String(preview.painTier || 'enforcement')}
                />
                <MetricCard
                  icon={<Trophy size={16} />}
                  label="Stake"
                  value={`₦${(Number(preview.amount ?? 0) / 100).toLocaleString()}`}
                />
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">
                Protocol Owner
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                  {preview.owner?.image ? (
                    <img src={preview.owner.image} alt={ownerName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/40">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-black uppercase italic text-white">{ownerName}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/25 italic">
                    Integrity {preview.owner?.integrityScore ?? 100}% {preview.owner?.city ? `• ${preview.owner.city}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/20 italic">
                  Why this matters
                </p>
                <p className="mt-3 text-xs leading-relaxed text-white/45 italic">
                  Lockedin makes discipline visible. The full protocol remains private to the owner and approved witnesses,
                  but this public share proves the commitment is live.
                </p>
              </div>

              <Link
                to="/login"
                className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-black italic"
              >
                Join Lockedin <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-left">
      <div className="flex items-center gap-3 text-blue-400">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20 italic">{label}</p>
      </div>
      <p className="mt-4 text-lg font-black uppercase italic text-white">{value}</p>
    </div>
  )
}
