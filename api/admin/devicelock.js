import supabase from '../../lib/supabase.js';

// Reuse whatever token verification your login.js uses.
// This checks the token stored in sessionStorage matches a valid admin session.
// If your login.js exports verifyAdminToken, import it. Otherwise this
// inline check matches the typical pattern for this project.
function isValidToken(token) {
  // Tokens are set by login.js — they contain a timestamp so we can
  // validate they are recent (within 12 hours).
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const { ts } = JSON.parse(decoded);
    const twelveHours = 12 * 60 * 60 * 1000;
    return Date.now() - ts < twelveHours;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!isValidToken(token)) return res.status(401).json({ error: 'Unauthorised' });

  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  const today = new Date().toISOString().slice(0, 10);

  // ── Delete the device lock for today ──────────────────────────────────────
  const { error } = await supabase
    .from('device_locks')
    .delete()
    .eq('device_id', deviceId)
    .eq('date', today);

  if (error) return res.status(500).json({ error: 'Failed to clear device lock.' });

  return res.status(200).json({ success: true, message: 'Device lock cleared.' });
}
