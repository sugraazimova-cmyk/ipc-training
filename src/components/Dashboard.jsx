import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, BookOpen, Calendar, Award, Settings,
  LogOut, Bell, Search, ChevronRight, CheckCircle2, Clock, Star
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
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="#3b82f6" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

export default function Dashboard({ user }) {
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

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex">

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-60 min-h-screen bg-white flex flex-col py-6 px-4 shadow-sm fixed left-0 top-0 bottom-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">IPC</span>
          </div>
          <span className="font-bold text-gray-800 text-lg">IPC Təlim</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ icon: Icon, label, key }) => (
            <button
              key={key}
              onClick={() => setActiveNav(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeNav === key
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Çıxış
        </button>
      </aside>

      {/* ── Page ────────────────────────────────────── */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Əsas Səhifə</h1>
            <p className="text-xs text-gray-400 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Axtar..."
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-blue-300 w-44"
              />
            </div>
            <button className="p-2 rounded-xl hover:bg-gray-50 relative">
              <Bell size={20} className="text-gray-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 flex gap-6">

          {/* ── Center ────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Welcome banner */}
            <div className="relative bg-blue-600 rounded-2xl p-7 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-400" />
              <div className="absolute -right-6 -top-6 w-48 h-48 bg-white/10 rounded-full" />
              <div className="absolute -right-2 bottom-0 w-32 h-32 bg-white/5 rounded-full" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Salam, {profile?.ad || 'Həkim'}!
                  </h2>
                  <p className="text-blue-100 text-sm mb-5 max-w-xs">
                    Təlim modullarını tamamlayaraq peşəkar biliklərinizi artırın.
                  </p>
                  <button className="bg-white text-blue-600 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                    Modullara bax
                  </button>
                </div>
                <div className="hidden md:flex w-28 h-28 bg-blue-500/40 rounded-2xl items-center justify-center">
                  <BookOpen size={48} className="text-white/70" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BookOpen,     label: 'Aktiv Modullar', value: modules.length - completed, color: 'text-blue-600',   bg: 'bg-blue-50' },
                { icon: CheckCircle2, label: 'Tamamlanan',     value: completed,                  color: 'text-green-600',  bg: 'bg-green-50' },
                { icon: Star,         label: 'Ümumi Bal',      value: completed * 10,             color: 'text-yellow-500', bg: 'bg-yellow-50' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={20} className={color} />
                  </div>
                  <p className="text-gray-400 text-xs mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                </div>
              ))}
            </div>

            {/* Modules list */}
            <div className="bg-white rounded-2xl shadow-sm p-6 flex-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800">Təlim Modulları</h3>
              </div>

              {modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <BookOpen size={28} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Hazırda heç bir modul mövcud deyil.</p>
                  <p className="text-gray-300 text-xs mt-1">Modullar tezliklə əlavə ediləcək.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {modules.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <BookOpen size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{mod.title}</p>
                          {mod.description && (
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{mod.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          mod.completed
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {mod.completed ? 'Tamamlandı' : 'Davam edir'}
                        </span>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ───────────────────────── */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-5">

            {/* Profile card */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {profile?.ad?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {profile?.ad} {profile?.soyad}
                  </p>
                  <p className="text-gray-400 text-xs">{profile?.ohdelik}</p>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'İxtisas',   value: profile?.ixtisas },
                  { label: 'Vəzifə',    value: profile?.vezife },
                  { label: 'Xəstəxana', value: profile?.hospital_name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-gray-700 font-medium text-right line-clamp-1">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress ring */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h4 className="font-semibold text-gray-800 text-sm mb-4">Ümumi İrəliləyiş</h4>
              <div className="flex items-center justify-center relative mb-4">
                <CircularProgress percentage={progress} size={120} strokeWidth={10} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{progress}%</span>
                  <span className="text-xs text-gray-400">Tamamlandı</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{completed} tamamlandı</span>
                <span>{modules.length} modul</span>
              </div>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">Məlumat</h4>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">
                  Yeni modullar əlavə edildikdə bildiriş alacaqsınız.
                </span>
              </div>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
}
