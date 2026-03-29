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
import ModulePage from './components/ModulePage';

export default function App() {
  const [session, setSession]                     = useState(null);
  const [userStatus, setUserStatus]               = useState(null);
  const [userRole, setUserRole]                   = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';

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
      else { setUserStatus(null); setUserRole(null); setLoading(false); }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchUserStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users').select('status, role').eq('id', userId).single();
      if (error) throw error;
      setUserStatus(data.status);
      setUserRole(data.role ?? 'user');
    } catch {
      setUserStatus('pending');
      setUserRole('user');
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
      <Route path="/module/:moduleId" element={
        !session                                  ? <Navigate to="/login" replace />
          : requiresPasswordReset                 ? <Navigate to="/update-password" replace />
          : !isAdmin && userStatus !== 'approved' ? <Navigate to="/pending" replace />
          : <ModulePage user={session.user} />
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
