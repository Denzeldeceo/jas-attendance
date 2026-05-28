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

  // All employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, role')
    .order('name');

  // Today's records
  const { data: todayRecords } = await supabase
    .from('attendance')
    .select('employee_id, clock_in, clock_out, status')
    .eq('date', today);

  const todayMap = {};
  (todayRecords || []).forEach(r => { todayMap[r.employee_id] = r; });

  const todayResult = (employees || []).map(e => {
    const r = todayMap[e.id];
    return {
      name:     e.name,
      role:     e.role,
      clockIn:  r?.clock_in  || null,
      clockOut: r?.clock_out || null,
      status:   r?.status    || 'absent',
    };
  });

  // 30-day history
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: histRecords } = await supabase
    .from('attendance')
    .select('employee_id, date, clock_in, clock_out, status, employees(name)')
    .gte('date', sinceStr)
    .lt('date', today)
    .order('date', { ascending: false });

  // Group by date
  const byDate = {};
  (histRecords || []).forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push({
      name:     r.employees?.name || '—',
      clockIn:  r.clock_in  || '—',
      clockOut: r.clock_out || '—',
      status:   r.status,
    });
  });

  const history = Object.entries(byDate).map(([date, records]) => ({
    date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    records,
  }));

  return res.status(200).json({ today: todayResult, history });
}
