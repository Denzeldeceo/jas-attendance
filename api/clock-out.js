import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { staffPin, deviceId } = req.body;

  if (!staffPin || staffPin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });
  if (!deviceId) return res.status(400).json({ error: 'Device ID missing. Please refresh and try again.' });

  // ── Block: outside working hours (9:00 AM – 8:00 PM) ─────────────────────
  const nowHour = new Date().getHours();
  if (nowHour < 9 || nowHour >= 20) {
    return res.status(403).json({ error: 'Clock-out is only allowed between 9:00 AM and 8:00 PM.' });
  }

  // ── Find employee by PIN ───────────────────────────────────────────────────
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role')
    .eq('pin', staffPin)
    .single();

  if (empErr || !employee) return res.status(401).json({ error: 'PIN not recognised. Try again.' });

  const today = new Date().toISOString().slice(0, 10);

  // ── Find today's attendance record ────────────────────────────────────────
  const { data: record } = await supabase
    .from('attendance')
    .select('id, clock_in, clock_out, device_id')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .single();

  if (!record?.clock_in) {
    return res.status(400).json({ error: `${employee.name} hasn't clocked in yet today.` });
  }
  if (record.clock_out) {
    return res.status(409).json({ error: `${employee.name} already clocked out today.` });
  }

  // ── Block: must clock out on the same device used to clock in ─────────────
  if (record.device_id && record.device_id !== deviceId) {
    return res.status(409).json({
      error: `You must clock out on the same device you clocked in with today. Contact your admin if you need help.`
    });
  }

  // ── Write clock-out time ───────────────────────────────────────────────────
  const now      = new Date();
  const clockOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const { error: updateErr } = await supabase
    .from('attendance')
    .update({ clock_out: clockOut })
    .eq('id', record.id);

  if (updateErr) return res.status(500).json({ error: 'Database error. Please try again.' });

  return res.status(200).json({
    success: true,
    message: `👋 Goodbye, ${employee.name}! Clocked out at ${clockOut}`,
    name: employee.name,
  });
}
