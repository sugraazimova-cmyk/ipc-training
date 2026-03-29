import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlassCard, PhotoBackground } from './ui/gaming-login';

export default function UpdatePassword({ onPasswordUpdated }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvoldan ibarət olmalıdır.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        onPasswordUpdated();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhotoBackground>
      <GlassCard className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 text-center px-2">
          <div className="text-xl font-bold text-white mb-2 leading-snug">Yeni şifrə təyini</div>
          <div className="text-white/80 text-sm font-medium">Hesabınız üçün yeni şifrə təyin edin.</div>
        </div>

        {success ? (
          <div className="text-center bg-green-500/10 p-6 rounded-xl border border-green-500/20">
            <p className="text-green-400 font-bold mb-2">Şifrəniz uğurla yeniləndi!</p>
            <p className="text-green-400/80 text-sm font-medium">Sistemə daxil lunduz... Yönləndirilirsiniz.</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* Password */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <Lock size={17} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Yeni Şifrə"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#069494] transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm font-medium px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#069494] hover:bg-[#057a7a] disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-[#069494]/30"
            >
              {loading ? 'Yenilənir...' : 'Şifrəni Təsdiqlə'}
            </button>
          </form>
        )}
      </GlassCard>
    </PhotoBackground>
  );
}
