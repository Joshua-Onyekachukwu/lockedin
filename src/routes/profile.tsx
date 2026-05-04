import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  User, 
  MapPin, 
  Camera, 
  ShieldCheck, 
  Globe, 
  ArrowLeft,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/profile')({
  component: ProfileSettings,
});

function ProfileSettings() {
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}));
  const updateProfile = useMutation(api.users.updateProfile);
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
    is_discoverable: user?.is_discoverable ?? true,
    witness_discoverable: user?.witness_discoverable ?? true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      navigate({ to: '/dashboard' });
    } catch (err) {
      console.error(err);
      alert("Failed to update profile protocol.");
    } finally {
      setIsSaving(false);
    }
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
      </nav>

      <main className="max-w-3xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <form onSubmit={handleSave} className="space-y-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative h-32 w-32 rounded-[3rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl">
                <div className="h-full w-full rounded-[3rem] bg-[#0a0f1a] flex items-center justify-center font-black text-4xl text-white uppercase italic">
                  {user?.name?.[0] || <User size={40} />}
                </div>
                <button type="button" className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-[#050810]">
                  <Camera size={18} />
                </button>
              </div>
            </div>
            <h2 className="mt-8 text-3xl font-black italic uppercase tracking-tight">{user?.name}</h2>
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
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg focus:border-blue-500 transition-all placeholder:text-white/5 font-black uppercase italic tracking-widest text-white shadow-inner"
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
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg focus:border-blue-500 transition-all placeholder:text-white/10 font-black uppercase italic tracking-widest text-white shadow-inner"
                />
                <MapPin className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Behavioral Mandate (Bio)</label>
              <textarea 
                value={formData.bio}
                placeholder="Describe your commitment protocol..."
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] px-8 py-8 text-lg focus:border-blue-500 transition-all h-40 resize-none placeholder:text-white/10 font-medium italic text-white shadow-inner"
              />
            </div>

            {/* Visibility Protocols */}
            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Privacy Protocols</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={() => setFormData({...formData, is_discoverable: !formData.is_discoverable})}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left group relative overflow-hidden ${formData.is_discoverable ? 'bg-blue-600/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${formData.is_discoverable ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-900/40' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                {formData.is_discoverable ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                            <p className={`font-black italic uppercase text-xs tracking-tight ${formData.is_discoverable ? 'text-white' : 'text-white/20'}`}>Community Feed</p>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold italic uppercase leading-relaxed font-black">
                            {formData.is_discoverable ? 'Mandates are visible in the Community Hub.' : 'Mandates are private and hidden from public feeds.'}
                        </p>
                    </button>

                    <button 
                        type="button"
                        onClick={() => setFormData({...formData, witness_discoverable: !formData.witness_discoverable})}
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

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-4 rounded-3xl bg-white text-black py-6 font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.05)] text-xs italic"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Synchronize Identity</>}
          </button>
        </form>
      </main>

      <footer className="py-20 text-center opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic font-black">Secure Identity Synchronization Module v2.0.4</p>
      </footer>
    </div>
  );
}
