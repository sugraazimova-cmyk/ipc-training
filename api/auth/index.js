import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { action, email, password, name, role, hospital_id } = req.body;

  // SIGNUP
  if (action === 'signup') {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false
      });

      if (authError) throw authError;

      // Create user profile with status = pending
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id,
          email,
          name,
          role,
          hospital_id,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      return res.status(201).json({
        success: true,
        message: 'Signup successful. Awaiting admin approval.',
        user_id: authUser.user.id
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // LOGIN
  if (action === 'login') {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Check if user is approved
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      if (user.status !== 'approved') {
        return res.status(403).json({
          error: 'User not approved. Please contact administrator.'
        });
      }

      return res.json({
        success: true,
        token: data.session.access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hospital_id: user.hospital_id,
          status: user.status
        }
      });
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }

  res.status(400).json({ error: 'Invalid action' });
}
