import supabase from '../lib/supabase.js';

const CUTOFF_HOUR   = 9;
const CUTOFF_MINUTE = 45;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { staffPin, deviceId } = req.body;

  if (!staffPin || staffPin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });
  if (!deviceId) return res.status(400).json({ error: 'Device ID missing. Please refresh and try again.' });

  // ── Block: outside working hours (9:00 AM – 8:00 PM) ─────────────────────
  const nowHour = new Date().getHours();
  if (nowHour < 9 || nowHour >= 20) {
    return res.status(403).json({ error: 'Clock-in is only allowed between 9:00 AM and 8:00 PM.' });
  }

  // ── Find employee by PIN ───────────────────────────────────────────────────
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role')
    .eq('pin', staffPin)
    .single();

  if (empErr || !employee) return res.status(401).json({ error: 'PIN not recognised. Try again.' });

  const today = new Date().toISOString().slice(0, 10);

  // ── Block: employee already clocked in today ───────────────────────────────
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, clock_in')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .single();

  if (existing?.clock_in) {
    return res.status(409).json({ error: `${employee.name} already clocked in today.` });
  }

  // ── Block: device already locked to a DIFFERENT employee today ────────────
  const { data: deviceLock } = await supabase
    .from('device_locks')
    .select('employee_id, employee_name')
    .eq('
