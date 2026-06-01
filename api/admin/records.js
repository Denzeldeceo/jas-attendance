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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date().toISOString().slice(0, 10);

  // ── Today's attendance ────────────────────────────────────────────────────
  const { data: todayRows } = await supabase
    .from('attendance')
    .select('employee_id, date, clock_in, clock_out, device_id, status, employees(name, role)')
    .eq('date', today)
    .order('clock_in', { ascending: true });

  const todayData = (todayRows || []).map(r => ({
    name:     r.employees?.name,
    role:     r.employees?.role,
    clockIn:  r.clock_in,
    clockOut: r.clock_out || '—',
    deviceId: r.device_id,
    status:   r.status,
  }));

  // ── 30-day history grouped by date ───────────────────────────────────────
  const { data: historyRows } = await supabase
    .from('attendance')
    .select('employee_id, date, clock_in, clock_out, status, employees(name, role)')
    .neq('date', today)
    .order('date', { ascending: false })
    .limit(200);

  const grouped = {};
  for (const r of (historyRows || [])) {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push({
      name:     r.employees?.name,
      role:     r.employees?.role,
      clockIn:  r.clock_in,
      clockOut: r.clock_out || '—',
      status:   r.status,
    });
  }
  const history = Object.entries(grouped).map(([date, records]) => ({ date, records }));

  // ── Today's device locks ──────────────────────────────────────────────────
  const { data: lockRows } = await supabase
    .from('device_locks')
    .select('device_id, employee_name, locked_at')
    .eq('date', today)
    .order('locked_at', { ascending: true });

  const deviceLocks = (lockRows || []).map(l => ({
    deviceId:     l.device_id,
    employeeName: l.employee_name,
    lockedAt:     l.locked_at || '—',
  }));

  // ── All employees ─────────────────────────────────────────────────────────
  const { data: employeeRows } = await supabase
    .from('employees')
    .select('id, name, role')
    .order('name', { ascending: true });

  return res.status(200).json({
    today:       todayData,
    history,
    deviceLocks,
    employees:   employeeRows || [],
  });
}
