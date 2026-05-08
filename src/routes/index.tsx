import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Lock, 
  ArrowRight,
  Zap,
  Shield,
  CircleDot,
  CheckCircle2,
  Menu,
  X,
  History,
  Camera,
  ShieldCheck,
  Globe,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showModal, setShowModal] = useState<{ title: string; content: string } | null>(null);
  
  const joinWaitlist = useMutation(api.waitlist.add);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
        await joinWaitlist({ email });
        setIsSuccess(true);
        setEmail('');
        setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const navLinks = [
    { name: 'Protocol', href: '#protocol' },
    { name: 'Architecture', href: '#architecture' },
    { name: 'Sunday Liquidation', href: '#governance' },
  ];

  const Modal = ({ title, content, onClose }: { title: string; content: string; onClose: () => void }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020408]/95 backdrop-blur-3xl p-4 sm:p-6"
    >
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-[#0a0f1a] border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        >
            <button onClick={onClose} className="absolute right-4 top-4 sm:right-10 sm:top-10 p-2 sm:p-3 rounded-full bg-white/5 text-white/20 hover:text-white transition-all z-20"><X size={20} /></button>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />
            
            <div className="relative z-10">
                <h3 className="text-xl sm:text-3xl font-black italic uppercase tracking-tighter text-white mb-6 sm:mb-10 flex items-center gap-4 text-left">
                    <span className="text-blue-500">/</span> {title}
                </h3>
                <div className="text-white/50 font-medium italic uppercase text-[10px] sm:text-xs leading-loose space-y-4 sm:space-y-6 text-left max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-4 sm:pr-6 custom-scrollbar">
                    {content.split('\n\n').map((section, i) => (
                        <div key={section.slice(0, 10) + i}>
                            {section.split('\n').map((para, j) => (
                                <p key={para.slice(0, 10) + j} className={j === 0 ? "text-white font-black mb-2" : "mb-3 sm:mb-4 ml-4 border-l border-white/10 pl-4"}>
                                    {para}
                                </p>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest italic">Protocol Security Standard v2.4</p>
                <button onClick={onClose} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-black font-black uppercase text-[10px] italic tracking-widest hover:scale-105 active:scale-95 transition-all">Acknowledge</button>
            </div>
        </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#020408] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      <AnimatePresence>
        {showModal && (
            <Modal title={showModal.title} content={showModal.content} onClose={() => setShowModal(null)} />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      <nav className={`fixed top-0 z-[100] w-full transition-all duration-500 border-b border-white/5 ${scrolled ? 'bg-[#020408]/80 backdrop-blur-2xl py-3 sm:py-4' : 'bg-transparent py-5 sm:py-6'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer text-left">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform group-hover:scale-110 group-active:scale-95">
                <Lock strokeWidth={2.5} className="text-white w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tighter uppercase italic text-white text-left leading-none">
              Lock<span className="text-blue-500">edin</span>
            </span>
          </Link>
          
          <div className="hidden items-center gap-8 lg:gap-10 md:flex">
            {navLinks.map((item) => (
              <a key={item.name} href={item.href} className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 transition-all hover:text-white hover:tracking-[0.4em]">
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-left">
            {!isLoading && (
                isAuthenticated ? (
                <Link to="/dashboard" className="hidden sm:block px-6 lg:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 italic text-center">
                    Terminal
                </Link>
                ) : (
                <Link to="/login" className="hidden sm:block px-6 lg:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all italic text-center">
                    Enlist
                </Link>
                )
            )}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white active:scale-95 transition-transform"
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
                initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
                className="fixed inset-0 z-[120] bg-[#020408] p-6 sm:p-12 flex flex-col gap-8 md:hidden overflow-y-auto"
              >
                  <div className="flex items-center justify-between mb-8">
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 group cursor-pointer text-left">
                      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                          <Lock size={16} strokeWidth={2.5} className="text-white" />
                      </div>
                      <span className="text-xl font-black tracking-tighter uppercase italic text-white text-left">Lock<span className="text-blue-500">edin</span></span>
                    </Link>
                    <button onClick={() => setIsMenuOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 text-white"><X size={24} /></button>
                  </div>

                  <div className="flex flex-col gap-8 sm:gap-12 mt-10 text-left">
                      {navLinks.map((item) => (
                        <a key={item.name} href={item.href} onClick={() => setIsMenuOpen(false)} className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white/40 hover:text-white transition-colors">
                            {item.name}
                        </a>
                      ))}
                  </div>
                  <div className="mt-auto pb-10 flex flex-col gap-4">
                    {isAuthenticated ? (
                        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-white text-black font-black uppercase tracking-widest text-center italic text-lg sm:text-xl">Access Terminal</Link>
                    ) : (
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-blue-600 text-white font-black uppercase tracking-widest text-center italic text-lg sm:text-xl">Login Protocol</Link>
                    )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <main className="relative text-left">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] sm:min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-32 sm:pt-48 md:pt-64 overflow-hidden text-center">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[1200px] h-[400px] sm:h-[800px] bg-blue-600/10 blur-[100px] sm:blur-[180px] rounded-full pointer-events-none -z-10" />
          
          <div className="max-w-7xl mx-auto relative z-10 text-center w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 sm:px-6 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.4em] text-blue-400 uppercase mb-8 sm:mb-12 shadow-[0_0_40px_rgba(59,130,246,0.1)] italic text-center">
                <CircleDot className="animate-pulse w-2.5 h-2.5 sm:w-3 sm:h-3" /> Protocol v1.1 Live in Nigeria
              </div>
              
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-[-0.05em] text-white leading-[0.9] sm:leading-[0.85] uppercase italic mb-8 sm:mb-12 text-balance text-center px-2">
                Commit <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 text-center">Money where your mouth is.</span>
              </h1>
              
              <p className="mx-auto max-w-2xl text-xs sm:text-sm md:text-base text-white/40 leading-relaxed font-black italic mb-10 sm:mb-16 uppercase tracking-tight text-center px-4">
                THE BEHAVIORAL ENFORCEMENT MANDATE. <br className="hidden sm:block" />
                ANCHOR YOUR GOALS WITH CAPITAL. DO WHAT YOU SAID YOU WOULD DO, OR LOSE THE STAKE. NO EXCUSES.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-16 sm:mb-24 text-center px-4">
                {isAuthenticated ? (
                    <Link to="/dashboard" className="w-full sm:w-auto group relative px-10 sm:px-12 py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] bg-blue-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden shadow-blue-900/40 italic">
                        <span className="relative flex items-center justify-center gap-3 text-center">Return to Terminal <ArrowRight size={18} /></span>
                    </Link>
                ) : (
                    <Link to="/login" className="w-full sm:w-auto group relative px-10 sm:px-12 py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] bg-blue-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden shadow-blue-900/40 italic">
                        <span className="relative flex items-center justify-center gap-3 text-center">Enlist in Protocol <ArrowRight size={18} /></span>
                    </Link>
                )}
                <a href="#protocol" className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] border border-white/10 bg-white/5 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all italic text-center">
                    Operational Manual
                </a>
              </div>
            </motion.div>

            {/* Live Protocol Ticker */}
            <div className="w-full overflow-hidden border-y border-white/5 bg-white/[0.02] py-3 sm:py-4 mb-16 sm:mb-24 text-left">
                <div className="flex whitespace-nowrap animate-marquee">
                    {[1, 2, 3, 4].map((_, i) => (
                        <div key={i} className="flex items-center gap-8 sm:gap-12 px-4 sm:px-6">
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-white/40 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> CITIZEN JOSHUA STAKED ₦250K
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-red-500 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> MANDATE BREACH: ₦25K FORFEITED
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-white/40 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> NEW MANDATE INITIALIZED: ₦50K
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-blue-500 tracking-widest text-glow-blue text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]" /> SYSTEM INTEGRITY: 99.1%
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-white/40 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> CITIZEN SARAH COMPLETED WEEKLY MANDATE
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-green-500 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> REWARD POOL PAYOUT: ₦12.5K CREDITED
                            </span>
                            <span className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase italic text-white/40 tracking-widest text-left">
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> BVN HASH SYNCHRONIZED: CITIZEN #482
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </section>

        {/* The Integrity Economy */}
        <section className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative overflow-hidden border-y border-white/5 bg-white/[0.01] text-left">
            <div className="max-w-7xl mx-auto text-left">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center text-left">
                    <div className="text-left space-y-8 sm:space-y-12">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 italic">Economic Foundation</p>
                        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] sm:leading-[0.85] text-white">
                            The Integrity <br /> <span className="text-blue-500">Economy.</span>
                        </h2>
                        <p className="text-sm sm:text-base text-white/40 leading-relaxed font-black italic uppercase tracking-tight max-w-lg">
                            IN A WORLD OF CONSTANT DISTRACTION, DISCIPLINE IS THE RAREST COMMODITY. LOCKEDIN CONVERTS YOUR CONSISTENCY INTO A HARD ASSET, BACKED BY CAPITAL AND SOCIAL PROOF.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                        {[
                            { 
                                icon: <Cpu size={24} className="text-blue-500" />,
                                title: "Non-Custodial Enforcement",
                                desc: "NO MIDDLEMAN. YOUR BEHAVIORAL CONTRACT IS EXECUTED BY THE PROTOCOL ENGINE BASED ON VERIFIABLE EVIDENCE."
                            },
                            { 
                                icon: <Globe size={24} className="text-purple-500" />,
                                title: "Public Reputation Ledger",
                                desc: "BUILD A REPUTATION THAT MONEY CAN'T BUY. YOUR INTEGRITY SCORE IS A PUBLIC PROOF OF YOUR WORD."
                            },
                            { 
                                icon: <Shield size={24} className="text-green-500" />,
                                title: "Protocol Immunity",
                                desc: "ELITE PERFORMERS EARN SHIELDS ONE-TIME PROTECTIONS THAT PREVENT FORFEITURE DURING UNEXPECTED SYSTEMIC FRICTION."
                            },
                            { 
                                icon: <Zap size={24} className="text-[#ff7a00]" />,
                                title: "Zero-Sum Incentives",
                                desc: "WE'VE REMOVED THE PROFIT MOTIVE. PENALTIES STAY WITHIN THE ECOSYSTEM TO FUND REWARDS FOR THE DISCIPLINED."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-[#0a0f1a] border border-white/5 hover:border-blue-500/20 transition-all group">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                                <h4 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white mb-2 sm:mb-4">{feature.title}</h4>
                                <p className="text-[10px] sm:text-xs text-white/30 font-black italic uppercase leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* The Operational Creed Section */}
        <section id="protocol" className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative border-b border-white/5 bg-[#020408] text-center">
            <div className="max-w-6xl mx-auto text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-8 sm:mb-16 italic font-black text-center">The Operational Creed</p>
                <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-[7rem] font-black italic uppercase tracking-[-0.05em] leading-[0.9] sm:leading-[0.8] text-white text-center text-balance">
                    Willpower is a <br className="sm:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-500 to-blue-800 text-center">Finite Resource.</span> <br />
                    Systemic Risk is a <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 text-center">Guarantee.</span>
                </h2>
                <p className="mt-12 sm:mt-24 text-sm sm:text-base text-white/40 font-black italic uppercase tracking-tight max-w-2xl mx-auto leading-relaxed text-center">
                    MOST GOALS FAIL BECAUSE HUMANS ARE HARDWIRED TO SEEK COMFORT. WE NEGOTIATE WITH OUR WEAKNESS. LOCKEDIN REMOVES THE OPTION TO QUIT.
                </p>
            </div>
        </section>

        {/* Hierarchy of Pain */}
        <section className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative border-b border-white/5 text-left bg-white/[0.01]">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 sm:mb-24">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#ff7a00] mb-6 sm:mb-8 italic">Enforcement Tiers</p>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter text-white leading-none text-balance">Choose your <br /> <span className="text-white/20">Behavioral Threshold.</span></h2>
                    <p className="mt-6 sm:mt-8 text-white/40 text-[10px] sm:text-xs font-black italic uppercase tracking-tight max-w-2xl">
                        YOU DEFINE THE COST OF YOUR FAILURE. LOCKEDIN ALLOWS YOU TO CALIBRATE THE PAIN PROTOCOL BASED ON THE SEVERITY OF YOUR MANDATE.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {[
                        {
                            tier: "Deterrence",
                            penalty: "2%",
                            desc: "DESIGNED FOR MINOR HABIT OPTIMIZATION. A PSYCHOLOGICAL NUDGE TO KEEP YOU ON THE PATH. LOW RISK, BUT CONSTANT AWARENESS.",
                            accent: "text-blue-500",
                            bg: "bg-blue-500/5",
                            border: "border-blue-500/20"
                        },
                        {
                            tier: "Enforcement",
                            penalty: "5%",
                            desc: "SERIOUS BEHAVIORAL STAKES. EVERY MISSED CHECK-IN EXTRACTS SIGNIFICANT CAPITAL. FAILURE IS NO LONGER AN INTELLECTUAL EXERCISE.",
                            accent: "text-[#ff7a00]",
                            bg: "bg-[#ff7a00]/5",
                            border: "border-[#ff7a00]/20"
                        },
                        {
                            tier: "Liquidation",
                            penalty: "10%",
                            desc: "THE ABSOLUTE PROTOCOL. TOTAL COMMITMENT. BREACH RESULTS IN CATASTROPHIC CAPITAL FORFEITURE. QUITTING IS ECONOMICALLY IMPOSSIBLE.",
                            accent: "text-red-500",
                            bg: "bg-red-500/5",
                            border: "border-red-500/20"
                        }
                    ].map((item, i) => (
                        <div key={i} className={`p-8 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] border ${item.border} ${item.bg} relative overflow-hidden group hover:scale-[1.02] transition-all`}>
                            <div className="flex justify-between items-start mb-10 sm:mb-12">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${item.accent} italic`}>{item.tier} Protocol</span>
                                <span className="text-3xl sm:text-4xl font-black italic text-white tracking-tighter">{item.penalty}</span>
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter mb-4 sm:mb-6 text-white leading-tight">Daily <br /> Forfeiture.</h3>
                            <p className="text-white/40 text-[10px] sm:text-xs font-black italic uppercase leading-relaxed tracking-tight mb-8">
                                {item.desc}
                            </p>
                            <div className={`h-1 w-full bg-white/5 rounded-full overflow-hidden`}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    whileInView={{ width: item.penalty === '10%' ? '100%' : item.penalty === '5%' ? '50%' : '20%' }}
                                    className={`h-full ${item.accent.replace('text-', 'bg-')}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="architecture" className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative text-left">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 sm:mb-24">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-6 sm:mb-8 italic">Operating Manual</p>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter text-white leading-none text-balance">Three Steps to <br /> <span className="text-white/20 text-2xl sm:text-3xl md:text-5xl">Absolute Discipline.</span></h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
                    {[
                        { 
                            step: "01", 
                            title: "Anchor Identity", 
                            desc: "INITIALIZE YOUR BEHAVIORAL CONTRACT. STAKE CAPITAL AND DEFINE YOUR SPECIFIC MANDATE. YOUR PRINCIPAL IS NOW LOCKED IN ESCROW.",
                            icon: <Shield className="text-blue-500" />
                        },
                        { 
                            step: "02", 
                            title: "Log Evidence", 
                            desc: "DAILY ADHERENCE IS MANDATORY. UPLOAD PHOTO PROOF DIRECTLY TO YOUR DASHBOARD TERMINAL. THIS BECOMES YOUR BEHAVIORAL LEDGER.",
                            icon: <Camera className="text-[#ff7a00]" />
                        },
                        { 
                            step: "03", 
                            title: "Verify & Protect", 
                            desc: "YOUR WITNESSES REVIEW THE EVIDENCE. SUCCESSFULLY COMPLETED MANDATES EARN CREDITS AND SHIELDS TO PROTECT YOUR FUTURE CAPITAL.",
                            icon: <ShieldCheck className="text-green-500" />
                        }
                    ].map((item, i) => (
                        <div key={i} className="group relative p-8 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all">
                            <span className="text-5xl sm:text-7xl font-black italic text-white/5 absolute top-6 right-8 sm:top-8 sm:right-10 group-hover:text-white/10 transition-colors">{item.step}</span>
                            <div className="h-14 w-12 sm:h-16 sm:w-14 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center mb-8 sm:mb-12 shadow-xl border border-white/5">
                                {item.icon}
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter mb-4 sm:mb-6 text-white leading-tight">{item.title}</h3>
                            <p className="text-white/30 text-[10px] sm:text-xs font-black italic uppercase leading-relaxed tracking-tight">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Governance Section */}
        <section id="governance" className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative bg-[#020408] border-t border-white/5 text-left">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                    <div className="space-y-8 sm:space-y-12">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 italic">Financial Governance</p>
                        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] sm:leading-[0.85] text-white">
                            Sunday <br /> <span className="text-blue-500">Liquidation.</span>
                        </h2>
                        <p className="text-sm sm:text-base text-white/40 leading-relaxed font-black italic uppercase tracking-tight max-w-lg">
                            PROTOCOL BREACHES FUND THE ENCLAVE. EVERY SUNDAY, THE PENALTY POOL IS REDISTRIBUTED TO CITIZENS WITH PERFECT INTEGRITY SCORES. WE DON'T JUST PUNISH FAILURE WE SUBSIDIZE ELITE PERFORMANCE.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-600/10 blur-[60px] sm:blur-[100px] rounded-full" />
                        <div className="relative p-8 sm:p-12 md:p-16 rounded-[2rem] sm:rounded-[4rem] bg-[#0a0f1a] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                            <div className="flex items-center gap-4 mb-12 sm:mb-16">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-xl italic font-black text-lg shadow-blue-500/10">Σ</div>
                                <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">Pool Dynamics.</h3>
                            </div>
                            
                            <div className="space-y-8 sm:space-y-10">
                                <div className="p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-inner group hover:bg-white/[0.04] transition-colors">
                                    <p className="text-2xl sm:text-4xl font-black text-white italic mb-3 sm:mb-4">CAPITAL POOL</p>
                                    <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-blue-500 font-black italic mb-4 sm:mb-6">DISTRIBUTION PROTOCOL</p>
                                    <p className="text-[9px] sm:text-[10px] text-white/30 leading-relaxed font-black italic uppercase text-balance">FORFEITED PRINCIPAL FROM MANDATE BREACHES IS POOLED AND SYNCHRONIZED. PERFECT ADHERENCE CITIZENS RECEIVE THESE REWARDS AS NON-MONETARY PROTOCOL CREDITS AND STATUS MULTIPLIERS.</p>
                                </div>
                                
                                <div className="p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-inner group hover:bg-white/[0.04] transition-colors">
                                    <p className="text-2xl sm:text-4xl font-black text-white italic mb-3 sm:mb-4">INTEGRITY</p>
                                    <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/40 font-black italic mb-4 sm:mb-6">THE HIGH PERFORMERS</p>
                                    <p className="text-[9px] sm:text-[10px] text-white/30 leading-relaxed font-black italic uppercase text-balance">CITIZENS WITH 100% ADHERENCE ARE SHIELDED FROM FUTURE POOL SWEEPS. YOUR DISCIPLINE EARNS YOU IMMUNITY FROM THE PROTOCOL'S HARSHEST ENFORCEMENTS.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative bg-white/[0.01] border-t border-white/5 text-left">
            <div className="max-w-4xl mx-auto">
                <div className="mb-16 sm:mb-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-6 sm:mb-8 italic">Protocol Intelligence</p>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter text-white leading-none text-balance">Frequently Asked <br /> <span className="text-white/20 text-2xl sm:text-3xl md:text-5xl">Protocol Details.</span></h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {[
                        { q: "How is my capital secured?", a: "YOUR FUNDS ARE ESCROWED IN A PROTOCOL-CONTROLLED VAULT. WE USE INSTITUTIONAL-GRADE SECURITY TO ENSURE YOUR STAKE IS ONLY TOUCHED IN THE EVENT OF A PROTOCOL BREACH." },
                        { q: "What happens if I miss a check-in?", a: "DEPENDING ON YOUR PAIN TIER, A PERCENTAGE OF YOUR PRINCIPAL (2%, 5%, OR 10%) IS IMMEDIATELY FORFEITED TO ENSURE PROTOCOL STABILITY." },
                        { q: "Can I withdraw my money?", a: "ONLY LIQUID FUNDS IN YOUR WALLET CAN BE EXTRACTED. CAPITAL STAKED IN AN ACTIVE MANDATE IS LOCKED UNTIL THE PROTOCOL PERIOD ENDS OR IS BREACHED." },
                        { q: "What is a 'Witness'?", a: "A WITNESS IS A DESIGNATED ACCOUNTABILITY PARTNER WHO VERIFIES YOUR PHOTOGRAPHIC EVIDENCE. THEY ENSURE YOU AREN'T GAMING THE SYSTEM." }
                    ].map((item, i) => (
                        <div key={i} className="p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[3rem] bg-[#0a0f1a] border border-white/5 hover:border-white/10 transition-all group">
                            <h4 className="text-lg sm:text-2xl font-black italic uppercase text-white mb-4 sm:mb-6 group-hover:text-blue-500 transition-colors font-black leading-tight">{item.q}</h4>
                            <p className="text-[10px] sm:text-xs text-white/30 font-black italic uppercase leading-relaxed tracking-tight">{item.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="identity" className="py-24 sm:py-32 md:py-48 px-4 sm:px-6 relative overflow-hidden border-t border-white/5 text-center">
            <div className="max-w-4xl mx-auto relative z-10 w-full">
                <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[2.5rem] bg-blue-600 flex items-center justify-center mx-auto mb-8 sm:mb-12 shadow-[0_0_50px_rgba(37,99,235,0.4)]">
                    <History className="text-white w-7 h-7 sm:w-10 sm:h-10" />
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter mb-8 sm:mb-10 text-white leading-none">Stop making <br /> <span className="text-white/20">Empty Promises.</span></h2>
                <p className="text-xs sm:text-sm md:text-base text-white/40 font-black italic uppercase tracking-tight mb-12 sm:mb-20 leading-relaxed text-center px-4">
                    JOIN THE PROTOCOL TODAY. ANCHOR YOUR DISCIPLINE WITH CAPITAL AND START WINNING THE WAR AGAINST MEDIOCRITY.
                </p>

                {isSuccess ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-10 sm:p-16 rounded-[2rem] sm:rounded-[4rem] bg-green-500/10 border border-green-500/20 flex flex-col items-center gap-6 shadow-2xl mx-4"
                    >
                        <CheckCircle2 className="text-green-500 w-10 h-10 sm:w-14 sm:h-14" />
                        <div className="space-y-2">
                            <p className="text-2xl sm:text-3xl font-black italic uppercase text-green-500">Identity Anchored.</p>
                            <p className="text-[10px] sm:text-sm uppercase tracking-widest font-black italic text-white/40">We will reach out via your secure email soon.</p>
                        </div>
                    </motion.div>
                ) : (
                    <form onSubmit={handleWaitlist} className="flex flex-col md:flex-row gap-4 sm:gap-6 max-w-3xl mx-auto group px-4">
                        <input 
                            type="email" 
                            required
                            placeholder="OPERATIONAL EMAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full flex-1 bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-[2.5rem] px-6 sm:px-10 py-5 sm:py-8 text-lg sm:text-xl font-black italic uppercase outline-none focus:border-blue-500 focus:bg-white/[0.04] transition-all placeholder:text-white/5"
                        />
                        <button 
                            disabled={isSubmitting}
                            className="w-full md:w-auto px-10 sm:px-12 py-5 sm:py-8 rounded-xl sm:rounded-[2.5rem] bg-white text-black font-black uppercase tracking-widest text-xs sm:text-sm italic shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-white/5 text-center"
                        >
                            {isSubmitting ? 'ENROLLING...' : 'Enlist in Protocol'}
                        </button>
                    </form>
                )}
                
                <p className="mt-12 sm:mt-16 text-[8px] sm:text-[10px] text-white/10 font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] italic">Identity Synchronization via Secure Protocol Bridge</p>
            </div>
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[1000px] h-[250px] sm:h-[500px] bg-blue-600/10 blur-[80px] sm:blur-[150px] rounded-full pointer-events-none -z-10" />
        </section>

        <footer className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 relative bg-[#020408] border-t border-white/5 text-left">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-16 lg:gap-20 mb-16 sm:mb-24 border-b border-white/5 pb-12 sm:pb-16">
                    <div className="max-w-md w-full">
                        <div className="flex items-center gap-3 mb-8 sm:mb-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-2xl italic text-xl shadow-blue-900/40">L</div>
                            <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Lockedin</span>
                        </div>
                        <p className="text-xs sm:text-sm md:text-base text-white/30 font-black italic uppercase tracking-tight mb-8 sm:mb-12 leading-relaxed text-balance">
                            LOCKEDIN IS A BEHAVIORAL ENFORCEMENT MANDATE FOR THOSE WHO REFUSE TO LIVE MEDIOCRE LIVES.
                        </p>
                        <div className="flex gap-4">
                             <a href="#" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white shadow-xl italic font-black text-lg">𝕏</a>
                             <a href="#" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white shadow-xl italic font-black text-xs uppercase tracking-widest">IN</a>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-12 sm:gap-24 text-left font-black italic uppercase w-full lg:w-auto">
                        <div className="space-y-6 sm:space-y-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Protocol</h4>
                            <ul className="space-y-4 sm:space-y-6 text-[10px] font-black uppercase tracking-widest text-white/60">
                                <li onClick={() => setShowModal({ 
                                    title: 'Architecture', 
                                    content: 'I. THE BEHAVIORAL ENGINE\nOur core engine is built on a non-custodial enforcement layer. Once a mandate is initialized, capital escrow is governed by algorithmic logic.\n\nII. ESCROW HIERARCHY\nFunds are distributed across smart-contract vaults synchronized with the behavioral ledger. No human has direct access to staked principal.\n\nIII. EVIDENCE PIPELINE\nEvidence logs undergo a 3-stage validation: initial cryptographic hashing, witness review, and final integrity scoring.\n\nIV. SYSTEM LATENCY\nThe protocol operates with millisecond latency for logging, ensuring real-time feedback on behavioral adherence.\n\nV. MULTI-SIG AUTH\nAdministrative changes require multi-signature authorization to prevent unauthorized protocol modifications.\n\nVI. ASYNC AUDITING\nThe system runs background audits every 6 hours to detect any anomalies in the integrity ledger.\n\nVII. LOAD BALANCING\nArchitecture scales horizontally to support thousands of concurrent mandates without performance degradation.\n\nVIII. DATA REDUNDANCY\nAll behavioral data is replicated across three secure regions to ensure 99.9% protocol availability.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">Architecture</li>
                                
                                <li onClick={() => setShowModal({ 
                                    title: 'Security', 
                                    content: 'I. IDENTITY ANCHORING\nBVN verification is the bedrock of our protocol. It ensures a 1:1 human-to-citizen ratio to prevent sybil attacks.\n\nII. DATA ENCRYPTION\nAll citizen data is encrypted using AES-256 at rest and TLS 1.3 in transit.\n\nIII. HASHED SENSITIVE DATA\nWe never store raw BVN or financial IDs. We only store irreversible cryptographic hashes for identity matching.\n\nIV. ACCESS CONTROL\nStrict Row-Level Security (RLS) ensures that even system administrators cannot view your private evidence logs.\n\nV. FRAUD DETECTION\nAI-powered behavioral analysis monitors logs for signs of evidence tampering or synthetic generation.\n\nVI. COLD STORAGE\nThe majority of protocol liquidity is held in cold storage to minimize hot-wallet risk.\n\nVII. REGULAR PENTESTING\nOur infrastructure undergoes monthly external penetration testing to identify and patch vulnerabilities.\n\nVIII. INCIDENT RESPONSE\nA dedicated security team is on standby 24/7 with a protocol-wide lockdown capability for extreme threats.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">Security</li>
                                
                                <li onClick={() => setShowModal({ 
                                    title: 'API Docs', 
                                    content: 'I. PUBLIC ENDPOINTS\nAccess real-time protocol stats and system integrity scores via GET /v1/public/stats.\n\nII. CITIZEN COMMANDS\nInitialize mandates programmatically via POST /v1/mandates/initialize with JWT authorization.\n\nIII. EVIDENCE WEBHOOKS\nRegister webhooks to receive notifications when your witnesses approve or flag an evidence log.\n\nIV. RATE LIMITING\nAPI access is governed by integrity score multipliers; high-integrity citizens receive higher request ceilings.\n\nV. SANDBOX ENVIRONMENT\nTest your behavioral integrations in our secure sandbox before deploying to the live protocol.\n\nVI. SDK AVAILABILITY\nOfficial client libraries are available for React, Node.js, and Python.\n\nVII. AUTHENTICATION\nAll private endpoints require Bearer Token authentication via our secure OAuth2 bridge.\n\nVIII. DOCUMENTATION PORTAL\nDetailed endpoint specifications and schemas are available to all anchored citizens in the developer terminal.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">API Docs</li>
                            </ul>
                        </div>
                        <div className="space-y-6 sm:space-y-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Legal</h4>
                            <ul className="space-y-4 sm:space-y-6 text-[10px] font-black uppercase tracking-widest text-white/60">
                                <li onClick={() => setShowModal({ 
                                    title: 'Terms of Enlistment', 
                                    content: 'I. THE BINDING CONTRACT\nBy staking capital, you enter into a non-negotiable behavioral agreement. You are the sole party responsible for execution.\n\nII. FORFEITURE CONSENT\nYou explicitly authorize the protocol to seize a percentage of your stake in the event of a mandate breach.\n\nIII. NO REFUND POLICY\nAll forfeitures are final. The protocol does not offer reversals or appeals for missed check-ins.\n\nIV. WITNESS JURISDICTION\nYou agree that the collective decision of your designated witnesses is final and legally binding.\n\nV. SYSTEMIC RISK\nYou acknowledge that while we use high-grade security, all digital systems carry inherent risk. Stake only what you can afford to lose.\n\nVI. PROHIBITED CONDUCT\nAny attempt to game the system via fake evidence results in immediate identity termination and total stake forfeiture.\n\nVII. PROTOCOL MODIFICATIONS\nTerms are subject to update via protocol governance; active citizens will be notified 48 hours before changes take effect.\n\nVIII. DISPUTE RESOLUTION\nAny legal disputes shall be resolved via binding arbitration under the laws of the Federal Republic of Nigeria.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">Terms</li>
                                
                                <li onClick={() => setShowModal({ 
                                    title: 'Privacy Protocol', 
                                    content: 'I. DATA MINIMIZATION\nWe only collect data that is strictly necessary for identity anchoring and mandate verification.\n\nII. EVIDENCE VISIBILITY\nYour photos and notes are only visible to you and your designated witnesses. We do not use them for training models.\n\nIII. THIRD-PARTY DISCLOSURE\nWe never sell citizen data. We only share hashes with licensed identity providers for KYC purposes.\n\nIV. COOKIE USAGE\nWe use zero tracking cookies. Our system only uses functional session tokens to keep you authenticated.\n\nV. RIGHT TO ERASURE\nYou can request total identity erasure once all active mandates are closed and capital is extracted.\n\nVI. DATA RETENTION\nForfeiture logs are kept for 2 years for auditing purposes before being scrubbed from the active ledger.\n\nVII. CROSS-BORDER TRANSFERS\nData is stored on encrypted servers that may reside outside your home jurisdiction, complying with global standards.\n\nVIII. BREACH NOTIFICATION\nIn the event of a data incident, all citizens will be notified via secure channels within 4 hours of discovery.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">Privacy</li>
                                
                                <li onClick={() => setShowModal({ 
                                    title: 'BVN Usage Policy', 
                                    content: 'I. IDENTITY VERIFICATION ONLY\nBVN data is used exclusively to verify that you are a real human and to prevent account duplication.\n\nII. NO RAW STORAGE\nWe do not store your 11-digit BVN. It is processed through a one-way cryptographic hash function.\n\nIII. COMPLIANCE STANDARDS\nOur verification protocol is fully compliant with the Nigerian Data Protection Act (NDPR).\n\nIV. SECURE INTERFACE\nBVN entry happens through a secure, isolated terminal that encrypts the input before it leaves your browser.\n\nV. ACCESS RESTRICTION\nNo employee or administrator of Lockedin has access to view or retrieve individual citizen hashes.\n\nVI. PURPOSE LIMITATION\nYour identity data is never used for credit scoring or external financial reporting.\n\nVII. SERVICE PROVIDERS\nVerification is facilitated by CBN-licensed third-party partners (e.g., Smile ID, Mono) under strict NDAs.\n\nVIII. TRANSPARENCY\nYou can view your identity anchoring status and hash metadata in your Citizen Settings at any time.' 
                                })} className="hover:text-blue-500 cursor-pointer transition-colors">BVN Data</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 pb-8 sm:pb-12">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-white/10 italic text-center md:text-left text-balance uppercase font-black">© 2025 LOCK-IN PROTOCOL BEHAVIORAL ENFORCEMENT. ALL RIGHTS RESERVED.</p>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="h-1.5 w-1.5 sm:h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/30 italic">System Operational</span>
                    </div>
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
}
