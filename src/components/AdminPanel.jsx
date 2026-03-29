import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const updateStatus = async (userId, status) => {
    setActionLoading(userId + status);
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    }
    setActionLoading(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const displayUsers = tab === 'pending' ? pendingUsers
    : tab === 'approved' ? approvedUsers
    : rejectedUsers;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-white/40">IPC Təlim Platformu</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">{user.email}</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Dashboarda qayıt
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Çıxış
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-white/50 text-sm mb-1">Gözləyən</p>
            <p className="text-3xl font-bold text-yellow-400">{pendingUsers.length}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-white/50 text-sm mb-1">Təsdiqlənmiş</p>
            <p className="text-3xl font-bold text-green-400">{approvedUsers.length}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-5">
            <p className="text-white/50 text-sm mb-1">Rədd edilmiş</p>
            <p className="text-3xl font-bold text-red-400">{rejectedUsers.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'pending', label: 'Gözləyənlər', count: pendingUsers.length },
            { key: 'approved', label: 'Təsdiqlənmişlər', count: approvedUsers.length },
            { key: 'rejected', label: 'Rədd edilmişlər', count: rejectedUsers.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-900 text-white/50 hover:text-white border border-white/10'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-white/50">Yüklənir...</p>
        ) : displayUsers.length === 0 ? (
          <div className="bg-gray-900 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/40">Heç bir istifadəçi tapılmadı.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left py-4 px-4">Ad / Soyad / Ata adı</th>
                    <th className="text-left py-4 px-4">E-poçt</th>
                    <th className="text-left py-4 px-4">Xəstəxana</th>
                    <th className="text-left py-4 px-4">İxtisas</th>
                    <th className="text-left py-4 px-4">Öhdəlik</th>
                    <th className="text-left py-4 px-4">Vəzifə</th>
                    <th className="text-left py-4 px-4">Tarix</th>
                    <th className="text-left py-4 px-4">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-medium text-white">{u.ad} {u.soyad}</p>
                        <p className="text-white/40 text-xs">{u.ata_adi}</p>
                      </td>
                      <td className="py-4 px-4 text-white/70">{u.email}</td>
                      <td className="py-4 px-4 text-white/70 max-w-[160px]">
                        <span className="line-clamp-2">{u.hospital_name}</span>
                      </td>
                      <td className="py-4 px-4 text-white/70">{u.ixtisas}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.ohdelik === 'İPİN həkimi'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {u.ohdelik}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white/70">{u.vezife}</td>
                      <td className="py-4 px-4 text-white/40 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('az-AZ') : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {u.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(u.id, 'approved')}
                              disabled={actionLoading === u.id + 'approved'}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs font-medium transition-colors"
                            >
                              Təsdiqlə
                            </button>
                          )}
                          {u.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(u.id, 'rejected')}
                              disabled={actionLoading === u.id + 'rejected'}
                              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 rounded text-xs font-medium transition-colors"
                            >
                              Rədd et
                            </button>
                          )}
                          {u.status !== 'pending' && (
                            <button
                              onClick={() => updateStatus(u.id, 'pending')}
                              disabled={actionLoading === u.id + 'pending'}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs font-medium transition-colors"
                            >
                              Gözləməyə al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
