import React from 'react';
import { supabase } from '../lib/supabase';
import { PhotoBackground, GlassCard } from './ui/gaming-login';

export default function PendingApproval({ user }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <PhotoBackground>
      <GlassCard className="w-full max-w-md mx-auto text-center">
        {/* Animated clock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <span className="text-4xl">⏳</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Müraciətiniz göndərildi
        </h2>

        <p className="text-white/70 text-sm leading-relaxed mb-2">
          Qeydiyyatınız uğurla tamamlandı. Hesabınız hazırda admin tərəfindən yoxlanılır.
        </p>

        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Təsdiq edildikdən sonra{' '}
          <span className="text-purple-400 font-medium">{user.email}</span>{' '}
          ünvanına e-poçt bildirişi göndəriləcək.
        </p>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-8">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm font-medium">Gözləmədə</span>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-white/40 text-xs mb-4">
            Sualınız varsa, admin ilə əlaqə saxlayın.
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Çıxış
          </button>
        </div>
      </GlassCard>
    </PhotoBackground>
  );
}
