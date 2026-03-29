import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { PhotoBackground } from './components/ui/gaming-login';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import PendingApproval from './components/PendingApproval';
import AdminPanel from './components/AdminPanel';

function AppRoutes() {
  const [session, setSession]       = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading]       = useState(true);
  const navigate                    = useNavigate();

  const isAdmin = session?.user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserStatus(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserStatus(session.user.id);
      else { setUserStatus(null); setLoading(false); }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Redirect after status is known
  useEffect(() => {
    if (loading || !session) return;
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
    if (userStatus === 'approved') navigate('/dashboard', { replace: true });
    else navigate('/pending', { replace: true });
  }, [session, userStatus, loading, isAdmin]);

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
      <Route path="/login"  element={
        !session
          ? <PhotoBackground><LoginForm onSwitch={() => navigate('/signup')} /></PhotoBackground>
          : <Navigate to={isAdmin ? '/admin' : userStatus === 'approved' ? '/dashboard' : '/pending'} replace />
      } />
      <Route path="/signup" element={
        !session
          ? <PhotoBackground><SignupForm onSwitch={() => navigate('/login')} /></PhotoBackground>
          : <Navigate to={isAdmin ? '/admin' : userStatus === 'approved' ? '/dashboard' : '/pending'} replace />
      } />

      {/* Protected */}
      <Route path="/dashboard" element={
        !session ? <Navigate to="/login" replace />
          : userStatus !== 'approved' && !isAdmin ? <Navigate to="/pending" replace />
          : <Dashboard user={session.user} isAdmin={isAdmin} />
      } />
      <Route path="/admin" element={
        !session ? <Navigate to="/login" replace />
          : !isAdmin ? <Navigate to="/dashboard" replace />
          : <AdminPanel user={session.user} />
      } />
      <Route path="/pending" element={
        !session ? <Navigate to="/login" replace />
          : userStatus === 'approved' ? <Navigate to="/dashboard" replace />
          : <PendingApproval user={session.user} userStatus={userStatus} />
      } />

      {/* Default */}
      <Route path="*" element={
        <Navigate to={!session ? '/login' : isAdmin ? '/admin' : userStatus === 'approved' ? '/dashboard' : '/pending'} replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
