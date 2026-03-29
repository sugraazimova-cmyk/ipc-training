import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { PhotoBackground } from './components/ui/gaming-login';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import PendingApproval from './components/PendingApproval';
import UpdatePassword from './components/UpdatePassword';

export default function App() {
  const [session, setSession] = useState(null);
  const [userStatus, setUserStatus] = useState(null); // 'pending' | 'approved' | null
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setRequiresPasswordReset(true);
        }
        
        setSession(session);
        if (session) {
          fetchUserStatus(session.user.id);
        } else {
          setUserStatus(null);
          setLoading(false);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserStatus(data.status);
    } catch {
      setUserStatus('pending'); // default to pending if profile not found yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PhotoBackground>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/60 text-sm">Yüklənir...</p>
        </div>
      </PhotoBackground>
    );
  }

  if (!session) {
    return (
      <PhotoBackground>
        {showSignup
          ? <SignupForm onSwitch={() => setShowSignup(false)} />
          : <LoginForm onSwitch={() => setShowSignup(true)} />
        }
      </PhotoBackground>
    );
  }

  if (requiresPasswordReset) {
    return <UpdatePassword onPasswordUpdated={() => setRequiresPasswordReset(false)} />;
  }

  const isAdmin = session.user.email === import.meta.env.VITE_ADMIN_EMAIL;

  if (userStatus !== 'approved' && !isAdmin) {
    return <PendingApproval user={session.user} userStatus={userStatus} />;
  }

  return <Dashboard user={session.user} isAdmin={isAdmin} />;
}
