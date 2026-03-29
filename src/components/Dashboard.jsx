import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, BookOpen, Calendar, Award, Settings,
  LogOut, Bell, Search, ChevronRight, CheckCircle2, Clock, Star, ShieldCheck
} from 'lucide-react';

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
  const navigate = useNavigate();
  const [profile, setProfile]     = useState(null);
  const [modules, setModules]     = useState([]);
  const [loading, setLoading]     = useState(true);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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

  return (
    <div className="min-h-screen flex relative font-sans text-gray-800 overflow-hidden bg-[#e0f2f1]/30">
      {/* Background & Glass Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="/background.png" alt="background" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]" />
      </div>

      {/* Main Framework */}
      <div className="relative z-10 flex w-full">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="w-[280px] min-h-screen bg-white border-r border-gray-100 flex flex-col py-8 px-6 shadow-[8px_0_30px_rgba(0,0,0,0.03)] fixed left-0 top-0 bottom-0 z-20">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#069494] flex items-center justify-center shadow-lg shadow-[#069494]/30">
              <span className="text-white text-sm font-bold">IPC</span>
            </div>
            <span className="font-bold text-gray-800 text-xl">IPC Təlim</span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-3 flex-1">
            {NAV_ITEMS.map(({ icon: Icon, label, key }) => {
              const isActive = activeNav === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveNav(key)}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white border-2 border-[#069494]/60 text-[#069494] shadow-[0_4px_15px_rgba(6,148,148,0.1)]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-[#069494] border-2 border-transparent'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#069494]' : 'text-gray-400'} />
                  {label}
                </button>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-4 px-5 py-3.5 rounded-full text-sm font-semibold transition-colors text-purple-600 hover:bg-purple-50 border-2 border-transparent hover:border-purple-200 mt-4"
              >
                <ShieldCheck size={20} className="text-purple-400" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3.5 rounded-full text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all border-2 border-transparent"
          >
            <LogOut size={20} className="text-gray-400" />
            Çıxış
          </button>
        </aside>

        {/* ── Page Content ────────────────────────────── */}
        <div className="ml-[280px] flex-1 flex flex-col min-h-screen">
          
          {/* Top bar */}
          <header className="px-10 py-10 flex items-end justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-4xl font-extrabold text-[#069494] tracking-tight mb-2">Əsas Səhifə</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{today}</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  placeholder="Axtar..."
                  className="pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-full text-sm font-semibold text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#069494]/50 focus:bg-white transition-all w-64 shadow-sm"
                />
              </div>
              <button className="p-3 rounded-full bg-white border-2 border-gray-100 text-gray-400 hover:text-[#069494] hover:border-[#069494]/30 transition-all shadow-sm">
                <Bell size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 px-10 pb-10 flex gap-8">
            
            {/* ── Center ────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              
              {/* Welcome banner */}
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] p-8 border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] relative overflow-hidden flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#069494] tracking-tight mb-2">
                    Salam, {profile?.ad || 'Həkim'}!
                  </h2>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm font-medium leading-relaxed">
                    Təlim modullarını tamamlayaraq peşəkar biliklərinizi artırın.
                  </p>
                  <button className="bg-[#069494] text-white text-sm font-bold px-8 py-3 rounded-2xl hover:bg-[#057a7a] transition-all shadow-lg shadow-[#069494]/30">
                    Modullara bax
                  </button>
                </div>
                <div className="hidden md:flex w-24 h-24 bg-white border-2 border-[#069494]/20 rounded-3xl items-center justify-center -rotate-6 shadow-sm">
                  <BookOpen size={40} className="text-[#069494]/80" />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { icon: BookOpen,     label: 'Aktiv Modullar', value: modules.length - completed },
                  { icon: CheckCircle2, label: 'Tamamlanan',     value: completed },
                  { icon: Star,         label: 'Ümumi Bal',      value: completed * 10 },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/80 backdrop-blur-md rounded-[1.5rem] p-6 border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] flex flex-col justify-between">
                    <div className="w-10 h-10 border-2 border-[#069494]/30 bg-white rounded-xl flex items-center justify-center mb-6">
                      <Icon size={20} className="text-[#069494]" />
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold text-xs mb-2 uppercase tracking-wide">{label}</p>
                      <p className="text-3xl font-black text-gray-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modules list */}
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-dashed border-[#069494]/10">
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
                        onClick={() => navigate(`/module/${mod.id}`)}
                        className="flex items-center justify-between p-5 bg-white border-2 border-[#069494]/10 rounded-[1rem] hover:border-[#069494]/40 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white border-2 border-[#069494]/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:border-[#069494] transition-colors">
                            <BookOpen size={20} className="text-[#069494] transition-colors" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{mod.title}</p>
                            {mod.description && (
                              <p className="text-gray-500 font-medium text-xs mt-1 line-clamp-1">{mod.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-4">
                          <span className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold border-2 ${
                            mod.completed
                              ? 'bg-[#069494]/10 text-[#069494] border-[#069494]/20'
                              : 'bg-orange-50 text-orange-500 border-orange-200'
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
            <aside className="w-[340px] flex-shrink-0 flex flex-col gap-6">
              
              {/* Profile card */}
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] py-8 px-6">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b-2 border-dashed border-[#069494]/10">
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
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] py-8 px-6 flex flex-col items-center">
                <h4 className="font-extrabold text-gray-800 w-full text-left mb-6">Ümumi İrəliləyiş</h4>
                <div className="flex items-center justify-center relative mb-6">
                  {/* Outer ring */}
                  <div className="absolute inset-0 border-[8px] border-white rounded-full shadow-sm z-10 pointer-events-none"></div>
                  <div className="relative bg-white rounded-full p-2 border border-[#069494]/10">
                    <CircularProgress percentage={progress} size={140} strokeWidth={14} />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 mt-1">
                    <span className="text-3xl font-black text-[#069494] -mb-1">{progress}%</span>
                    <span className="text-[10px] font-bold text-gray-400">Tamamlandı</span>
                  </div>
                </div>
                <div className="flex justify-between w-full text-xs font-bold text-gray-500 px-2 mt-2">
                  <span>{completed} tamamlandı</span>
                  <span>{modules.length} modul</span>
                </div>
              </div>

              {/* Info card */}
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] border-2 border-[#069494]/30 shadow-[0_8px_30px_rgba(6,148,148,0.06)] p-6">
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
