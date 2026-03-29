import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlassCard, PhotoBackground } from './ui/gaming-login';

function PasswordStrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Çox zəif', 'Zəif', 'Orta', 'Güclü', 'Çox güclü'];
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];

  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 2 ? 'text-red-400' : score <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
        {labels[score]}
      </p>
      <ul className="text-xs text-white/40 space-y-0.5">
        {!checks[0] && <li>• Ən az 8 simvol</li>}
        {!checks[1] && <li>• Ən az 1 böyük hərf (A-Z)</li>}
        {!checks[2] && <li>• Ən az 1 kiçik hərf (a-z)</li>}
        {!checks[3] && <li>• Ən az 1 rəqəm (0-9)</li>}
        {!checks[4] && <li>• Ən az 1 xüsusi simvol (!@#$ ...)</li>}
      </ul>
    </div>
  );
}

export default function UpdatePassword({ onPasswordUpdated }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPasswordStrong = (pw) =>
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      setError('Şifrə kifayət qədər güclü deyil. Zəhmət olmasa tələblərə uyğun şifrə daxil edin.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir!');
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
            
            <PasswordStrengthBar password={password} />

            {/* Confirm Password */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <Lock size={17} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Şifrəni Təsdiqləyin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#069494] transition-all text-sm font-medium ${
                  confirmPassword && password !== confirmPassword ? 'border-red-500/60' : 'border-white/20'
                }`}
              />
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
