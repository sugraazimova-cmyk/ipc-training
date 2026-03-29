import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, BookOpen, Calendar, Award, Settings,
  LogOut, Bell, Search, ChevronRight, CheckCircle2, Clock, Star, ShieldCheck
} from 'lucide-react';
import AdminPanel from './AdminPanel';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Əsas Səhifə', key: 'dashboard' },
  { icon: BookOpen,        label: 'Modullar',    key: 'modules' },
  { icon: Calendar,        label: 'Cədvəl',      key: 'schedule' },
  { icon: Award,           label: 'Sertifikatlar', key: 'certificates' },
  { icon: Settings,        label: 'Parametrlər', key: 'settings' },
];

function CircularProgress({ percentage, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#069494" strokeOpacity="0.15" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="#069494" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

export default function Dashboard({ user, isAdmin }) {
  const [profile, setProfile]   = useState(null);
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);
      await fetchModules();
    } catch {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data } = await supabase.from('modules').select('*');
      setModules(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const completed = modules.filter(m => m.completed).length;
  const progress  = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0;

  const today = new Date().toLocaleDateString('az-AZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  if (activeNav === 'admin') return <AdminPanel user={user} onBack={() => setActiveNav('dashboard')} />;

  return (
    <div className="min-h-screen flex relative font-sans text-gray-800">
      {/* Background & Glass Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="/background.png" alt="background" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/85 backdrop-blur-md" />
      </div>

      {/* Main Framework */}
      <div className="relative z-10 flex w-full">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="w-64 min-h-screen bg-white/60 backdrop-blur-xl border-r border-white/40 flex flex-col py-8 px-5 shadow-[4px_0_24px_rgba(0,0,0,0.02)] fixed left-0 top-0 bottom-0 z-20">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#069494] flex items-center justify-center shadow-lg shadow-[#069494]/30">
              <span className="text-white text-sm font-bold">IPC</span>
            </div>
            <span className="font-bold text-gray-800 text-xl">IPC Təlim</span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2 flex-1">
            {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
              const isActive = activeNav === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveNav(key)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white shadow-[0_4px_20px_rgba(6,148,148,0.12)] border border-[#069494]/30 text-[#069494]'
                      : 'text-gray-500 hover:bg-white/50 hover:text-[#069494] border border-transparent'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#069494]' : 'text-gray-400'} />
                  {label}
                </button>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => setActiveNav('admin')}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors text-purple-600 hover:bg-white/50 border border-transparent hover:border-purple-200 mt-2"
              >
                <ShieldCheck size={20} className="text-purple-400" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all border border-transparent"
          >
            <LogOut size={20} className="text-gray-400" />
            Çıxış
          </button>
        </aside>

        {/* ── Page Content ────────────────────────────── */}
        <div className="ml-64 flex-1 flex flex-col min-h-screen">
          
          {/* Top bar */}
          <header className="px-10 py-8 flex items-end justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-4xl font-extrabold text-[#069494] mb-1">Əsas Səhifə</h1>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{today}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Axtar..."
                  className="pl-11 pr-4 py-2.5 bg-white/70 backdrop-blur-md border border-[#069494]/20 rounded-full text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#069494]/50 focus:bg-white transition-all w-60 shadow-sm"
                />
              </div>
              <button className="p-2.5 rounded-full bg-white/70 backdrop-blur-md border border-[#069494]/20 text-gray-500 hover:text-[#069494] hover:bg-white transition-all shadow-sm">
                <Bell size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 px-10 pb-10 flex gap-8">
            
            {/* ── Center ────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              
              {/* Welcome banner */}
              <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] p-8 border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Salam, {profile?.ad || 'Həkim'}!
                  </h2>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm font-medium">
                    Təlim modullarını tamamlayaraq peşəkar biliklərinizi artırın.
                  </p>
                  <button className="bg-[#069494] text-white text-sm font-bold px-8 py-3.5 rounded-2xl hover:bg-[#057a7a] transition-all shadow-lg shadow-[#069494]/30">
                    Modullara bax
                  </button>
                </div>
                <div className="hidden md:flex w-24 h-24 border-2 border-[#069494]/20 rounded-3xl items-center justify-center rotate-6 opacity-80">
                  <BookOpen size={48} className="text-[#069494]" />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { icon: BookOpen,     label: 'Aktiv Modullar', value: modules.length - completed },
                  { icon: CheckCircle2, label: 'Tamamlanan',     value: completed },
                  { icon: Star,         label: 'Ümumi Bal',      value: completed * 10 },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/90 backdrop-blur-lg rounded-[2rem] p-6 border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
                    <div className="w-12 h-12 bg-[#069494] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-[#069494]/30">
                      <Icon size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium text-sm mb-1">{label}</p>
                      <p className="text-3xl font-extrabold text-gray-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modules list */}
              <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-[#069494]/10 pb-4">
                  <h3 className="text-lg font-bold text-[#069494]">Təlim Modulları</h3>
                </div>

                {modules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                    <div className="w-20 h-20 bg-[#069494]/5 rounded-3xl flex items-center justify-center mb-5 border border-[#069494]/10">
                      <BookOpen size={32} className="text-[#069494]/40" />
                    </div>
                    <p className="text-gray-500 text-sm font-semibold">Hazırda heç bir modul mövcud deyil.</p>
                    <p className="text-gray-400 text-xs mt-1">Modullar tezliklə əlavə ediləcək.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {modules.map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-5 bg-white border border-[#069494]/10 rounded-2xl hover:border-[#069494]/30 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#069494]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#069494] transition-colors">
                            <BookOpen size={20} className="text-[#069494] group-hover:text-white transition-colors" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{mod.title}</p>
                            {mod.description && (
                              <p className="text-gray-500 font-medium text-xs mt-1 line-clamp-1">{mod.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-4">
                          <span className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold ${
                            mod.completed
                              ? 'bg-[#069494]/10 text-[#069494]'
                              : 'bg-orange-50 text-orange-500'
                          }`}>
                            {mod.completed ? 'Tamamlandı' : 'Davam edir'}
                          </span>
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-[#069494] transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right panel ───────────────────────── */}
            <aside className="w-[320px] flex-shrink-0 flex flex-col gap-6">
              
              {/* Profile card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#069494]/10">
                  <div className="w-14 h-14 rounded-full bg-[#069494] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#069494]/30">
                    <span className="text-white font-black text-xl">
                      {profile?.ad?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-base truncate">
                      {profile?.ad} {profile?.soyad}
                    </p>
                    <p className="text-gray-500 font-medium text-xs mt-0.5">{profile?.ohdelik}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'İxtisas',   value: profile?.ixtisas },
                    { label: 'Vəzifə',    value: profile?.vezife },
                    { label: 'Xəstəxana', value: profile?.hospital_name },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-4 text-sm font-medium">
                      <span className="text-gray-400 flex-shrink-0">{label}</span>
                      <span className="text-gray-800 text-right">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress ring */}
              <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex flex-col items-center">
                <h4 className="font-bold text-gray-800 w-full text-left mb-6">Ümumi İrəliləyiş</h4>
                <div className="flex items-center justify-center relative mb-6">
                  {/* Subtle outer glow drop shadow behind SVG */}
                  <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(6,148,148,0.3)]"></div>
                  <div className="relative bg-white rounded-full">
                    <CircularProgress percentage={progress} size={140} strokeWidth={12} />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-[#069494]">{progress}%</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Tamamlandı</span>
                  </div>
                </div>
                <div className="flex justify-between w-full text-sm font-medium text-gray-500 bg-[#069494]/5 rounded-xl p-3 border border-[#069494]/10">
                  <span className="text-[#069494]">{completed} tamamlandı</span>
                  <span>{modules.length} modul</span>
                </div>
              </div>

              {/* Info card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-[2rem] border border-[#069494]/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
                <h4 className="font-bold text-gray-800 mb-3">Məlumat</h4>
                <div className="flex items-start gap-3 text-sm font-medium text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <Clock size={18} className="text-[#069494] mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">
                    Yeni modullar əlavə edildikdə bildiriş alacaqsınız.
                  </span>
                </div>
              </div>

            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}
