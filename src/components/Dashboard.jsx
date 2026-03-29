import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      fetchModules(data.hospital_id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchModules = async (hospitalId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/modules', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setModules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  if (loading) return <div className="p-8 text-center">Yüklənir...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">IPC Təlim Platformu</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {profile?.name} ({roleLabel(profile?.role)})
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Çıxış
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {error && (
          <p className="mb-4 text-red-600 text-sm">{error}</p>
        )}

        {/* Admin panel link */}
        {profile?.role === 'admin' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-700 font-medium">Admin paneli tezliklə əlavə ediləcək.</p>
          </div>
        )}

        {/* Modules list */}
        <h2 className="text-lg font-semibold mb-4">Təlim modulları</h2>

        {modules.length === 0 ? (
          <p className="text-gray-500">Hazırda heç bir modul mövcud deyil.</p>
        ) : (
          <div className="grid gap-4">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="bg-white rounded shadow p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium">{mod.title}</h3>
                  {mod.description && (
                    <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
                  )}
                </div>
                <button className="text-sm text-blue-600 hover:underline">
                  Başla
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function roleLabel(role) {
  switch (role) {
    case 'doctor': return 'Həkim';
    case 'nurse': return 'Tibb bacısı';
    case 'admin': return 'Admin';
    default: return role;
  }
}
