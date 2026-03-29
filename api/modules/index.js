import { createClient } from '@supabase/supabase-js';
import { verifyAuth, verifyAdmin } from '../_utils/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // GET all modules
  if (req.method === 'GET') {
    const user = await verifyAuth(req, res);
    if (!user) return;

    try {
      const { data: modules, error } = await supabase
        .from('modules')
        .select('*')
        .eq('hospital_id', user.hospital_id)
        .eq('is_published', true);

      if (error) throw error;
      return res.json(modules);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // CREATE module (admin only)
  if (req.method === 'POST') {
    const admin = await verifyAdmin(req, res);
    if (!admin) return;

    const { title, description, hospital_id } = req.body;

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert([{
          title,
          description,
          hospital_id,
          pass_threshold: 80,
          max_attempts: 3,
          certificate_validity_days: 365
        }])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
