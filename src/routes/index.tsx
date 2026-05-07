import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { 
  Shield, 
  Target, 
  Zap, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Menu,
  X,
  UserCheck,
  ShieldCheck,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState<{ title: string; content: string } | null>(null);

  const joinWaitlist = useMutation(api.waitlist.join);
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setIsSubmitting(true);
    try {
      await joinWaitlist({ email: waitlistEmail });
      setShowSuccess(true);
      setWaitlistEmail('');
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { name: 'Architecture', href: '#protocol' },
    { name: 'Workflow', href: '#workflow' },
    { name: 'Governance', href: '#governance' },
  ];

  const Modal = ({ title, content, onClose }: { title: string; content: string; onClose: () => void }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020408]/90 backdrop-blur-2xl p-6"
    >
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-[3rem] p-12 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
        >
            <button onClick={onClose} className="absolute right-10 top-10 p-3 rounded-full bg-white/5 text-white/20 hover:text-white transition-all"><X size={20} /></button>
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-8">{title}</h3>
            <div className="text-white/40 font-medium italic uppercase text-sm leading-relaxed space-y-4 text-left">
                {content.split('\n').map((para, i) => <p key={i}>{para}</p>)}
            </div>
        </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#050810] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      <AnimatePresence>
        {showModal && (
            <Modal title={showModal.title} content={showModal.content} onClose={() => setShowModal(null)} />
        )}
      </AnimatePresence>

      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 py-6 ${scrolled ? 'bg-[#050810]/80 backdrop-blur-2xl border-b border-white/5 py-4' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xl italic text-lg shadow-blue-900/40">L</div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">Lockedin</span>
          </div>

          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all italic"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <Link 
              to={isAuthenticated ? "/dashboard" : "/login"} 
              className="px-8 py-3 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-105 active:scale-95 transition-all italic"
            >
              {isAuthenticated ? "Terminal" : "Initialize Identity"}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-3 rounded-xl bg-white/5 text-white"><Menu size={20} /></button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-50 bg-[#050810] p-12 md:hidden"
          >
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-10 right-10 p-3 rounded-full bg-white/5 text-white"><X size={24} /></button>
            <div className="flex flex-col gap-12 mt-20">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-4xl font-black uppercase italic tracking-tighter text-white/40 hover:text-white">{link.name}</a>
              ))}
              <Link to="/login" className="text-4xl font-black uppercase italic tracking-tighter text-blue-500">Access Protocol</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* Hero Section */}
        <section className="relative pt-60 pb-40 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 italic shadow-2xl">
                <Shield size={14} /> Zero-Trust Behavioral Escrow
              </div>
              <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter mb-10 leading-[0.85] text-white">
                Don't Trust <br /> <span className="text-blue-500">Your Willpower.</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/40 max-w-2xl mx-auto font-medium italic uppercase tracking-tight mb-16 leading-tight font-black">
                Escrow your capital. Define your mandate. Face the pain if you fail. Lockedin is the institutional-grade enforcer of your highest ambitions.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link to="/login" className="px-12 py-6 rounded-[2rem] bg-white text-black font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all italic">
                   Initiate Mandate
                </Link>
                <a href="#protocol" className="px-12 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all italic">
                   Review Architecture
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section className="py-20 px-6 relative bg-[#020408]">
            <div className="max-w-4xl mx-auto rounded-[4rem] border border-white/5 bg-[#0a0f1a] p-12 md:p-24 relative overflow-hidden shadow-2xl group">
                <div className="absolute -right-20 -top-20 h-80 w-80 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-600/20 transition-all duration-1000" />
                <div className="relative z-10 text-center">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-none">The Waitlist.</h2>
                    <p className="text-white/40 font-bold italic uppercase text-sm leading-relaxed max-w-lg mx-auto mb-12">
                        Institutional access is limited. Join the waitlist to receive your activation protocol and enter the behavioral enclave.
                    </p>
                    
                    <form onSubmit={handleWaitlist} className="flex flex-col md:flex-row gap-4">
                        <input 
                            required
                            type="email" 
                            placeholder="OPERATIONAL_EMAIL@PROTOCOL.IO" 
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-3xl px-8 py-6 outline-none focus:border-blue-500 transition-all font-bold italic text-white placeholder:text-white/10"
                        />
                        <button 
                            disabled={isSubmitting}
                            className="px-10 py-6 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 italic disabled:opacity-50"
                        >
                            {isSubmitting ? 'PROCESSING...' : 'ANCHOR IDENTITY'}
                        </button>
                    </form>

                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 text-green-500 font-black uppercase text-[10px] tracking-[0.4em] italic">
                                IDENTITY ANCHORED. WE WILL REACH OUT VIA YOUR SECURE EMAIL SOON.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>

        {/* Feature Grid */}
        <section id="protocol" className="py-40 px-6 relative">
          <div className="max-w-7xl mx-auto">
                <div className="text-left mb-24">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-6 italic">Enforcement Mechanisms</p>
                    <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-none">The Architecture.</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-12 flex flex-col justify-between group shadow-2xl">
                        <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-10 border border-blue-500/20 shadow-xl">
                            <Lock size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Escrowed Stakes.</h2>
                            <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                                Your capital is locked in a non-custodial behavioral vault. Access is restricted until the mandate is either fulfilled or breached. Zero human intervention.
                            </p>
                        </div>
                    </div>
                    <div className="lg:col-span-4 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-12 flex flex-col justify-between group">
                        <div className="h-14 w-14 rounded-2xl bg-[#ff7a00]/10 flex items-center justify-center text-[#ff7a00] mb-10 border border-[#ff7a00]/20 shadow-xl">
                            <Zap size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">The Protocol Store.</h2>
                            <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                                Maintain your integrity. Earn Protocol Credits for every successful log, and spend them in the store to acquire Shields that protect your stake from accidental breaches.
                            </p>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-4 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.02] p-12 group">
                        <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-10 border border-green-500/20 shadow-xl">
                            <Users size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">P2P Oversight.</h2>
                            <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                                Select accountability witnesses to verify your execution. If they detect a breach, the forfeiture protocol initializes instantly.
                            </p>
                        </div>
                    </div>
                    <div className="lg:col-span-8 relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-12 flex flex-col justify-between group shadow-2xl">
                        <div className="h-14 w-14 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-500 mb-10 border border-purple-500/20 shadow-xl">
                            <Activity size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Integrity Scoring.</h2>
                            <p className="text-white/40 font-medium italic uppercase text-sm leading-relaxed font-black">
                                Your behavioral credit score is live. Every completed mandate increases your integrity; every breach liquidates it. Your identity is your collateral.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-0" />
        </section>

        {/* Execution Workflow Section */}
        <section id="workflow" className="py-40 px-6 relative border-t border-white/5 bg-[#050810]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-24">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-6 italic">Operational Workflow</p>
                    <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-none">Execute & Log.</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 text-left">
                        <div className="text-blue-500 font-black italic text-4xl mb-8">01</div>
                        <h4 className="text-xl font-black italic uppercase text-white mb-6">Anchor Identity</h4>
                        <p className="text-white/30 text-sm font-medium italic uppercase leading-relaxed font-black">
                            Initialize your behavioral contract. Stake capital and define your specific mandate. Your principal is now locked in escrow.
                        </p>
                    </div>
                    
                    <div className="p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 text-left relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-blue-500 font-black italic text-4xl mb-8">02</div>
                        <h4 className="text-xl font-black italic uppercase text-white mb-6">Log Evidence</h4>
                        <p className="text-white/30 text-sm font-medium italic uppercase leading-relaxed font-black">
                            Daily adherence is mandatory. Upload photo or video proof directly to your dashboard. This becomes your behavioral ledger.
                        </p>
                    </div>
                    
                    <div className="p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 text-left">
                        <div className="text-blue-500 font-black italic text-4xl mb-8">03</div>
                        <h4 className="text-xl font-black italic uppercase text-white mb-6">Verify & Protect</h4>
                        <p className="text-white/30 text-sm font-medium italic uppercase leading-relaxed font-black">
                            Your witnesses review the evidence. Successfully completed mandates earn credits and shields to protect your future capital.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Protocol Economics Section */}
        <section id="governance" className="py-40 px-6 relative bg-[#020408]">
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
                                    <p className="text-4xl font-black text-white italic mb-2">Protocol</p>
                                    <p className="text-[10px] uppercase tracking-widest text-blue-500 font-black italic">Network Stability</p>
                                    <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">Forfeited capital is utilized to ensure the long-term stability and security of the behavioral enclave. This ensures the protocol remains absolute and unyielding.</p>
                                </div>
                                
                                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <p className="text-4xl font-black text-white italic mb-2">Rewards</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-black italic">Behavioral Credits</p>
                                    <p className="text-xs text-white/30 mt-4 leading-relaxed font-medium italic">Maintain your streak. Earn non-monetary Protocol Credits for every successful log to unlock protective Shields and elite status.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-left space-y-10 order-1 lg:order-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 italic">Financial Governance</p>
                        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-white leading-none">
                            Discipline is <br /> <span className="text-blue-500">Non-Negotiable.</span>
                        </h2>
                        <p className="text-xl text-white/40 leading-relaxed font-medium italic uppercase tracking-tight max-w-lg">
                            We remove the option to quit by making it economically painful. When you stake capital, you aren't just making a promise, you're signing a behavioral contract with the protocol.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white font-black italic uppercase text-xs tracking-widest">
                                    <CheckCircle2 size={16} className="text-green-500" /> Automated Enforcement
                                </div>
                                <p className="text-[10px] text-white/20 italic font-black uppercase ml-7">Zero-human intervention</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-white font-black italic uppercase text-xs tracking-widest">
                                    <CheckCircle2 size={16} className="text-green-500" /> Protocol Protection
                                </div>
                                <p className="text-[10px] text-white/20 italic font-black uppercase ml-7">Shields against breaches</p>
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
                                <li onClick={() => setShowModal({ title: 'Architecture', content: 'Our architecture is built on top of a non-custodial behavioral engine.\nAll capital is escrowed using institutional-grade security protocols.\nZero human intervention ensures that enforcement is absolute.' })} className="hover:text-blue-500 cursor-pointer transition-colors">Architecture</li>
                                <li onClick={() => setShowModal({ title: 'Security', content: 'Security is anchored at the identity level.\nBVN verification ensures a 1:1 ratio between citizen and account.\nMulti-sig escrow patterns protect your principal from unauthorized extraction.' })} className="hover:text-blue-500 cursor-pointer transition-colors">Security</li>
                                <li onClick={() => setShowModal({ title: 'API Docs', content: 'The Lockedin API allows for automated mandate creation and logging.\nDevelopers can build third-party verification tools on top of the protocol.\nDocumentation is currently restricted to active citizens.' })} className="hover:text-blue-500 cursor-pointer transition-colors">API Docs</li>
                            </ul>
                        </div>
                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic font-black">Legal</h4>
                            <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-white/60 font-black">
                                <li onClick={() => setShowModal({ title: 'Terms', content: 'By initiating a mandate, you agree to the behavioral contract.\nForfeiture of capital in the event of a breach is non-negotiable.\nProtocol Credits have no monetary value.' })} className="hover:text-blue-500 cursor-pointer transition-colors">Terms</li>
                                <li onClick={() => setShowModal({ title: 'Privacy', content: 'Your data is anchored to your identity but shielded from the public.\nOnly mandated witnesses can review your execution logs.\nZero data is sold to third parties.' })} className="hover:text-blue-500 cursor-pointer transition-colors">Privacy</li>
                                <li onClick={() => setShowModal({ title: 'BVN Data', content: 'BVN data is used exclusively for identity anchoring.\nIt prevents sybil attacks and ensures behavioral integrity.\nWe never store your full BVN; only a secure identity hash.' })} className="hover:text-blue-500 cursor-pointer transition-colors">BVN Data</li>
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
