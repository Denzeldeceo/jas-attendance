import supabase from '../lib/supabase.js';

const CUTOFF_HOUR   = 9;
const CUTOFF_MINUTE = 45;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { staffPin, deviceId } = req.body;

  if (!staffPin || staffPin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });
  if (!deviceId) return res.status(400).json({ error: 'Device ID missing. Please refresh and try again.' });

  // ── Block: outside working hours (8:00 AM – 12:00 AM midnight) ───────────
  const nowHour = new Date().getHours();
  if (nowHour < 8) {
    return res.status(403).json({ error: 'Clock-in is not available before 8:00 AM.' });
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

  // ── Determine on-time vs late (no blocking — just marking) ────────────────
  const now    = new Date();
  const isLate = now.getHours() > CUTOFF_HOUR ||
                 (now.getHours() === CUTOFF_HOUR && now.getMinutes() > CUTOFF_MINUTE);
  const status  = isLate ? 'late' : 'present';
  const clockIn = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Write attendance record ────────────────────────────────────────────────
  const { error: upsertErr } = await supabase
    .from('attendance')
    .upsert({
      employee_id: employee.id,
      date:        today,
      clock_in:    clockIn,
      device_id:   deviceId,
      status,
    }, { onConflict: 'employee_id,date' });

  if (upsertErr) return res.status(500).json({ error: 'Database error. Please try again.' });

  const msg = isLate
    ? `⚠️ ${employee.name} clocked in LATE at ${clockIn}`
    : `✅ Welcome, ${employee.name}! Clocked in at ${clockIn}`;

  return res.status(200).json({ success: true, message: msg, name: employee.name, status });
}
