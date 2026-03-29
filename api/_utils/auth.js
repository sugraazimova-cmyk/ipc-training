import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verifies JWT and returns the user profile from the users table
export async function verifyAuth(req, res) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'User profile not found' });
    return null;
  }

  if (profile.status !== 'approved') {
    res.status(403).json({ error: 'Account not approved' });
    return null;
  }

  return profile;
}

// Verifies JWT and checks the user is an admin
export async function verifyAdmin(req, res) {
  const user = await verifyAuth(req, res);

  if (!user) return null; // verifyAuth already sent the error response

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return user;
}
