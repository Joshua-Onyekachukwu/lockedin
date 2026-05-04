import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { 
  Users, 
  Mail, 
  Calendar, 
  Download, 
  TrendingUp, 
  ShieldCheck,
  Search,
  MoreVertical
} from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: entries }: { data: any[] } = useSuspenseQuery(convexQuery(api.waitlist.list, {}));
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = (entries as any[]).filter(entry => 
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = () => {
    const csv = [
      ['Email', 'Joined At'],
      ...entries.map(e => [e.email, new Date(e._creationTime).toLocaleString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lockedin-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
      {/* Sidebar - Minimal */}
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-white/5 bg-[#0a0f1a] flex flex-col items-center py-8 gap-10">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold">L</div>
        <div className="flex flex-col gap-6">
          <div className="p-3 rounded-xl bg-white/5 text-blue-500"><TrendingUp size={20} /></div>
          <div className="p-3 rounded-xl text-white/20 hover:text-white transition-colors cursor-pointer"><Users size={20} /></div>
          <div className="p-3 rounded-xl text-white/20 hover:text-white transition-colors cursor-pointer"><Mail size={20} /></div>
        </div>
      </aside>

      <main className="pl-20">
        {/* Header */}
        <header className="border-b border-white/5 bg-[#050810]/50 backdrop-blur-xl px-8 py-6 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Founders Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">Growth Overview & Waitlist Management</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-all"
            >
              <Download size={16} /> Export CSV
            </button>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5">
              <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-[10px] font-black uppercase">F</div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-white/30">Total Signups</span>
                <Users size={18} className="text-blue-500" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold">{entries.length}</span>
                <span className="text-xs text-green-500 font-bold mb-1.5">+12% from yesterday</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-white/30">Conversion Rate</span>
                <TrendingUp size={18} className="text-[#ff7a00]" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold">18.4%</span>
                <span className="text-xs text-blue-400 font-bold mb-1.5">Top 5% of SaaS</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-white/30">System Status</span>
                <ShieldCheck size={18} className="text-green-500" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold">Stable</span>
                <span className="text-xs text-white/40 font-bold mb-1.5">Locked & Loaded</span>
              </div>
            </div>
          </div>

          {/* Waitlist Table */}
          <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a] overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="font-bold text-lg">Waitlist Entries</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="text" 
                  placeholder="Filter by email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-colors w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-widest text-white/20">
                    <th className="px-8 py-5 border-b border-white/5">Email Address</th>
                    <th className="px-8 py-5 border-b border-white/5">Joined Date</th>
                    <th className="px-8 py-5 border-b border-white/5 text-center">Status</th>
                    <th className="px-8 py-5 border-b border-white/5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry._id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                            <Mail size={14} />
                          </div>
                          <span className="font-medium">{entry.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 border-b border-white/5 text-white/40 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(entry._creationTime).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </td>
                      <td className="px-8 py-5 border-b border-white/5 text-center">
                        <span className="px-2 py-1 rounded-md bg-blue-600/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                          Waitlisted
                        </span>
                      </td>
                      <td className="px-8 py-5 border-b border-white/5 text-right">
                        <button className="p-2 text-white/20 hover:text-white transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-white/20 italic">
                        No entries found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-4 bg-white/[0.02] flex items-center justify-between text-xs text-white/30 font-medium">
              <span>Showing {filteredEntries.length} of {entries.length} members</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10">Prev</button>
                <button className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10">Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
