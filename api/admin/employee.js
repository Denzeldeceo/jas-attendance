import jwt from 'jsonwebtoken';
import supabase from '../../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function authCheck(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;
  try { jwt.verify(token, JWT_SECRET); return true; } catch { return false; }
}

export default async function handler(req, res) {
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  // ── DELETE employee ────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Employee ID required.' });
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
    return res.status(200).json({ success: true, message: 'Employee removed.' });
  }

  // ── POST (add) employee ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, role, pin } = req.body;
    if (!name || !role || !pin) return res.status(400).json({ success: false, message: 'All fields required.' });
    if (!/^\d{4}$/.test(pin))  return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits.' });

    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('pin', pin)
      .single();
    if (existing) return res.status(409).json({ success: false, message: 'That PIN is already taken. Choose a different one.' });

    const { error } = await supabase
      .from('employees')
      .insert({ name: name.trim(), role: role.trim(), pin });
    if (error) return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
    return res.status(200).json({ success: true, message: `✅ ${name} added successfully!` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
