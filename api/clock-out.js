import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { staffPin } = req.body;
  if (!staffPin || staffPin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });

  // Find employee by PIN
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role')
    .eq('pin', staffPin)
    .single();

  if (empErr || !employee) return res.status(401).json({ error: 'PIN not recognised. Try again.' });

  // Find today's record
  const today = new Date().toISOString().slice(0, 10);
  const { data: record } = await supabase
    .from('attendance')
    .select('id, clock_in, clock_out')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .single();

  if (!record?.clock_in) {
    return res.status(400).json({ error: `${employee.name} hasn't clocked in yet today.` });
  }
  if (record?.clock_out) {
    return res.status(409).json({ error: `${employee.name} already clocked out today.` });
  }

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
    name: employee.name
  });
}
