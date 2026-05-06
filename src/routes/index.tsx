import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Lock, 
  ArrowRight,
  Zap,
  Shield,
  Target,
  BarChart3,
  Layers,
  CircleDot,
  CheckCircle2,
  Users,
  TrendingUp,
  Menu,
  X,
  CreditCard,
  History,
  Trophy,
  Wallet,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsWithSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const joinWaitlist = useMutation(api.waitlist.add);

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsWithSubmitting(true);
    try {
        await joinWaitlist({ email });
        setIsSuccess(true);
        setEmail('');
    } catch (err) {
        console.error(err);
    } finally {
        setIsWithSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020408] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Navigation */}
      <nav className="fixed top-0 z-[100] w-full border-b border-white/5 bg-[#020408]/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform group-hover:scale-110 group-active:scale-95">
                <Lock size={16} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic text-white">
              Lock<span className="text-blue-500">edin</span>
            </span>
          </Link>
          
          <div className="hidden items-center gap-10 md:flex">
            {['Protocol', 'Economics', 'Identity', 'Governance'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 transition-all hover:text-white hover:tracking-[0.4em]">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {!isLoading && (
                isAuthenticated ? (
                <Link to="/dashboard" className="hidden sm:block px-6 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                    Terminal
                </Link>
                ) : (
                <Link to="/login" className="hidden sm:block px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Initiate Session
                </Link>
                )
            )}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white"
            >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
          {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed inset-0 z-[90] bg-[#020408] p-6 pt-24 flex flex-col gap-8 md:hidden"
              >
                  {['Protocol', 'Economics', 'Identity', 'Governance'].map((item) => (
                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)} className="text-4xl font-black italic uppercase tracking-tighter text-white/40 hover:text-white transition-colors">
                        {item}
                    </a>
                  ))}
                  <div className="mt-auto pb-10 flex flex-col gap-4">
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-center italic">Dashboard</Link>
                    ) : (
                        <Link to="/login" className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-center italic">Login</Link>
                    )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
          <motion.div style={{ opacity, scale }} className="absolute inset-0 z-0">
             <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />
             <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          </motion.div>

          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase mb-12 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <CircleDot size={12} className="animate-pulse" /> Protocol v1.1 Live in Nigeria
              </div>
              
              <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-[-0.05em] text-white leading-[0.85] uppercase italic mb-12 text-balance leading-none">
                Commit <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">Money where your mouth is.</span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg md:text-xl text-white/40 leading-relaxed text-center font-medium italic mb-16">
                The world's first behavioral enforcement engine. <br />
                Stop negotiating with your weakness. Anchor your mandates with cold, hard capital. Do the work, or pay the price.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
                {isAuthenticated ? (
                    <Link to="/dashboard" className="group relative px-10 py-6 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden shadow-blue-900/40">
                        <span className="relative flex items-center gap-3">Enter Terminal <ArrowRight size={16} /></span>
                    </Link>
                ) : (
                    <Link to="/login" className="group relative px-10 py-6 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden shadow-blue-900/40">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative flex items-center gap-3">Initialize Protocol <ArrowRight size={16} /></span>
                    </Link>
                )}
                <a href="#protocol" className="px-10 py-6 rounded-3xl border border-white/10 bg-white/5 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                    How it works
                </a>
              </div>
            </motion.div>

            {/* Kinetic Dashboard Preview */}
            <motion.div 
              style={{ perspective: 1000 }}
              initial={{ opacity: 0, y: 100, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="absolute inset-0 bg-blue-600/20 blur-[120px] -z-10 rounded-[4rem] scale-90" />
              <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] text-left">
                <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500/20" />
                        <div className="h-2 w-2 rounded-full bg-yellow-500/20" />
                        <div className="h-2 w-2 rounded-full bg-green-500/20" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Behavioral Command Center</div>
                    <div className="w-10" />
                </div>
                <div className="p-12 grid grid-cols-12 gap-10">
                    <div className="col-span-12 lg:col-span-7 space-y-10">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Protocol Participant</p>
                            <h3 className="text-4xl font-black italic uppercase tracking-tighter">Citizen Joshua</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Staked Position</p>
                                <p className="text-2xl font-black italic text-white">₦250,000</p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Integrity Factor</p>
                                <p className="text-2xl font-black italic text-blue-500">98.4%</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-5 flex flex-col justify-center">
                        <div className="p-8 rounded-[2.5rem] bg-blue-600/5 border border-blue-500/20 relative overflow-hidden">
                            <Zap className="absolute -right-4 -top-4 text-blue-500/10" size={100} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Current Streak</p>
                            <p className="text-3xl font-black italic mb-2">24 DAYS</p>
                            <p className="text-[10px] text-white/40 font-bold uppercase italic tracking-tighter">Consistency Level: Elite</p>
                        </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Value Prop: Why Lockedin? */}
        <section className="py-40 px-6 relative bg-white/[0.01]">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="text-left space-y-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 italic">The Problem</p>
                        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9]">
                            Willpower is a <br /> <span className="text-white/20">Finite Resource.</span>
                        </h2>
                        <p className="text-xl text-white/40 leading-relaxed font-medium italic uppercase tracking-tight max-w-lg">
                            Most goals fail because humans are hardwired to seek comfort. We negotiate with ourselves. We make excuses. 
                        </p>
                        <div className="space-y-6">
                            {[
                                "Inspiration fades in 48 hours.",
                                "Discipline is expensive to maintain.",
                                "Loss aversion is the only biological constant."
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4 text-white/60 font-black italic uppercase text-sm italic tracking-widest">
                                    <X className="text-red-500" size={16} /> {text}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-600/10 blur-[80px] rounded-full group-hover:bg-blue-600/20 transition-all" />
                        <div className="relative p-12 rounded-[4rem] bg-[#0a0f1a] border border-white/5 shadow-2xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-white/5">
                                <Shield size={120} strokeWidth={1} />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-blue-500">The Lockedin Solution.</h3>
                            <p className="text-white/60 mb-10 leading-relaxed">We remove the option to quit by making it economically painful. When you stake capital, you aren't just making a promise—you're signing a behavioral contract with the protocol.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <p className="text-2xl font-black italic mb-1">₦0</p>
                                    <p className="text-[9px] uppercase tracking-widest text-white/20 font-black">Negotiation Room</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-blue-600/10 border border-blue-500/20">
                                    <p className="text-2xl font-black italic text-blue-500">100%</p>
                                    <p className="text-[9px] uppercase tracking-widest text-blue-400 font-black">Execution Rate</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Process Section */}
        <section id="protocol" className="py-40 px-6 relative border-y border-white/5">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-24">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-8 italic">Operating Manual</p>
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">Three Steps to <br /> <span className="text-white/20">Absolute Discipline.</span></h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { 
                            step: "01", 
                            title: "Anchor Identity", 
                            desc: "Verify your BVN to link your legal identity to the protocol. No bot accounts. No shadows.",
                            icon: <Shield className="text-blue-500" />
                        },
                        { 
                            step: "02", 
                            title: "Stake Capital", 
                            desc: "Define your mandate and lock NGN into the Vault. Select your Pain Tier—from Serious to Locked In.",
                            icon: <Wallet className="text-[#ff7a00]" />
                        },
                        { 
                            step: "03", 
                            title: "Execute & Log", 
                            desc: "Perform your daily mandates and provide photographic evidence. Fail, and the protocol forfeits your stake.",
                            icon: <Camera className="text-green-500" />
                        }
                    ].map((item, i) => (
                        <div key={i} className="group relative p-12 rounded-[3.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all text-left">
                            <span className="text-6xl font-black italic text-white/5 absolute top-8 right-10 group-hover:text-white/10 transition-colors">{item.step}</span>
                            <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-10 shadow-xl border border-white/5">
                                {item.icon}
                            </div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-white">{item.title}</h3>
                            <p className="text-white/30 text-sm font-medium italic uppercase leading-relaxed tracking-tight">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Features Bento */}
        <section id="economics" className="py-40 px-6 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    <div className="lg:col-span-8 group relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-16 hover:border-blue-500/20 transition-all">
                        <div className="absolute top-0 right-0 p-12 text-blue-600/5 transition-transform group-hover:scale-110">
                            <Shield size={240} strokeWidth={1} />
                        </div>
                        <div className="relative z-10 max-w-lg">
                            <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-10 border border-blue-500/20 shadow-xl">
                                <Lock size={28} />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-8 leading-none">The Capital <br /> Escrow.</h2>
                            <p className="text-xl text-white/40 leading-relaxed font-medium italic uppercase tracking-tight font-black">
                                Commitment without risk is just a wish. We lock your capital in a protocol-controlled vault. Adhere to your mandate or forfeit the principal. Total loss aversion as a service.
                            </p>
                        </div>
                    </div>
                    <div className="lg:col-span-4 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-12 flex flex-col justify-between group">
                        <div className="h-14 w-14 rounded-2xl bg-[#ff7a00]/10 flex items-center justify-center text-[#ff7a00] mb-10 border border-[#ff7a00]/20 shadow-xl">
                            <Zap size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Sunday Rewards.</h2>
                            <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                                Execution pays. Every Sunday, forfeited capital is converted into Protocol Credits for those who remained Locked In, allowing you to acquire protective Shields.
                            </p>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-4 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-12 group">
                        <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-10 border border-green-500/20 shadow-xl">
                            <Users size={28} />
                        </div>
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Witness Protocol.</h2>
                        <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                            Don't just trust yourself. Assign an Accountability Partner to verify your logs. No log is final without witness authorization.
                        </p>
                    </div>

                    <div className="lg:col-span-8 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-12 flex items-center gap-10 group">
                        <div className="flex-1">
                            <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-10 border border-blue-500/20 shadow-xl">
                                <BarChart3 size={28} />
                            </div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-6">Integrity Ledger.</h2>
                            <p className="text-xl text-white/40 leading-relaxed font-medium italic uppercase tracking-tight max-w-md font-black text-left">
                                Your discipline is now a public metric. Build your integrity score and climb the Hall of Fame. 
                            </p>
                        </div>
                        <div className="hidden md:block w-64 space-y-4">
                            <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase text-green-500 italic font-black tracking-widest text-center">Protocol Success: 100%</div>
                            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase text-blue-500 italic font-black tracking-widest text-center">Integrity Boost: +1.2%</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-40 px-6 relative bg-white/[0.01] border-t border-white/5">
            <div className="max-w-4xl mx-auto">
                <div className="text-left mb-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-8 italic">Protocol Intelligence</p>
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">Frequently Asked <br /> <span className="text-white/20">Protocol Details.</span></h2>
                </div>

                <div className="space-y-6">
                    {[
                        { q: "How is my capital secured?", a: "Your funds are escrowed in a protocol-controlled vault. We use institutional-grade security to ensure your stake is only touched in the event of a protocol breach." },
                        { q: "What happens if I miss a check-in?", a: "Depending on your Pain Tier, a percentage of your principal (2-5%) is immediately forfeited and moved to the Sunday Dividend pool." },
                        { q: "Can I withdraw my money anytime?", a: "Only liquid funds in your wallet can be extracted. Capital staked in an active mandate is locked until the protocol period ends or is breached." },
                        { q: "What is a 'Witness'?", a: "A witness is a designated accountability partner who verifies your photographic evidence. They ensure you aren't gaming the system." }
                    ].map((item, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-[#0a0f1a] border border-white/5 hover:border-white/10 transition-all group">
                            <h4 className="text-xl font-black italic uppercase text-white mb-4 group-hover:text-blue-500 transition-colors">{item.q}</h4>
                            <p className="text-white/40 text-sm font-medium italic uppercase leading-relaxed tracking-tight">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Waitlist / CTA Section */}
        <section id="identity" className="py-40 px-6 relative overflow-hidden border-t border-white/5">
            <div className="max-w-4xl mx-auto text-center relative z-10">
                <div className="h-20 w-20 rounded-[2rem] bg-blue-600 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-900/40">
                    <History size={32} />
                </div>
                <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-10 text-white">Stop making <br /> <span className="text-white/20">Empty Promises.</span></h2>
                <p className="text-xl text-white/40 font-medium italic uppercase tracking-tight mb-16">
                    Join the protocol today. Anchor your discipline with capital and start winning the war against mediocrity.
                </p>

                {isSuccess ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-10 rounded-[3rem] bg-green-500/10 border border-green-500/20 flex flex-col items-center gap-4"
                    >
                        <CheckCircle2 size={40} className="text-green-500" />
                        <p className="text-xl font-black italic uppercase text-green-500">Citizenship Request Logged.</p>
                        <p className="text-white/40 text-sm uppercase tracking-widest font-black">Check your email for the activation protocol.</p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleWaitlist} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto group">
                        <input 
                            type="email" 
                            required
                            placeholder="OPERATIONAL EMAIL ADDRESS"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-3xl px-8 py-6 text-sm font-black italic uppercase outline-none focus:border-blue-500 focus:bg-white/[0.04] transition-all"
                        />
                        <button 
                            disabled={isSubmitting}
                            className="px-10 py-6 rounded-3xl bg-white text-black font-black uppercase tracking-widest text-xs italic shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'LOGGING...' : 'Join Waitlist'}
                        </button>
                    </form>
                )}
                
                <p className="mt-10 text-[10px] text-white/20 font-black uppercase tracking-[0.4em] italic">Secure Identity Synchronization via Mono Bridge</p>
            </div>
            
            {/* Background Gradients for CTA */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-0" />
        </section>

        {/* Protocol Economics Section */}
        <section id="economics" className="py-40 px-6 relative bg-[#020408]">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="relative order-2 lg:order-1">
                        <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full" />
                        <div className="relative p-12 rounded-[4rem] bg-[#0a0f1a] border border-white/5 shadow-2xl overflow-hidden">
                            <div className="flex items-center gap-4 mb-12">
                                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-xl">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">The Penalty Pool.</h3>
                            </div>
                            
                            <div className="space-y-8">
                                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <p className="text-4xl font-black text-white italic mb-2">30%</p>
                                    <p className="text-[10px] uppercase tracking-widest text-blue-500 font-black italic">User Reward Pool</p>
                                    <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">Every Sunday, 30% of forfeited capital is converted into Protocol Credits for high-performers, enabling the acquisition of protective Shields.</p>
                                </div>
                                
                                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <p className="text-4xl font-black text-white italic mb-2">60%</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-black italic">Platform Operations</p>
                                    <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">Direct revenue used to scale the enforcement infrastructure and maintain institutional-grade security for your escrowed capital.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-left space-y-10 order-1 lg:order-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 italic">Financial Governance</p>
                        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-white leading-none">
                            Discipline is <br /> <span className="text-blue-500">Profitable.</span>
                        </h2>
                        <p className="text-xl text-white/40 leading-relaxed font-medium italic uppercase tracking-tight max-w-lg">
                            We've engineered a zero-sum behavioral game. Those who fail their mandates fund the rewards of those who remain Locked In.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white font-black italic uppercase text-xs tracking-widest">
                                    <CheckCircle2 size={16} className="text-green-500" /> Automated Payouts
                                </div>
                                <p className="text-[10px] text-white/20 italic font-black uppercase ml-7">Direct to your wallet</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white font-black italic uppercase text-xs tracking-widest">
                                    <CheckCircle2 size={16} className="text-green-500" /> Real-time Escrow
                                 </div>
                                <p className="text-[10px] text-white/20 italic font-black uppercase ml-7">Non-custodial protocol</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <footer className="py-40 px-6 relative bg-[#020408]">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start gap-20 mb-40 border-b border-white/5 pb-20 text-left">
                    <div className="max-w-md">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xl italic text-lg shadow-blue-900/40">L</div>
                            <span className="text-2xl font-black tracking-tighter uppercase italic">Lockedin</span>
                        </div>
                        <p className="text-white/30 font-medium italic uppercase tracking-tight text-lg mb-10 leading-relaxed text-balance font-black">
                            Lockedin is a behavioral enforcement mandate for those who refuse to live mediocre lives.
                        </p>
                        <div className="flex gap-4">
                             <a href="#" className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white shadow-xl">𝕏</a>
                             <a href="#" className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white shadow-xl">IN</a>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-20 text-left font-black italic uppercase">
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic font-black">Protocol</h4>
                            <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-white/60 font-black">
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">Architecture</li>
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">Security</li>
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">API Docs</li>
                            </ul>
                        </div>
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic font-black">Legal</h4>
                            <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-white/60 font-black">
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">Terms</li>
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">Privacy</li>
                                <li className="hover:text-blue-500 cursor-pointer transition-colors">BVN Data</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-left">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10 italic text-center md:text-left">© 2024 LOCK-IN PROTOCOL BEHAVIORAL ENFORCEMENT. ALL RIGHTS RESERVED.</p>
                    <div className="flex items-center gap-6">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 italic font-black">System Operational</span>
                    </div>
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
}
