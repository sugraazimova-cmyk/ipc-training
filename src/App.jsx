import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { PhotoBackground } from './components/ui/gaming-login';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import PendingApproval from './components/PendingApproval';
import AdminPanel from './components/AdminPanel';
import UpdatePassword from './components/UpdatePassword';

export default function App() {
  const [session, setSession]                     = useState(null);
  const [userStatus, setUserStatus]               = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const navigate                                  = useNavigate();

  const isAdmin = session?.user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserStatus(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRequiresPasswordReset(true);
      setSession(session);
      if (session) fetchUserStatus(session.user.id);
      else { setUserStatus(null); setLoading(false); }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Navigate once we know auth state
  useEffect(() => {
    if (loading) return;
    const path = window.location.pathname;
    const publicPaths = ['/login', '/signup', '/update-password'];
    if (publicPaths.includes(path)) return; // let routes handle public pages

    if (!session) { navigate('/login', { replace: true }); return; }
    if (requiresPasswordReset) { navigate('/update-password', { replace: true }); return; }
    if (isAdmin && path === '/') { navigate('/admin', { replace: true }); return; }
    if (!isAdmin && userStatus === 'approved' && path === '/') { navigate('/dashboard', { replace: true }); return; }
    if (!isAdmin && userStatus !== 'approved' && path === '/') { navigate('/pending', { replace: true }); return; }
  }, [session, userStatus, loading, isAdmin, requiresPasswordReset]);

  const fetchUserStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users').select('status').eq('id', userId).single();
      if (error) throw error;
      setUserStatus(data.status);
    } catch {
      setUserStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <PhotoBackground>
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/60 text-sm">Yüklənir...</p>
      </div>
    </PhotoBackground>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        session
          ? <Navigate to={isAdmin ? '/admin' : userStatus === 'approved' ? '/dashboard' : '/pending'} replace />
          : <PhotoBackground><LoginForm onSwitch={() => navigate('/signup')} /></PhotoBackground>
      } />
      <Route path="/signup" element={
        session
          ? <Navigate to={isAdmin ? '/admin' : userStatus === 'approved' ? '/dashboard' : '/pending'} replace />
          : <PhotoBackground><SignupForm onSwitch={() => navigate('/login')} /></PhotoBackground>
      } />
      <Route path="/update-password" element={
        <UpdatePassword onPasswordUpdated={() => { setRequiresPasswordReset(false); navigate('/dashboard'); }} />
      } />

      {/* Protected */}
      <Route path="/dashboard" element={
        !session                                    ? <Navigate to="/login" replace />
          : requiresPasswordReset                   ? <Navigate to="/update-password" replace />
          : !isAdmin && userStatus !== 'approved'   ? <Navigate to="/pending" replace />
          : <Dashboard user={session.user} isAdmin={isAdmin} />
      } />
      <Route path="/admin" element={
        !session   ? <Navigate to="/login" replace />
          : !isAdmin ? <Navigate to="/dashboard" replace />
          : <AdminPanel user={session.user} />
      } />
      <Route path="/pending" element={
        !session                  ? <Navigate to="/login" replace />
          : userStatus === 'approved' ? <Navigate to="/dashboard" replace />
          : <PendingApproval user={session.user} userStatus={userStatus} />
      } />

      {/* Catch-all */}
      <Route path="*" element={
        <Navigate to={
          !session ? '/login'
            : requiresPasswordReset ? '/update-password'
            : isAdmin ? '/admin'
            : userStatus === 'approved' ? '/dashboard'
            : '/pending'
        } replace />
      } />
    </Routes>
  );
}
