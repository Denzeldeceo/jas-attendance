import supabase from '../lib/supabase.js';

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

  // ── Smart date: midnight–2 AM still counts as previous workday ───────────
  const now     = new Date();
  const dateObj = new Date(now);
  if (now.getHours() < 2) dateObj.setDate(dateObj.getDate() - 1);
  const today = dateObj.toISOString().slice(0, 10);

  // ── Find today's attendance record ────────────────────────────────────────
  const { data: record } = await supabase
    .from('attendance')
    .select('id, clock_in, clock_out')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .single();

  if (!record?.clock_in) {
    return res.status(400).json({ error: `${employee.name} hasn't clocked in yet today. Please use Clock In first.` });
  }
  if (record.clock_out) {
    return res.status(409).json({ error: `${employee.name} already clocked out today.` });
  }

  // ── Write clock-out time — allowed anytime up to 11 PM ────────────────────
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
