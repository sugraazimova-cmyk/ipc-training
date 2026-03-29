import React from 'react';
import { supabase } from '../lib/supabase';
import { PhotoBackground, GlassCard } from './ui/gaming-login';

export default function PendingApproval({ user, userStatus }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isRejected = userStatus === 'rejected';

  return (
    <PhotoBackground>
      <GlassCard className="w-full max-w-md mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            isRejected
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            <span className="text-4xl">{isRejected ? '❌' : '⏳'}</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          {isRejected ? 'Müraciətiniz rədd edildi' : 'Müraciətiniz göndərildi'}
        </h2>

        <p className="text-white/70 text-sm leading-relaxed mb-2">
          {isRejected
            ? 'Təəssüf ki, hesabınız admin tərəfindən rədd edildi.'
            : 'Qeydiyyatınız uğurla tamamlandı. Hesabınız hazırda admin tərəfindən yoxlanılır.'
          }
        </p>

        {!isRejected && (
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Təsdiq edildikdən sonra{' '}
            <span className="text-emerald-400 font-medium">{user.email}</span>{' '}
            ünvanına e-poçt bildirişi göndəriləcək.
          </p>
        )}

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${
          isRejected
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-yellow-500/10 border border-yellow-500/30'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isRejected ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className={`text-sm font-medium ${isRejected ? 'text-red-400' : 'text-yellow-400'}`}>
            {isRejected ? 'Rədd edilib' : 'Gözləmədə'}
          </span>
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
