import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Target, 
  Lock, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const joinWaitlist = useMutation(api.waitlist.join);

  // If authenticated, we might want to redirect to dashboard or show dashboard link
  // But let's just show the landing page with a "Dashboard" button instead of "Sign In"
  
  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await joinWaitlist({ email });
      setJoined(true);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white selection:bg-[#ff7a00] selection:text-white font-sans overflow-x-hidden">
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#a3805d]/5 blur-[150px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#050810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3 group cursor-pointer text-left">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-900/20 text-white">
                <Lock size={20} />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Lock<span className="text-[#ff7a00]">edin</span>
            </span>
          </div>
          
          <div className="hidden items-center gap-10 md:flex">
            {['The System', 'Why Stakes?', 'Features'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-sm font-medium text-white/50 transition-colors hover:text-white"
              >
                {item}
              </a>
            ))}
          </div>

          {!isLoading && (
            isAuthenticated ? (
              <Link 
                to="/verify-bvn" 
                className="hidden rounded-full bg-[#ff7a00] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#ff9500] transition-all md:block"
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                to="/login"
                className="hidden rounded-full bg-white/5 px-6 py-2.5 text-sm font-semibold text-white border border-white/10 hover:bg-white/10 transition-all md:block"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>

      <main className="relative pt-32">
        {/* Hero Section */}
        <section className="px-6 pb-20 pt-10 md:pt-24 lg:pt-32">
          <div className="mx-auto max-w-7xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-[#a3805d]/30 bg-[#a3805d]/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#a3805d] uppercase mb-8">
                <Zap size={14} fill="currentColor" />
                Waitlist Now Open
              </span>
              
              <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-[-0.03em] text-white sm:text-7xl lg:text-8xl leading-[1.05] text-center">
                Discipline is <span className="text-blue-500">Intention.</span> <br />
                Lockedin is <span className="text-[#ff7a00]">Commitment.</span>
              </h1>
              
              <p className="mx-auto mt-10 max-w-2xl text-lg text-white/40 sm:text-xl leading-relaxed text-center">
                Most productivity tools track progress. We enforce it. <br className="hidden sm:block" />
                Stake capital on your goals and turn willpower into an obligation.
              </p>

              {/* Waitlist Form */}
              <div className="mx-auto mt-12 max-w-md">
                {!joined ? (
                  <form onSubmit={handleWaitlist} className="relative flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group focus-within:border-blue-500/50 transition-colors">
                    <input 
                      type="email" 
                      placeholder="Enter your email address" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-white/20 outline-none w-full text-left"
                    />
                    <button 
                      type="submit"
                      className="group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff9500] px-8 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Join Waitlist <ArrowRight size={16} />
                      </span>
                    </button>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-blue-600/10 border border-blue-600/30 text-blue-400 font-semibold text-center"
                  >
                    <CheckCircle2 size={20} />
                    You're on the list. We'll be in touch.
                  </motion.div>
                )}
                <p className="mt-4 text-xs text-white/20 text-center">Join 1,200+ early adopters staking their future.</p>
              </div>
            </motion.div>

            {/* Premium Mockup / Dashboard Preview */}
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-24 relative mx-auto max-w-5xl px-4 sm:px-6"
            >
              <div className="absolute inset-0 bg-blue-600/20 blur-[100px] -z-10 rounded-full scale-90" />
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-xl shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-white/2 text-left">
                  <div className="flex gap-2 text-left">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <div className="h-5 w-48 rounded-full bg-white/5" />
                  <div className="w-8" />
                </div>
                <div className="grid grid-cols-12 gap-6 p-8 text-left">
                  <div className="col-span-8 space-y-6 text-left">
                    <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 p-6 flex items-center justify-between text-left">
                      <div className="text-left">
                        <p className="text-sm font-medium text-blue-400 text-left">Active Stakes</p>
                        <h3 className="mt-1 text-4xl font-bold text-white text-left">$2,450.00</h3>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-[#ff7a00]">
                          <TrendingUp size={18} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="rounded-2xl border border-white/5 bg-white/2 p-6 text-left">
                        <p className="text-xs text-white/30 uppercase tracking-widest font-bold text-left">Goal</p>
                        <p className="mt-2 text-lg font-bold text-white text-left">Morning Run (5km)</p>
                        <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden text-left">
                          <div className="h-full w-[80%] bg-[#ff7a00]" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/2 p-6 text-left">
                        <p className="text-xs text-white/30 uppercase tracking-widest font-bold text-left">Stake</p>
                        <p className="mt-2 text-lg font-bold text-white text-left">$500 Locked</p>
                        <p className="mt-2 text-xs text-green-500 font-medium text-left">Verified by Partner</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 space-y-4 text-left">
                    <div className="h-full rounded-2xl border border-white/5 bg-white/2 p-6 flex flex-col justify-between text-left">
                      <div className="text-left">
                        <p className="text-xs text-white/30 uppercase tracking-widest font-bold text-left">Potential Pain</p>
                        <div className="mt-6 flex flex-col gap-4 text-left">
                          {[
                            { text: 'Deduct $100', color: 'text-red-500' },
                            { text: 'Notify Team', color: 'text-blue-400' },
                            { text: 'Extend Lock', color: 'text-[#a3805d]' }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm text-left">
                              <div className={`p-1.5 rounded-md bg-white/5 ${item.color}`}>
                                <Zap size={14} />
                              </div>
                              <span className="text-white/60 text-left">{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="w-full rounded-xl bg-blue-600/10 py-3 text-xs font-bold text-blue-400 border border-blue-600/20 text-center">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid - Bento Style */}
        <section id="the-system" className="py-24 px-6 text-left">
          <div className="mx-auto max-w-7xl text-left">
            <div className="mb-20 text-center md:text-left text-left">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl text-left">Built for High Performers.</h2>
              <p className="mt-4 text-white/40 text-lg text-left leading-relaxed max-w-2xl">A behavioral system designed to eliminate the option of failure.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Feature 1 */}
              <div className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 group text-left">
                <div className="absolute top-0 right-0 p-8 text-blue-500/20">
                  <ShieldCheck size={120} strokeWidth={1} />
                </div>
                <div className="relative z-10 max-w-md text-left">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
                    <Lock size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white text-left">The Capital Lock</h3>
                  <p className="mt-4 text-lg text-white/40 leading-relaxed text-left">
                    Staking isn't just about money—it's about psychology. When your capital is on the line, your brain switches from "I should" to "I must".
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 flex flex-col justify-between text-left">
                <div className="text-left">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff7a00]/10 text-[#ff7a00]">
                    <Target size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white text-left">Custom Thresholds</h3>
                  <p className="mt-4 text-white/40 text-left">
                    Define the exact parameters of your commitment. You set the rules.
                  </p>
                </div>
                <div className="mt-8 flex gap-2 text-left">
                  <div className="px-3 py-1.5 rounded-full bg-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest text-left">Fitness</div>
                  <div className="px-3 py-1.5 rounded-full bg-white/5 text-[10px] font-bold text-white/30 uppercase tracking-widest text-left">Deep Work</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 text-left">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a3805d]/10 text-[#a3805d]">
                  <Users size={28} />
                </div>
                <h3 className="text-2xl font-bold text-white text-left">Social Verification</h3>
                <p className="mt-4 text-white/40 leading-relaxed text-left">
                  Connect with a verifier. True accountability requires a witness who can't be bribed.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 flex flex-col md:flex-row items-center gap-10 text-left">
                <div className="flex-1 text-left">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white text-left">Real-Time Stakes</h3>
                  <p className="mt-4 text-lg text-white/40 leading-relaxed text-left">
                    Live updates on your streak and stake status. Receive alerts that actually motivate you to move.
                  </p>
                </div>
                <div className="w-full md:w-64 space-y-3 text-left">
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-bold text-left">
                    Warning: 2 hours until deadline
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-bold text-left">
                    Verification request sent
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why it works - Philosophy Section */}
        <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5 text-center">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#a3805d] mb-12 text-center">The Philosophy</h2>
            <blockquote className="text-3xl sm:text-5xl font-medium tracking-tight text-white leading-tight text-center">
              "We are what we repeatedly do. Excellence, then, is not an act, but a habit. But habits are weak until they are <span className="text-[#ff7a00]">enforced.</span>"
            </blockquote>
            <div className="mt-12 flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-[#a3805d]/20 flex items-center justify-center text-[#a3805d]">
                <ShieldCheck size={20} />
              </div>
              <p className="text-white/40 font-medium text-center">The Locked-in Mandate</p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-32 px-6 text-center">
          <div className="mx-auto max-w-5xl rounded-[3rem] bg-gradient-to-br from-blue-700 to-blue-900 p-12 text-center sm:p-24 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-blue-500 opacity-20 pointer-events-none" />
            <div className="relative z-10 text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl text-center">
                Be the first to lock in.
              </h2>
              <p className="mt-8 text-xl text-white/60 max-w-xl mx-auto text-center leading-relaxed">
                The beta is limited. Join the waitlist to receive early access to the protocol and first-stake bonuses.
              </p>
              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row text-center">
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="rounded-full bg-white px-10 py-5 text-lg font-bold text-black transition hover:scale-105 active:scale-95 text-center"
                >
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-20 px-6 bg-[#050810] text-left">
        <div className="mx-auto max-w-7xl text-left">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20 text-center md:text-left text-left">
            <div className="col-span-2 flex flex-col items-center md:items-start text-left">
              <div className="flex items-center gap-3 mb-6 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Lock size={16} />
                </div>
                <span className="text-xl font-bold text-white text-left">Lockedin</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed max-w-xs text-left">
                The world's first commitment protocol designed for high-performing individuals who demand results from themselves.
              </p>
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-sm mb-6 uppercase tracking-widest text-left">Protocol</h4>
              <ul className="space-y-4 text-white/30 text-sm text-left">
                <li><a href="#" className="hover:text-white transition text-left">How it works</a></li>
                <li><a href="#" className="hover:text-white transition text-left">The Stakes</a></li>
                <li><a href="#" className="hover:text-white transition text-left">Safety</a></li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-sm mb-6 uppercase tracking-widest text-left">Company</h4>
              <ul className="space-y-4 text-white/30 text-sm text-left">
                <li><a href="#" className="hover:text-white transition text-left">Waitlist</a></li>
                <li><a href="#" className="hover:text-white transition text-left">Twitter / X</a></li>
                <li><a href="#" className="hover:text-white transition text-left">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-8 text-center md:text-left">
            <p className="text-xs text-white/20 tracking-wide text-center md:text-left">
              © 2024 LOCK-IN PROTOCOL. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
