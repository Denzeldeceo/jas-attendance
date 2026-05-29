import supabase from '../lib/supabase.js';

const CUTOFF_HOUR   = 9;
const CUTOFF_MINUTE = 45;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { staffPin, deviceId } = req.body;

  if (!staffPin || staffPin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });
  if (!deviceId) return res.status(400).json({ error: 'Device ID missing. Please refresh and try again.' });

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
    .eq('device_id', deviceId)
    .eq('date', today)
    .maybeSingle();

  if (deviceLock && deviceLock.employee_id !== employee.id) {
    return res.status(409).json({
      error: `This device is already registered to ${deviceLock.employee_name} today. Each device can only be used by one employee per day.`
    });
  }

  // ── Block: employee already used a DIFFERENT device today ─────────────────
  const { data: empLock } = await supabase
    .from('device_locks')
    .select('device_id')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .maybeSingle();

  if (empLock && empLock.device_id !== deviceId) {
    return res.status(409).json({
      error: `${employee.name} already clocked in on a different device today. Contact your admin if you need a device switch.`
    });
  }

  // ── Determine on-time vs late ──────────────────────────────────────────────
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

  // ── Lock this device to this employee for today ───────────────────────────
  await supabase
    .from('device_locks')
    .upsert({
      device_id:     deviceId,
      employee_id:   employee.id,
      employee_name: employee.name,
      date:          today,
      locked_at:     clockIn,
    }, { onConflict: 'device_id,date' });

  const msg = isLate
    ? `⚠️ ${employee.name} clocked in LATE at ${clockIn}`
    : `✅ Welcome, ${employee.name}! Clocked in at ${clockIn}`;

  return res.status(200).json({ success: true, message: msg, name: employee.name, status });
}
