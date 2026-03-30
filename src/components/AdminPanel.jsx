import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Pencil, Trash2, Plus, UserCheck, BookOpen, Users } from 'lucide-react';

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [deletingModuleId, setDeletingModuleId] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [usersRes, modulesRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('modules').select('*').order('created_at', { ascending: false }),
    ]);
    if (!usersRes.error) setUsers(usersRes.data || []);
    if (!modulesRes.error) setModules(modulesRes.data || []);
    setLoading(false);
  };

  const updateStatus = async (userId, status) => {
    setActionLoading(userId + status);
    const { error } = await supabase.from('users').update({ status }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Bu istifadəçini silmək istədiyinizə əminsiniz?')) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (!error) setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleDeleteModule = async (id) => {
    if (!confirm('Bu modulu silmək istədiyinizə əminsiniz?')) return;
    setDeletingModuleId(id);
    const backup = modules.find(m => m.id === id);
    setModules(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
      setModules(prev => [...prev, backup].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      alert('Xəta baş verdi');
    }
    setDeletingModuleId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const pendingUsers  = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const filteredModules = modules.filter(m =>
    m.title.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  // Derive recent activities from most recently changed non-pending users
  const recentActivity = users
    .filter(u => u.status !== 'pending')
    .slice(0, 6)
    .map(u => ({
      type: u.status,
      label: u.status === 'approved'
        ? `${u.ad} ${u.soyad} təsdiqləndi`
        : `${u.ad} ${u.soyad} rədd edildi`,
      date: u.created_at,
    }));

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-400 mt-0.5">IPC Təlim Platformu</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#069494] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 font-medium">{user.email}</span>
              <span className="text-gray-400 text-xs ml-1">▼</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Dashboarda qayıt
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-600 transition-colors font-medium"
            >
              Çıxış
            </button>
          </div>
        </div>
      </header>

      {/* ── Dashboard grid ── */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* User status overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-base">⊙</span> Modulların İcmalı
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Gözləyan',      count: pendingUsers.length,  color: 'bg-orange-400' },
                { label: 'Təsdiqlanmiş', count: approvedUsers.length, color: 'bg-green-400'  },
                { label: 'Rədd edilmiş', count: rejectedUsers.length, color: 'bg-red-400'    },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.color} inline-block`} />
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-800">{loading ? '—' : s.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module management panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Modul İdarəetmə Paneli</h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
                placeholder="Modul axtar..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
              />
            </div>

            {/* Module list */}
            <div className="space-y-0.5 max-h-52 overflow-y-auto mb-4">
              {loading ? (
                <p className="text-xs text-gray-400 py-6 text-center">Yüklənir...</p>
              ) : filteredModules.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Heç bir modul tapılmadı</p>
              ) : (
                filteredModules.map(m => (
                  <div key={m.id} className="flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-gray-50 group transition-colors">
                    <span className="text-sm text-gray-700 flex-1 truncate">{m.title}</span>
                    <button
                      onClick={() => navigate(`/admin/modules/${m.id}`)}
                      className="p-1 rounded text-gray-300 hover:text-[#069494] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteModule(m.id)}
                      disabled={deletingModuleId === m.id}
                      className="p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin/modules')}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Bütün Modullara bax
              </button>
              <button
                onClick={() => navigate('/admin/modules')}
                className="flex-1 py-2 bg-[#069494] text-white rounded-xl text-xs font-bold hover:bg-[#057a7a] transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={13} /> Modul əlavə et
              </button>
            </div>
          </div>
        </div>

        {/* ── Middle column ── */}
        <div className="space-y-5">

          {/* User approval table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">İstifadəçi Təsdiqləmə Paneli</h2>

            {loading ? (
              <p className="text-xs text-gray-400 py-8 text-center">Yüklənir...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Heç bir istifadəçi yoxdur</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">İstifadəçi</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Tarix</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-2">
                        <p className="font-semibold text-gray-800 truncate max-w-[110px]">{u.ad} {u.soyad}</p>
                        <p className="text-gray-400 truncate max-w-[110px]">{u.email}</p>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={`font-semibold ${
                          u.status === 'pending'  ? 'text-orange-500' :
                          u.status === 'approved' ? 'text-green-600'  : 'text-red-500'
                        }`}>
                          {u.status === 'pending' ? 'Gözləyan' : u.status === 'approved' ? 'Təsdiqlənmiş' : 'Rədd edilmiş'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-gray-400 whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('az-AZ') : '—'}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {u.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(u.id, 'approved')}
                              disabled={!!actionLoading}
                              className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              ✓ Təsdiqlə
                            </button>
                          )}
                          {u.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(u.id, 'rejected')}
                              disabled={!!actionLoading}
                              className="px-2 py-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              ✗ Rədd et
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Tez Əməliyyatlar</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/admin/modules')}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-[#069494]/40 hover:bg-[#069494]/5 transition-colors text-left"
              >
                <BookOpen size={16} className="text-[#069494] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700">Yeni Modul Yarat</span>
              </button>
              <button
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-[#069494]/40 hover:bg-[#069494]/5 transition-colors text-left cursor-not-allowed opacity-60"
                disabled
              >
                <Users size={16} className="text-[#069494] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700">İstifadəçi Əlavə et</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>⊸</span> Son Fəaliyyətlər
            </h2>

            {loading ? (
              <p className="text-xs text-gray-400 py-8 text-center">Yüklənir...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Hələ heç bir fəaliyyət yoxdur</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      act.type === 'approved' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <UserCheck size={13} className={act.type === 'approved' ? 'text-green-600' : 'text-red-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium leading-snug">{act.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(act.date).toLocaleDateString('az-AZ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
