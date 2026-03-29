import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlassCard } from './ui/gaming-login';

export default function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // Check approval status
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) throw new Error('İstifadəçi profili tapılmadı.');
      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error('Hesabınız hələ admin tərəfindən təsdiqlənməyib.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8 text-center px-2">
        <div className="text-xl font-bold text-white mb-2 leading-snug">İnfeksiyaların profilaktikası və infeksion nəzarət üzrə təlim portalı</div>
        <div className="text-white text-sm">Hesabınıza daxil olun</div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <Mail size={17} />
          </div>
          <input
            type="email"
            placeholder="E-poçt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#069494]/80 transition-colors text-sm"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <Lock size={17} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Şifrə"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#069494]/80 transition-colors text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#069494] hover:bg-[#057a7a] disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm shadow-lg shadow-[#069494]/20"
        >
          {loading ? 'Yüklənir...' : 'Daxil ol'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Hesabınız yoxdur?{' '}
        <button onClick={onSwitch} className="text-[#0dc9c9] hover:text-[#069494] transition-colors">
          Qeydiyyat
        </button>
      </p>
    </GlassCard>
  );
}
